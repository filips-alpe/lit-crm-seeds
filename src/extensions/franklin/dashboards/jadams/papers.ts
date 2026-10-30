import type { Correspondent, DashboardRecord, TypeCount, YearCount } from '$lib/dashboards/types';

export interface Exchange {
  name: string;
  sent: number;
  received: number;
  total: number;
  /** Share of the exchange that Adams wrote, 0–1. */
  sentShare: number;
}

/** Records of a type code in `counts` (0 when absent). */
export function countOf(counts: TypeCount[], code: string): number {
  return counts.find((c) => c.code === code)?.count ?? 0;
}

/** Top correspondents with the sent/received split as a 0–1 share. */
export function exchangeLedger(correspondents: Correspondent[], limit = 7): Exchange[] {
  return correspondents.slice(0, limit).map((c) => ({
    name: c.name,
    sent: c.sent,
    received: c.received,
    total: c.total,
    sentShare: c.sent + c.received === 0 ? 0 : c.sent / (c.sent + c.received),
  }));
}

/** The year with the most records (first one wins ties); null when there are none. */
export function peakYear(byYear: YearCount[]): YearCount | null {
  let best: YearCount | null = null;
  for (const y of byYear) if (y.count > 0 && (!best || y.count > best.count)) best = y;
  return best;
}

/** Display subset: records whose type code is in `codes`. */
export function ofTypes(records: DashboardRecord[], ...codes: string[]): DashboardRecord[] {
  return records.filter((r) => codes.includes(r.type.code));
}
