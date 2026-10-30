import type { DashboardRecord, TypeCount } from '$lib/dashboards/types';

export interface SeasonPoint {
  id: string;
  year: number;
  title: string;
  /** Position along the span, 0–100. A single point sits in the middle. */
  pct: number;
}

const when = (r: DashboardRecord) => r.date ?? r.start ?? r.createdAt;

/** Total records over every type. */
export const totalOf = (counts: TypeCount[]) => counts.reduce((n, c) => n + c.count, 0);

/** Records of one type code. */
export const countOf = (counts: TypeCount[], code: string) =>
  counts.find((c) => c.code === code)?.count ?? 0;

/**
 * Letters placed proportionally along the years they span. At most `max` points are kept,
 * spread evenly over the dated letters so a line never turns into a smear.
 */
export function seasons(records: DashboardRecord[], max = 9): SeasonPoint[] {
  const sorted = records
    .filter((r) => r.type.code === 'letter')
    .sort((a, b) => when(a).getTime() - when(b).getTime());
  if (!sorted.length) return [];
  const picked =
    sorted.length <= max
      ? sorted
      : Array.from(
          { length: max },
          (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (max - 1))],
        );
  const first = when(picked[0]).getTime();
  const span = when(picked[picked.length - 1]).getTime() - first;
  return picked.map((r) => ({
    id: r.id,
    year: when(r).getUTCFullYear(),
    title: r.title ?? r.type.code,
    pct: span === 0 ? 50 : ((when(r).getTime() - first) / span) * 100,
  }));
}
