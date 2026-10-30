import type { YearCount } from '$lib/dashboards/types';

export interface DecadeCount {
  decade: number;
  count: number;
}

/** Fold per-year counts into per-decade counts (1757 -> 1750), ascending, gaps zero-filled. */
export function decadeCounts(byYear: YearCount[]): DecadeCount[] {
  if (!byYear.length) return [];
  const totals = new Map<number, number>();
  for (const { year, count } of byYear) {
    const decade = Math.floor(year / 10) * 10;
    totals.set(decade, (totals.get(decade) ?? 0) + count);
  }
  const first = Math.min(...totals.keys());
  const last = Math.max(...totals.keys());
  const out: DecadeCount[] = [];
  for (let d = first; d <= last; d += 10) out.push({ decade: d, count: totals.get(d) ?? 0 });
  return out;
}

/** The busiest year, or null when nothing is dated. */
export function peakYear(byYear: YearCount[]): YearCount | null {
  let best: YearCount | null = null;
  for (const y of byYear) if (y.count > 0 && (!best || y.count > best.count)) best = y;
  return best;
}
