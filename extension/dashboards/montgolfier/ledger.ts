import type { DashboardRecord } from '$lib/dashboards/types';

export interface AccountRow {
  id: string;
  title: string;
  date: Date | null;
}

const when = (r: DashboardRecord) => r.date ?? r.start ?? null;

/** Account-type records as ledger rows, newest first. */
export function accountRows(records: DashboardRecord[]): AccountRow[] {
  return records
    .filter((r) => r.type.code === 'account')
    .map((r) => ({ id: r.id, title: r.title ?? '', date: when(r) }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}
