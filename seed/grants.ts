import type { SeedRecordFlat } from './types-defs';

export type SeedGroup = { name: string; description?: string; members: string[] };

export type SeedGrant = {
  user?: string;
  group?: string;
  person?: string;
  project?: string;
  type?: string;
  record?: { type: string; title: string };
  level?: 'READ' | 'WRITE';
  hideAmounts?: boolean;
};

export type SeedHidden = { type: string; title: string };
export type SeedAmounts = { type: string; every: number; sums: number[] };

export type GrantNames = {
  users: Set<string>;
  groups: Set<string>;
  projects: Set<string>;
  types: Set<string>;
};

/** Indexes of the records a hidden entry matches (type and title regular expression). */
export function hiddenIndexes(records: SeedRecordFlat[], hidden: SeedHidden[]): Set<number> {
  const out = new Set<number>();
  for (const h of hidden) {
    const re = new RegExp(h.title);
    records.forEach((r, i) => {
      if (r.type === h.type && re.test(r.title ?? '')) out.add(i);
    });
  }
  return out;
}

/** record index -> sum (also stored as total) for the amounts rules. */
export function amountsByIndex(
  records: SeedRecordFlat[],
  rules: SeedAmounts[],
): Map<number, number> {
  const out = new Map<number, number>();
  for (const a of rules) {
    if (!a.sums.length || a.every < 1) throw new Error(`Bad amounts rule for type ${a.type}`);
    let n = 0;
    records.forEach((r, i) => {
      if (r.type !== a.type) return;
      if (n % a.every === 0) out.set(i, a.sums[(n / a.every) % a.sums.length]);
      n++;
    });
  }
  return out;
}

/** The record a grant's `record` selector names: exactly one of that type and exact title. */
export function recordIndex(
  records: SeedRecordFlat[],
  sel: { type: string; title: string },
): number {
  const hits: number[] = [];
  records.forEach((r, i) => {
    if (r.type === sel.type && r.title === sel.title) hits.push(i);
  });
  if (hits.length !== 1)
    throw new Error(
      `Grant record selector matches ${hits.length} records, need 1: ${sel.type} "${sel.title}"`,
    );
  return hits[0];
}

/** Check the natural keys of every group and grant before anything is written. */
export function validateGrants(
  groups: SeedGroup[],
  grants: SeedGrant[],
  names: GrantNames,
  records: SeedRecordFlat[],
): void {
  const seen = new Set<string>();
  for (const g of groups) {
    if (seen.has(g.name)) throw new Error(`Duplicate group: ${g.name}`);
    seen.add(g.name);
    for (const u of g.members)
      if (!names.users.has(u)) throw new Error(`Group ${g.name}: unknown user ${u}`);
  }
  grants.forEach((g, i) => {
    const at = `Grant #${i + 1}`;
    if (Number(!!g.user) + Number(!!g.group) !== 1)
      throw new Error(`${at}: needs exactly one of user, group`);
    const scopes = [g.person, g.project, g.type, g.record].filter((x) => x !== undefined).length;
    if (scopes !== 1) throw new Error(`${at}: needs exactly one of person, project, type, record`);
    if (g.level && g.level !== 'READ' && g.level !== 'WRITE')
      throw new Error(`${at}: bad level ${g.level}`);
    if (g.user && !names.users.has(g.user)) throw new Error(`${at}: unknown user ${g.user}`);
    if (g.group && !names.groups.has(g.group)) throw new Error(`${at}: unknown group ${g.group}`);
    if (g.person && !names.users.has(g.person))
      throw new Error(`${at}: unknown person ${g.person}`);
    if (g.project && !names.projects.has(g.project))
      throw new Error(`${at}: unknown project ${g.project}`);
    if (g.type && !names.types.has(g.type)) throw new Error(`${at}: unknown type ${g.type}`);
    if (g.record) recordIndex(records, g.record);
  });
}
