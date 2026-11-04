import type { YearCount } from '$lib/dashboards/types';

export type PeriodId = 'before' | 'paris' | 'after';

export interface Period {
  id: PeriodId;
  count: number;
}

/** Jefferson succeeded Franklin at Paris in 1784 and sailed home in 1789. */
export const PARIS_FROM = 1784;
export const PARIS_TO = 1789;

/** Dated records split before / during / after the Paris ministry, from `byYear`. */
export function periodSplit(byYear: YearCount[]): Period[] {
  const sum = (pick: (y: number) => boolean) =>
    byYear.reduce((n, y) => (pick(y.year) ? n + y.count : n), 0);
  return [
    { id: 'before', count: sum((y) => y < PARIS_FROM) },
    { id: 'paris', count: sum((y) => y >= PARIS_FROM && y <= PARIS_TO) },
    { id: 'after', count: sum((y) => y > PARIS_TO) },
  ];
}
