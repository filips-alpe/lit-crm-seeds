import type { DashboardRecord } from '$lib/dashboards/types';

/** Letters in the list written by Benjamin Franklin (a display filter; the list is capped). */
export function lettersFromFather(records: DashboardRecord[]): DashboardRecord[] {
  return records.filter(
    (r) =>
      r.type.code === 'letter' &&
      (r.from?.toLowerCase().includes('benjamin franklin') || r.creator?.username === 'bfranklin'),
  );
}
