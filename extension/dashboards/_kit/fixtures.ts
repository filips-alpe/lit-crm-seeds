import { parseLatLng } from '$lib/fields/registry';
import type {
  Correspondent,
  DashboardData,
  DashboardRecord,
  DashboardType,
  DashboardUser,
  GeoRoute,
  MoneyTotal,
  ProjectCount,
  TypeCount,
  YearCount,
} from '$lib/dashboards/types';

/** A record row as loaded from the DB, before the user's `role` is known. */
export type RawDashboardRecord = Omit<DashboardRecord, 'role'>;

/** Test fixtures shared by every franklin dashboard test (pure, no DB, not imported by app code). */
export function makeUser(username: string, name: string, color = '#7a5230'): DashboardUser {
  return { id: `u-${username}`, username, name, bio: `${name}, a bio.`, color, avatarSeed: null };
}

const typeDef = (code: string, color: string): DashboardType => ({
  id: `t-${code}`,
  code,
  color,
  iconSeed: null,
  layout: null,
  rendererId: code,
});

/** The franklin record types, as the seed defines them (codes + rendererIds). */
export const TYPES = {
  letter: typeDef('letter', '#2e5a4a'),
  diary: typeDef('diary', '#7a5230'),
  essay: typeDef('essay', '#8a2f3e'),
  note: typeDef('note', '#6b4a7a'),
  instrument: typeDef('instrument', '#3f5a6a'),
  proceedings: typeDef('proceedings', '#4a4f7a'),
  account: typeDef('account', '#9a3f5e'),
  petition: typeDef('petition', '#5a6a3a'),
  document: { ...typeDef('document', '#7d6b58'), rendererId: null },
  life: typeDef('life', '#3a5a40'),
  office: typeDef('office', '#5a3a2e'),
  membership: typeDef('membership', '#2e6f7e'),
} satisfies Record<string, DashboardType>;

export type TypeCode = keyof typeof TYPES;

export const franklin = {
  id: 'u-bfranklin',
  username: 'bfranklin',
  name: 'Benjamin Franklin',
  color: '#7a5230',
  avatarSeed: null,
};

let n = 0;
/** A record of `type` for `user`. `mine` says whether the user created or was assigned it. */
export function makeRecord(
  user: DashboardUser,
  type: TypeCode = 'letter',
  over: Partial<RawDashboardRecord> & { mine?: 'creator' | 'assignee' } = {},
): RawDashboardRecord {
  n += 1;
  const { mine = 'creator', ...rest } = over;
  const me = {
    id: user.id,
    username: user.username,
    name: user.name,
    color: user.color,
    avatarSeed: null,
  };
  const other = franklin.id === user.id ? { ...me, id: 'u-other', username: 'other' } : franklin;
  return {
    id: `rec-${n}`,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    status: 'ACTIVE',
    title: `Record ${n}`,
    description: null,
    note: null,
    references: [],
    date: null,
    start: null,
    end: null,
    sum: null,
    hours: null,
    total: null,
    unit: null,
    from: null,
    to: null,
    fromGeo: null,
    toGeo: null,
    type: TYPES[type],
    creator: mine === 'creator' ? me : other,
    assignee: mine === 'assignee' ? me : null,
    projects: [],
    ...rest,
  };
}

const eventDate = (r: RawDashboardRecord) => r.date ?? r.start ?? null;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Does a free-text party name refer to the user (tolerant of case and partial names)? */
function isSelf(name: string | null, user: DashboardUser): boolean {
  if (!name) return false;
  const n = norm(name);
  const me = norm(user.name);
  return n !== '' && (n === me || me.includes(n) || n.includes(me));
}

/**
 * Fold raw records into a `DashboardData` the way the platform does (pure, no DB). Carries both
 * the full-list fields and the capped-contract counters so the fixtures serve either platform shape.
 */
export function dataFor(
  user: DashboardUser,
  raw: RawDashboardRecord[],
  now = new Date('1790-01-01T00:00:00Z'),
): DashboardData {
  const key = (r: RawDashboardRecord) => (eventDate(r) ?? r.createdAt).getTime();
  const records: DashboardRecord[] = [...raw]
    .sort((a, b) => key(b) - key(a) || (a.id < b.id ? 1 : -1))
    .map((r) => {
      const isCreator = r.creator?.id === user.id;
      const isAssignee = r.assignee?.id === user.id;
      return { ...r, role: isCreator && isAssignee ? 'both' : isAssignee ? 'assignee' : 'creator' };
    });

  const types = new Map<string, TypeCount>();
  const years = new Map<number, number>();
  const people = new Map<string, Correspondent>();
  const projects = new Map<string, ProjectCount>();
  const money = new Map<string, MoneyTotal>();
  const geo: GeoRoute[] = [];
  const times: number[] = [];

  for (const r of records) {
    const t = types.get(r.type.id) ?? {
      typeId: r.type.id,
      code: r.type.code,
      color: r.type.color,
      iconSeed: r.type.iconSeed,
      count: 0,
      created: 0,
      assigned: 0,
    };
    t.count += 1;
    if (r.role !== 'assignee') t.created += 1;
    if (r.role !== 'creator') t.assigned += 1;
    types.set(r.type.id, t);

    const when = eventDate(r);
    if (when) {
      times.push(when.getTime());
      years.set(when.getUTCFullYear(), (years.get(when.getUTCFullYear()) ?? 0) + 1);
    }

    const fromMe = isSelf(r.from, user);
    const toMe = isSelf(r.to, user);
    const touch = (name: string, dir: 'sent' | 'received' | null) => {
      const c = people.get(norm(name)) ?? {
        name: name.trim(),
        sent: 0,
        received: 0,
        total: 0,
        first: null,
        last: null,
      };
      c.total += 1;
      if (dir) c[dir] += 1;
      if (when && (!c.first || when < c.first)) c.first = when;
      if (when && (!c.last || when > c.last)) c.last = when;
      people.set(norm(name), c);
    };
    if (r.to?.trim() && !toMe) touch(r.to, fromMe ? 'sent' : null);
    if (r.from?.trim() && !fromMe) touch(r.from, toMe ? 'received' : null);

    for (const { project } of r.projects) {
      const c = projects.get(project.id) ?? { ...project, count: 0 };
      c.count += 1;
      projects.set(project.id, c);
    }

    if (r.sum != null || r.total != null) {
      const k = `${r.type.id}|${r.unit ?? ''}`;
      const m = money.get(k) ?? {
        typeId: r.type.id,
        code: r.type.code,
        color: r.type.color,
        unit: r.unit,
        count: 0,
        sum: 0,
        total: 0,
      };
      m.count += 1;
      m.sum += r.sum ?? 0;
      m.total += r.total ?? 0;
      money.set(k, m);
    }

    const fromGeo = parseLatLng(r.fromGeo);
    const toGeo = parseLatLng(r.toGeo);
    if (fromGeo || toGeo) {
      geo.push({ id: r.id, title: r.title, from: r.from, to: r.to, fromGeo, toGeo, date: when });
    }
  }

  const byYear: YearCount[] = [];
  if (years.size) {
    const ys = [...years.keys()];
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      byYear.push({ year: y, count: years.get(y) ?? 0 });
    }
  }
  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
  const isFuture = (r: DashboardRecord) => {
    const w = eventDate(r);
    return w !== null && w.getTime() > now.getTime();
  };
  const correspondents = [...people.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );

  const data = {
    records,
    total: records.length,
    createdCount: records.filter((r) => r.role !== 'assignee').length,
    assignedCount: records.filter((r) => r.role !== 'creator').length,
    truncated: false,
    byType: Object.groupBy(records, (r) => r.type.code),
    correspondentCount: correspondents.length,
    countsByType: [...types.values()].sort(byCount),
    range: {
      earliest: times.length ? new Date(Math.min(...times)) : null,
      latest: times.length ? new Date(Math.max(...times)) : null,
    },
    byYear,
    correspondents,
    projects: [...projects.values()].sort(byCount),
    money: [...money.values()].sort(byCount),
    recent: records.filter((r) => !isFuture(r)).slice(0, 10),
    upcoming: records.filter(isFuture).reverse().slice(0, 10),
    geo,
  };
  return data as DashboardData;
}

const d = (s: string) => new Date(`${s}T00:00:00Z`);

/** A mixed bag a typical franklin-circle user could hold: letters both ways plus a few other types. */
export function sampleRecords(user: DashboardUser): RawDashboardRecord[] {
  const years = [1757, 1758, 1760, 1760, 1763, 1768, 1771, 1775, 1779, 1782];
  const letters = years.map((y, i) =>
    makeRecord(user, 'letter', {
      date: d(`${y}-0${(i % 9) + 1}-10`),
      from: i % 2 ? 'Benjamin Franklin' : user.name,
      to: i % 2 ? user.name : 'Benjamin Franklin',
      mine: i % 2 ? 'assignee' : 'creator',
    }),
  );
  return [
    ...letters,
    makeRecord(user, 'diary', { date: d('1778-03-04'), title: 'Diary, 4 March 1778' }),
    makeRecord(user, 'essay', { date: d('1771-06-01'), from: user.name }),
    makeRecord(user, 'note', { date: d('1765-02-01') }),
    makeRecord(user, 'instrument', { date: d('1783-09-03'), from: 'United States', to: 'Britain' }),
    makeRecord(user, 'proceedings', { date: d('1775-05-10'), from: 'Continental Congress' }),
    makeRecord(user, 'account', { start: d('1757-07-01'), end: d('1758-06-30'), sum: 12 }),
    makeRecord(user, 'petition', { date: d('1764-04-01'), from: 'Merchants of Philadelphia' }),
    makeRecord(user, 'life', {
      date: d('1706-01-17'),
      from: user.name,
      to: 'Boston',
      toGeo: '42.36,-71.06',
    }),
    makeRecord(user, 'office', {
      start: d('1778-09-14'),
      end: d('1785-05-01'),
      from: user.name,
      to: 'Minister to France',
    }),
    makeRecord(user, 'membership', { date: d('1756-04-29'), from: user.name, to: 'Royal Society' }),
  ];
}
