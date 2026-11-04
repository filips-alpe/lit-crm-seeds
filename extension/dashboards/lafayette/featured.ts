import type { DashboardRecord } from '$lib/dashboards/types';

/** The newest letter (records arrive newest first); null when there is none. */
export function featuredLetter(records: DashboardRecord[]): DashboardRecord | null {
  return records.find((r) => r.type.code === 'letter') ?? null;
}

/** Display subset by type code. */
export function ofType(records: DashboardRecord[], code: string): DashboardRecord[] {
  return records.filter((r) => r.type.code === code);
}

/** Years between the first and last dated record, inclusive; null without a range. */
export function yearsSpan(range: { earliest: Date | null; latest: Date | null }): number | null {
  if (!range.earliest || !range.latest) return null;
  return range.latest.getUTCFullYear() - range.earliest.getUTCFullYear() + 1;
}
