import type { DashboardRecord, TypeCount } from '$lib/dashboards/types';

export interface SourceEntry {
  id: string;
  title: string;
  date: Date | null;
  reference: string;
  /** The reference as a web link, when it is one. */
  href: string | null;
  /** The reference without scheme, for display. */
  label: string;
}

export const countOf = (counts: TypeCount[], code: string) =>
  counts.find((c) => c.code === code)?.count ?? 0;

export const totalOf = (counts: TypeCount[]) => counts.reduce((n, c) => n + c.count, 0);

/** Every reference note on the records, flattened, newest record first. Capped at `limit`. */
export function sourceEntries(records: DashboardRecord[], limit = 10): SourceEntry[] {
  return records
    .flatMap((r) =>
      r.references.map((reference) => ({
        id: r.id,
        title: r.title ?? '',
        date: r.date ?? r.start ?? r.createdAt,
        reference,
        href: /^https?:\/\//.test(reference) ? reference : null,
        label: reference.replace(/^https?:\/\/(www\.)?/, ''),
      })),
    )
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, limit);
}
