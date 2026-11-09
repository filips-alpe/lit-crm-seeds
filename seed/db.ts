import { randomUUID } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import type { ClientBase } from 'pg';
import type { SeedUser } from './load';
import {
  amountsByIndex,
  hiddenIndexes,
  recordIndex,
  validateGrants,
  type SeedAmounts,
  type SeedGrant,
  type SeedGroup,
  type SeedHidden,
} from './grants';
import type { SeedProjectMeta, SeedRecordFlat, SeedType } from './types-defs';
import { jeffersonRows, firstEnteredByType as jeffersonFirstEntered } from './jefferson';
import type { JeffersonDataset } from './sources/jefferson/dataset';

export type SeedData = {
  users: SeedUser[];
  types: SeedType[];
  projects: SeedProjectMeta[];
  records: SeedRecordFlat[];
  /** Written only when lit-crm has the grant tables (see `seed`). */
  groups?: SeedGroup[];
  grants?: SeedGrant[];
  /** Written only when lit_record has the `hidden` column. */
  hidden?: SeedHidden[];
  amounts?: SeedAmounts[];
  /**
   * Jefferson documents and entities, loaded after the Franklin records, and the
   * mentions linking them. Mentions are written only when lit-crm has
   * lit_record_mention; the Jefferson records are loaded either way.
   */
  jefferson?: JeffersonDataset;
};

export type SeedCounts = {
  users: number;
  types: number;
  projects: number;
  records: number;
  links: number;
  /** 0 when lit-crm has no grant tables / hidden column. */
  groups: number;
  memberships: number;
  grants: number;
  hidden: number;
  amounts: number;
  /** Jefferson records (documents and entities), included in `records`. */
  jeffersonRecords: number;
  /** 0 when lit-crm has no lit_record_mention table. */
  mentions: number;
};

// Postgres allows 65535 bind parameters per statement; each batch stays under it.
const MAX_PARAMS = 60_000;

const DEFAULT_COLOR = '#000000';

// Children before parents, so foreign keys never block the wipe.
const WIPE_ORDER = ['lit_project_record', 'lit_record', 'lit_project', 'lit_type', 'lit_user'];
// Present only in lit-crm versions with grants; grants, then members, then groups.
// Present only in lit-crm versions with record mentions; before the records they point at.
const MENTION_TABLE = 'lit_record_mention';
const GRANT_WIPE_ORDER = ['lit_grant', 'lit_group_member', 'lit_group'];

/** Multi-row parameterised INSERT, split into batches under the parameter limit. */
async function insertRows(
  client: ClientBase,
  table: string,
  columns: string[],
  rows: unknown[][],
): Promise<void> {
  const perBatch = Math.floor(MAX_PARAMS / columns.length);
  const cols = columns.map((c) => `"${c}"`).join(', ');
  for (let i = 0; i < rows.length; i += perBatch) {
    const chunk = rows.slice(i, i + perBatch);
    const values = chunk
      .map((_, r) => `(${columns.map((_, c) => `$${r * columns.length + c + 1}`).join(', ')})`)
      .join(', ');
    await client.query(`INSERT INTO "${table}" (${cols}) VALUES ${values}`, chunk.flat());
  }
}

const iso = (s: string | undefined) => (s ? new Date(s).toISOString() : null);

/**
 * Replace the contents of lit-crm's user, type, project, record and
 * project-link tables (and group, membership and grant tables, when they exist)
 * with `data`, in one transaction. DESTRUCTIVE: every
 * existing row in those tables is deleted first.
 *
 * Ids are generated here because lit-crm's Prisma schema generates them in the
 * client (cuid2 for users, types and projects; UUIDs for records), not in the
 * database. `updatedAt` is likewise set explicitly.
 */
export async function seed(client: ClientBase, data: SeedData): Promise<SeedCounts> {
  const { users, types, projects, records, jefferson } = data;
  const now = new Date().toISOString();

  await client.query('BEGIN');
  try {
    const rowCount = (r: { rowCount?: number | null; rows?: unknown[] }) =>
      r.rowCount ?? r.rows?.length ?? 0;

    // Older lit-crm versions lack the grant tables and lit_record.hidden. Look them up
    // in information_schema and skip what is absent, so the seeds load into both.
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name IN ('lit_group', 'lit_group_member', 'lit_grant')`,
    );
    const hasGrants = rowCount(tables) === 3;
    const hiddenCol = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'lit_record' AND column_name = 'hidden'`,
    );
    const hasHidden = rowCount(hiddenCol) > 0;

    const mentionTable = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = '${MENTION_TABLE}'`,
    );
    const hasMentions = rowCount(mentionTable) > 0;

    const wipe = [
      ...(hasGrants ? GRANT_WIPE_ORDER : []),
      ...(hasMentions ? [MENTION_TABLE] : []),
      ...WIPE_ORDER,
    ];
    for (const table of wipe) await client.query(`DELETE FROM "${table}"`);

    // lit_user.isAdmin exists only in lit-crm versions that carry the RLS gateway
    // migration. Write it when the column is there, so the seeds work against both.
    const adminCol = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'lit_user' AND column_name = 'isAdmin'`,
    );
    const hasAdmin = rowCount(adminCol) > 0;

    const userId = new Map(users.map((u) => [u.username, createId()]));
    await insertRows(
      client,
      'lit_user',
      [
        'id',
        'updatedAt',
        'username',
        'name',
        'bio',
        'color',
        'avatarSeed',
        ...(hasAdmin ? ['isAdmin'] : []),
      ],
      users.map((u) => [
        userId.get(u.username),
        now,
        u.username,
        u.name,
        u.bio ?? null,
        u.color ?? DEFAULT_COLOR,
        u.avatarSeed ?? null,
        ...(hasAdmin ? [u.isAdmin ?? false] : []),
      ]),
    );
    const owner = userId.get('bfranklin');
    if (!owner) throw new Error('Missing user bfranklin (creator of all projects)');

    // A type is "created" the day its first record of that kind is entered.
    const firstEntered = new Map<string, Date>();
    for (const r of records) {
      if (!r.entered) continue;
      const d = new Date(r.entered);
      const cur = firstEntered.get(r.type);
      if (!cur || d < cur) firstEntered.set(r.type, d);
    }
    for (const [code, d] of jefferson ? jeffersonFirstEntered(jefferson) : []) {
      const cur = firstEntered.get(code);
      if (!cur || d < cur) firstEntered.set(code, d);
    }

    const typeId = new Map(types.map((t) => [t.code, createId()]));
    await insertRows(
      client,
      'lit_type',
      [
        'id',
        'createdAt',
        'updatedAt',
        'code',
        'description',
        'layout',
        'color',
        'iconSeed',
        'rendererId',
      ],
      types.map((t) => [
        typeId.get(t.code),
        (firstEntered.get(t.code) ?? new Date(now)).toISOString(),
        now,
        t.code,
        t.description ?? null,
        t.layout ? JSON.stringify(t.layout) : null,
        t.color ?? DEFAULT_COLOR,
        t.iconSeed ?? null,
        t.rendererId ?? null,
      ]),
    );

    const projectId = new Map(projects.map((p) => [p.code, createId()]));
    await insertRows(
      client,
      'lit_project',
      ['id', 'updatedAt', 'status', 'code', 'description', 'color', 'creatorId', 'assigneeId'],
      projects.map((p) => {
        const assignee = p.assignee ? userId.get(p.assignee) : owner;
        if (!assignee) throw new Error(`Unknown assignee: ${p.assignee}`);
        return [
          projectId.get(p.code),
          now,
          p.status ?? 'ACTIVE',
          p.code,
          p.description ?? null,
          p.color ?? DEFAULT_COLOR,
          owner,
          assignee,
        ];
      }),
    );

    const hiddenIdx = hasHidden ? hiddenIndexes(records, data.hidden ?? []) : new Set<number>();
    const sumByIdx = amountsByIndex(records, data.amounts ?? []);
    const recordIds: string[] = [];

    const links: unknown[][] = [];
    const recordRows = records.map((r, i) => {
      const tid = typeId.get(r.type);
      if (!tid) throw new Error(`Unknown type: ${r.type}`);
      const creator = r.user ? userId.get(r.user) : null;
      if (r.user && !creator) throw new Error(`Unknown user: ${r.user}`);
      const assignee = r.assignee ? userId.get(r.assignee) : null;
      if (r.assignee && !assignee) throw new Error(`Unknown assignee: ${r.assignee}`);
      if (!r.entered) throw new Error(`Record has no entered date: ${r.title ?? r.type}`);
      // createdAt is the day the entry was logged. Records are listed
      // chronologically, so nudge each one a millisecond past its predecessor
      // to keep a strict order even when entries share a day.
      const createdAt = new Date(new Date(r.entered).getTime() + i).toISOString();
      const id = randomUUID();
      recordIds.push(id);
      for (const code of r.projects) {
        const pid = projectId.get(code);
        if (!pid) throw new Error(`Unknown project: ${code}`);
        links.push([pid, id]);
      }
      return [
        id,
        createdAt,
        now,
        r.title ?? null,
        r.description ?? null,
        r.text ?? null,
        r.note ?? null,
        r.references,
        // `date` carries the date as recorded (Old Style before the 1752 reform);
        // the timeline runs on createdAt.
        iso(r.date),
        iso(r.start),
        iso(r.end),
        r.allDay ?? null,
        r.from ?? null,
        r.to ?? null,
        r.fromGeo ?? null,
        r.toGeo ?? null,
        tid,
        creator,
        assignee,
        ...(hasHidden ? [hiddenIdx.has(i)] : []),
        ...(sumByIdx.size ? [sumByIdx.get(i) ?? null, sumByIdx.get(i) ?? null] : []),
      ];
    });

    // The Jefferson dataset: documents and entities are ordinary records with no
    // creator, assignee or project, loaded after the Franklin ones.
    const j = jefferson
      ? jeffersonRows(jefferson, typeId, randomUUID)
      : { records: [], mentions: [] };
    const jRows = j.records.map((r) => [
      r.id,
      r.createdAt.toISOString(),
      now,
      r.title,
      r.description ?? null,
      r.text ?? null,
      r.note ?? null,
      r.references,
      r.date ? r.date.toISOString() : null,
      null,
      null,
      null,
      r.from ?? null,
      r.to ?? null,
      null,
      null,
      r.typeId,
      null,
      null,
      ...(hasHidden ? [false] : []),
      ...(sumByIdx.size ? [null, null] : []),
    ]);

    await insertRows(
      client,
      'lit_record',
      [
        'id',
        'createdAt',
        'updatedAt',
        'title',
        'description',
        'text',
        'note',
        'references',
        'date',
        'start',
        'end',
        'allDay',
        'from',
        'to',
        'fromGeo',
        'toGeo',
        'typeId',
        'creatorId',
        'assigneeId',
        ...(hasHidden ? ['hidden'] : []),
        ...(sumByIdx.size ? ['sum', 'total'] : []),
      ],
      [...recordRows, ...jRows],
    );
    await insertRows(client, 'lit_project_record', ['projectId', 'recordId'], links);

    let mentionCount = 0;
    if (hasMentions && j.mentions.length) {
      await insertRows(
        client,
        MENTION_TABLE,
        ['id', 'sourceId', 'entityId', 'start', 'end'],
        j.mentions.map((m) => [createId(), m.sourceId, m.entityId, m.start, m.end]),
      );
      mentionCount = j.mentions.length;
    }

    let groupCount = 0;
    let memberCount = 0;
    let grantCount = 0;
    const groups = data.groups ?? [];
    const grants = data.grants ?? [];
    if (hasGrants && (groups.length || grants.length)) {
      validateGrants(
        groups,
        grants,
        {
          users: new Set(userId.keys()),
          groups: new Set(groups.map((g) => g.name)),
          projects: new Set(projectId.keys()),
          types: new Set(typeId.keys()),
        },
        records,
      );
      const groupId = new Map(groups.map((g) => [g.name, createId()]));
      await insertRows(
        client,
        'lit_group',
        ['id', 'updatedAt', 'name', 'description'],
        groups.map((g) => [groupId.get(g.name), now, g.name, g.description ?? null]),
      );
      const members = groups.flatMap((g) =>
        g.members.map((u) => [groupId.get(g.name), userId.get(u)]),
      );
      await insertRows(client, 'lit_group_member', ['groupId', 'userId'], members);
      await insertRows(
        client,
        'lit_grant',
        [
          'id',
          'updatedAt',
          'userId',
          'groupId',
          'personId',
          'projectId',
          'typeId',
          'recordId',
          'level',
          'hideAmounts',
        ],
        grants.map((g) => [
          createId(),
          now,
          g.user ? userId.get(g.user) : null,
          g.group ? groupId.get(g.group) : null,
          g.person ? userId.get(g.person) : null,
          g.project ? projectId.get(g.project) : null,
          g.type ? typeId.get(g.type) : null,
          g.record ? recordIds[recordIndex(records, g.record)] : null,
          g.level ?? 'READ',
          g.hideAmounts ?? false,
        ]),
      );
      groupCount = groups.length;
      memberCount = members.length;
      grantCount = grants.length;
    }

    await client.query('COMMIT');
    return {
      users: users.length,
      types: types.length,
      projects: projects.length,
      records: records.length + j.records.length,
      links: links.length,
      groups: groupCount,
      memberships: memberCount,
      grants: grantCount,
      hidden: hiddenIdx.size,
      amounts: sumByIdx.size,
      jeffersonRecords: j.records.length,
      mentions: mentionCount,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}
