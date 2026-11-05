import type { ClientBase } from 'pg';
import { describe, expect, it } from 'vitest';
import { seed, type SeedData } from './db';

type Call = { sql: string; params: unknown[] };

function fakeClient(failOn?: RegExp, opts: { isAdminColumn?: boolean } = {}) {
  const { isAdminColumn = true } = opts;
  const calls: Call[] = [];
  const client = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (failOn?.test(sql)) throw new Error('boom');
      if (sql.includes('information_schema.columns'))
        return isAdminColumn
          ? { rows: [{ '?column?': 1 }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
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
    expect(sqls.slice(1, 6)).toEqual([
      'DELETE FROM "lit_project_record"',
      'DELETE FROM "lit_record"',
      'DELETE FROM "lit_project"',
      'DELETE FROM "lit_type"',
      'DELETE FROM "lit_user"',
    ]);
    expect(sqls.at(-1)).toBe('COMMIT');
    expect(counts).toEqual({ users: 2, types: 1, projects: 2, records: 5, links: 7 });
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
