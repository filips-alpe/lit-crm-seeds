import type { ClientBase } from 'pg';
import { describe, expect, it } from 'vitest';
import { seed, type SeedData } from './db';

type Call = { sql: string; params: unknown[] };

function fakeClient(
  failOn?: RegExp,
  opts: { isAdminColumn?: boolean; grantTables?: boolean; hiddenColumn?: boolean } = {},
) {
  const { isAdminColumn = true, grantTables = false, hiddenColumn = false } = opts;
  const one = { rows: [{ '?column?': 1 }], rowCount: 1 };
  const none = { rows: [], rowCount: 0 };
  const calls: Call[] = [];
  const client = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (failOn?.test(sql)) throw new Error('boom');
      if (sql.includes('information_schema.tables'))
        return grantTables ? { rows: [{}, {}, {}], rowCount: 3 } : none;
      if (sql.includes("'hidden'")) return hiddenColumn ? one : none;
      if (sql.includes('information_schema.columns')) return isAdminColumn ? one : none;
      return { rows: [] };
    },
  } as unknown as ClientBase;
  return { client, calls };
}

const data = (n: number): SeedData => ({
  users: [
    { username: 'bfranklin', name: 'Ben', color: '#111', isAdmin: true },
    { username: 'dfranklin', name: 'Deb', color: '#222' },
  ],
  types: [{ code: 'letter', description: 'L', color: '#333', layout: { fields: [] } }],
  projects: [
    { code: 'P1', description: 'one', color: '#444' },
    { code: 'P2', description: 'two', color: '#555', assignee: 'dfranklin' },
  ],
  records: Array.from({ length: n }, (_, i) => ({
    type: 'letter',
    title: `r${i}`,
    references: [],
    entered: '1706-01-17T00:00:00.000Z',
    projects: i % 2 ? ['P1', 'P2'] : ['P1'],
    user: 'dfranklin',
  })),
});

describe('seed', () => {
  it('writes isAdmin for users, false when unset', async () => {
    const { client, calls } = fakeClient();
    await seed(client, data(1));
    const insert = calls.find((c) => c.sql.startsWith('INSERT INTO "lit_user"'))!;
    expect(insert.sql).toContain('"isAdmin"');
    // params per user: id, updatedAt, username, name, bio, color, avatarSeed, isAdmin
    expect(insert.params![7]).toBe(true);
    expect(insert.params![15]).toBe(false);
  });

  it('omits isAdmin when lit_user has no such column (lit-crm without the RLS migration)', async () => {
    const { client, calls } = fakeClient(undefined, { isAdminColumn: false });
    const counts = await seed(client, data(1));
    const insert = calls.find((c) => c.sql.startsWith('INSERT INTO "lit_user"'))!;
    expect(insert.sql).not.toContain('isAdmin');
    expect(insert.params).toHaveLength(14); // 7 columns x 2 users
    expect(counts.users).toBe(2);
  });

  it('wipes children first, inside one transaction, and reports counts', async () => {
    const { client, calls } = fakeClient();
    const counts = await seed(client, data(5));
    const sqls = calls.map((c) => c.sql);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls.slice(1, 8).filter((s) => s.startsWith('DELETE'))).toEqual([
      'DELETE FROM "lit_project_record"',
      'DELETE FROM "lit_record"',
      'DELETE FROM "lit_project"',
      'DELETE FROM "lit_type"',
      'DELETE FROM "lit_user"',
    ]);
    expect(sqls.at(-1)).toBe('COMMIT');
    expect(counts).toEqual({
      users: 2,
      types: 1,
      projects: 2,
      records: 5,
      links: 7,
      groups: 0,
      memberships: 0,
      grants: 0,
      hidden: 0,
      amounts: 0,
    });
  });

  it('nudges each record createdAt one millisecond past its predecessor', async () => {
    const { client, calls } = fakeClient();
    await seed(client, data(3));
    const insert = calls.find((c) => c.sql.startsWith('INSERT INTO "lit_record"'))!;
    const width = insert.params.length / 3;
    const created = [0, 1, 2].map((i) => insert.params[i * width + 1]);
    expect(created).toEqual([
      '1706-01-17T00:00:00.000Z',
      '1706-01-17T00:00:00.001Z',
      '1706-01-17T00:00:00.002Z',
    ]);
  });

  it('stays under the Postgres bind-parameter limit', async () => {
    const { client, calls } = fakeClient();
    await seed(client, data(8000));
    const inserts = calls.filter((c) => c.sql.startsWith('INSERT INTO "lit_record"'));
    expect(inserts.length).toBeGreaterThan(1);
    for (const c of calls) expect(c.params.length).toBeLessThanOrEqual(65535);
  });

  it('rolls back and rethrows on failure', async () => {
    const { client, calls } = fakeClient(/INSERT INTO "lit_record"/);
    await expect(seed(client, data(2))).rejects.toThrow('boom');
    expect(calls.at(-1)?.sql).toBe('ROLLBACK');
  });

  it('rejects a record naming an unknown project', async () => {
    const { client } = fakeClient();
    const d = data(1);
    d.records[0].projects = ['NOPE'];
    await expect(seed(client, d)).rejects.toThrow('Unknown project: NOPE');
  });
});

describe('seed with grants', () => {
  const withGrants = (n = 4): SeedData => ({
    ...data(n),
    groups: [{ name: 'kin', members: ['dfranklin'] }],
    grants: [
      { group: 'kin', project: 'P1', level: 'READ' },
      { user: 'dfranklin', person: 'bfranklin', level: 'WRITE', hideAmounts: true },
      { user: 'dfranklin', type: 'letter' },
      { user: 'dfranklin', record: { type: 'letter', title: 'r2' }, level: 'WRITE' },
    ],
    hidden: [{ type: 'letter', title: '^r[01]$' }],
    amounts: [{ type: 'letter', every: 2, sums: [10, 20] }],
  });
  const full = { grantTables: true, hiddenColumn: true };

  it('skips groups, grants, hidden and amounts-free inserts against an old schema', async () => {
    const { client, calls } = fakeClient(undefined, { isAdminColumn: false });
    const counts = await seed(client, withGrants());
    const sqls = calls.map((c) => c.sql);
    expect(sqls.some((s) => s.includes('lit_grant') && !s.includes('information_schema'))).toBe(
      false,
    );
    expect(sqls.some((s) => s.includes('lit_group') && !s.includes('information_schema'))).toBe(
      false,
    );
    const rec = calls.find((c) => c.sql.startsWith('INSERT INTO "lit_record"'))!;
    expect(rec.sql).not.toContain('"hidden"');
    expect(counts).toMatchObject({ groups: 0, memberships: 0, grants: 0, hidden: 0, records: 4 });
  });

  it('wipes grants, members, groups first and inserts them after the records', async () => {
    const { client, calls } = fakeClient(undefined, full);
    const counts = await seed(client, withGrants());
    const sqls = calls.map((c) => c.sql);
    const dels = sqls.filter((s) => s.startsWith('DELETE'));
    expect(dels.slice(0, 3)).toEqual([
      'DELETE FROM "lit_grant"',
      'DELETE FROM "lit_group_member"',
      'DELETE FROM "lit_group"',
    ]);
    const at = (p: string) => sqls.findIndex((s) => s.startsWith(p));
    expect(at('INSERT INTO "lit_grant"')).toBeGreaterThan(at('INSERT INTO "lit_record"'));
    expect(counts).toMatchObject({ groups: 1, memberships: 1, grants: 4, hidden: 2, amounts: 2 });
  });

  it('resolves natural keys: record grant points at the one matching record, group grant at the group', async () => {
    const { client, calls } = fakeClient(undefined, full);
    await seed(client, withGrants());
    const rec = calls.find((c) => c.sql.startsWith('INSERT INTO "lit_record"'))!;
    const width = rec.params.length / 4;
    const ids = [0, 1, 2, 3].map((i) => rec.params[i * width]);
    const hiddenCol = (i: number) => rec.params[i * width + 19];
    expect([0, 1, 2, 3].map(hiddenCol)).toEqual([true, true, false, false]);
    expect([0, 1, 2, 3].map((i) => rec.params[i * width + 20])).toEqual([10, null, 20, null]);
    const gr = calls.find((c) => c.sql.startsWith('INSERT INTO "lit_grant"'))!;
    // 10 columns per grant: id, updatedAt, userId, groupId, personId, projectId, typeId, recordId, level, hideAmounts
    expect(gr.params[10 * 3 + 7]).toBe(ids[2]);
    expect(gr.params[3]).not.toBeNull(); // grant 1 targets the group
    expect(gr.params[2]).toBeNull();
    expect(gr.params[10 + 9]).toBe(true);
    expect(gr.params[10 * 2 + 8]).toBe('READ'); // level defaults to READ
  });

  it('rejects an unknown group, user, or an ambiguous record selector before inserting any grant', async () => {
    for (const bad of [
      (d: SeedData) => (d.grants![0] = { group: 'nope', project: 'P1' }),
      (d: SeedData) => (d.grants![0] = { user: 'ghost', project: 'P1' }),
      (d: SeedData) =>
        (d.grants![0] = { user: 'dfranklin', record: { type: 'letter', title: 'zzz' } }),
      (d: SeedData) => (d.grants![0] = { user: 'dfranklin', project: 'P1', type: 'letter' }),
    ]) {
      const { client, calls } = fakeClient(undefined, full);
      const d = withGrants();
      bad(d);
      await expect(seed(client, d)).rejects.toThrow();
      expect(calls.some((c) => c.sql.startsWith('INSERT INTO "lit_grant"'))).toBe(false);
      expect(calls.at(-1)?.sql).toBe('ROLLBACK');
    }
  });
});
