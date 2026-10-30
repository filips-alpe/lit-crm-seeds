import type { Correspondent, DashboardRecord } from '$lib/dashboards/types';

export interface ExchangeRow {
  name: string;
  sent: number;
  received: number;
}

/** Correspondents with at least one letter, ordered by volume. */
export function exchangeRows(people: Correspondent[], limit = 8): ExchangeRow[] {
  return people
    .filter((p) => p.total > 0)
    .slice(0, limit)
    .map((p) => ({ name: p.name, sent: p.sent, received: p.received }));
}

/** Largest single-side count, for scaling the bars. */
export function exchangeMax(rows: ExchangeRow[]): number {
  return Math.max(1, ...rows.flatMap((r) => [r.sent, r.received]));
}

/** Family and household life events (births, marriages, deaths) as timeline items, oldest first. */
export function lifeItems(records: DashboardRecord[], limit = 12) {
  return records
    .filter((r) => r.type.code === 'life')
    .map((r) => ({
      id: r.id,
      date: r.date ?? r.start,
      title: r.title ?? ([r.from, r.to].filter(Boolean).join(' · ') || r.id),
      subtitle: r.title && r.from ? r.from : null,
      color: r.type.color,
    }))
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity))
    .slice(0, limit);
}
