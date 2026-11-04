import type { YearCount } from '$lib/dashboards/types';

export interface TenureYear {
  year: number;
  count: number;
  inside: boolean;
}

export interface TenurePlot {
  /** Every year from the first of tenure/data to the last, zero-filled. */
  years: TenureYear[];
  inside: number;
  outside: number;
}

/** Per-year counts on an axis that always spans the tenure and widens to hold every dated year. */
export function tenurePlot(
  byYear: YearCount[],
  tenureStart: number,
  tenureEnd: number,
): TenurePlot {
  const counts = new Map(byYear.map((y) => [y.year, y.count]));
  const from = Math.min(tenureStart, ...counts.keys());
  const to = Math.max(tenureEnd, ...counts.keys());
  const years: TenureYear[] = [];
  let inside = 0;
  let outside = 0;
  for (let year = from; year <= to; year++) {
    const count = counts.get(year) ?? 0;
    const isIn = year >= tenureStart && year <= tenureEnd;
    if (isIn) inside += count;
    else outside += count;
    years.push({ year, count, inside: isIn });
  }
  return { years, inside, outside };
}
