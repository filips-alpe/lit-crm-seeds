import type { DashboardRecord, TypeCount, YearCount } from '$lib/dashboards/types';

/** Franklin was the Massachusetts House's agent in London from 1770 to 1775. */
export const AGENCY_FROM = 1770;
export const AGENCY_TO = 1775;

/** Per-year counts inside the agency window (years with no data come back as 0). */
export function agencyYears(byYear: YearCount[]): YearCount[] {
  const out: YearCount[] = [];
  for (let year = AGENCY_FROM; year <= AGENCY_TO; year += 1) {
    out.push({ year, count: byYear.find((y) => y.year === year)?.count ?? 0 });
  }
  return out;
}

export function agencyTotal(byYear: YearCount[]): number {
  return agencyYears(byYear).reduce((n, y) => n + y.count, 0);
}

export function countOf(counts: TypeCount[], code: string): number {
  return counts.find((c) => c.code === code)?.count ?? 0;
}

/** Display subset by type code. */
export function ofType(records: DashboardRecord[], code: string): DashboardRecord[] {
  return records.filter((r) => r.type.code === code);
}
