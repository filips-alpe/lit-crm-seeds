import { randomUUID } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import type { ClientBase } from 'pg';
import type { SeedUser } from './load';
import type { SeedProjectMeta, SeedRecordFlat, SeedType } from './types-defs';

export type SeedData = {
  users: SeedUser[];
  types: SeedType[];
  projects: SeedProjectMeta[];
  records: SeedRecordFlat[];
};

export type SeedCounts = {
  users: number;
  types: number;
  projects: number;
  records: number;
  links: number;
};

// Postgres allows 65535 bind parameters per statement; each batch stays under it.
const MAX_PARAMS = 60_000;

const DEFAULT_COLOR = '#000000';

// Children before parents, so foreign keys never block the wipe.
const WIPE_ORDER = ['lit_project_record', 'lit_record', 'lit_project', 'lit_type', 'lit_user'];

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
 * project-link tables with `data`, in one transaction. DESTRUCTIVE: every
 * existing row in those tables is deleted first.
 *
 * Ids are generated here because lit-crm's Prisma schema generates them in the
 * client (cuid2 for users, types and projects; UUIDs for records), not in the
 * database. `updatedAt` is likewise set explicitly.
 */
export async function seed(client: ClientBase, data: SeedData): Promise<SeedCounts> {
  const { users, types, projects, records } = data;
  const now = new Date().toISOString();

  await client.query('BEGIN');
  try {
    for (const table of WIPE_ORDER) await client.query(`DELETE FROM "${table}"`);

    // lit_user.isAdmin exists only in lit-crm versions that carry the RLS gateway
    // migration. Write it when the column is there, so the seeds work against both.
    const adminCol = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'lit_user' AND column_name = 'isAdmin'`,
    );
    const hasAdmin = (adminCol.rowCount ?? adminCol.rows?.length ?? 0) > 0;

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
      ];
    });

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
      ],
      recordRows,
    );
    await insertRows(client, 'lit_project_record', ['projectId', 'recordId'], links);

    await client.query('COMMIT');
    return {
      users: users.length,
      types: types.length,
      projects: projects.length,
      records: records.length,
      links: links.length,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}
