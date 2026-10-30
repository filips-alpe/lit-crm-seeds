import type {
  Correspondent,
  DashboardData,
  DashboardRecord,
  TypeCount,
  YearCount,
} from '$lib/dashboards/types';
import type { TimelineItem } from '$lib/dashboards/widgets/Timeline.svelte';

/**
 * The newest records of the given type codes, newest first, from `data.byType` (a capped list per
 * type, so an old type is never crowded out by newer ones). Display lists only: never count from it,
 * use `countOf` on `countsByType`.
 */
export function typed(data: DashboardData, ...codes: string[]): DashboardRecord[] {
  const when = (r: DashboardRecord) => (r.date ?? r.start ?? r.createdAt).getTime();
  return codes.flatMap((c) => data.byType[c] ?? []).sort((a, b) => when(b) - when(a));
}

/** Records of one type code from a record list. */
export const ofType = (records: DashboardRecord[], ...codes: string[]) =>
  records.filter((r) => codes.includes(r.type.code));

/** How many records of a type the user holds (from the uncapped per-type counts). */
export const countOf = (counts: TypeCount[], ...codes: string[]) =>
  counts.filter((c) => codes.includes(c.code)).reduce((sum, c) => sum + c.count, 0);

export const totalOf = (counts: TypeCount[]) => counts.reduce((sum, c) => sum + c.count, 0);

/** The first correspondent whose name contains every given fragment (case-insensitive). */
export function findCorrespondent(
  people: Correspondent[],
  ...fragments: string[]
): Correspondent | null {
  const wanted = fragments.map((f) => f.toLowerCase());
  return people.find((p) => wanted.every((f) => p.name.toLowerCase().includes(f))) ?? null;
}

const eventDate = (r: DashboardRecord) => r.date ?? r.start;

/** Life/office/membership records as dated timeline entries, oldest first, undated last. */
export function timelineItems(records: DashboardRecord[]): TimelineItem[] {
  return [...records]
    .sort((a, b) => {
      const da = eventDate(a)?.getTime() ?? Infinity;
      const db = eventDate(b)?.getTime() ?? Infinity;
      return da - db;
    })
    .map((r) => ({
      id: r.id,
      date: eventDate(r),
      title: r.title ?? [r.from, r.to].filter(Boolean).join(' - '),
      subtitle: r.to && r.title !== r.to ? r.to : null,
      color: r.type.color,
    }));
}

/** The years inside [from, to] only (keeps the zero-filled gaps). */
export const sliceYears = (byYear: YearCount[], from: number, to: number) =>
  byYear.filter((y) => y.year >= from && y.year <= to);
