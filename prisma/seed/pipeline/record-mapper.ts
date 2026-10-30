import { classifyDoc, SKIP } from './classifier';
import { demoUsernameFor } from './demo-users';
import { osToNs } from './dates';
import { joinNames } from './names';
import { assignPeriod, assignThematic } from './projects';
import type { FranklinDoc } from '../sources/extract-fo';

export type GeneratedRecord = {
  type: string;
  title: string;
  description?: string;
  note?: string;
  text?: string;
  references: string[];
  entered: string; // NS ISO date -> createdAt
  date?: string; // single-date records: the date as recorded (Old Style before 1752) -> `date` column
  start?: string; // span records: first day as recorded -> `start`
  end?: string; // span records: last day as recorded -> `end`
  allDay?: boolean; // true for spans
  from?: string;
  to?: string;
  fromGeo?: string; // "lat,lng"
  toGeo?: string; // "lat,lng"
  creatorUsername?: string;
  assigneeUsername?: string;
  projects: string[];
  permalink: string; // carried through for text-merge matching; not a DB column
};

const firstDemoUser = (names: string[]): string | undefined =>
  names.map(demoUsernameFor).find(Boolean);

/**
 * Maps one FO document (already deduped, with any missing date filled in by
 * `fillMissingDates`) to a generated record. Returns `undefined` for docs the
 * classifier marks SKIP (FO's own editorial front-matter).
 *
 * Common mapping: title = FO title; a single date -> `date`; a span
 * (date-to after date-from) -> `start`/`end` with `allDay`; references = the
 * permalink plus any cross-project alternates; from/to = authors/recipients
 * joined with "; "; creator/assignee = the first author/recipient that is a
 * demo user.
 */
export function mapRecord(
  doc: FranklinDoc,
  resolvedDateFrom: string,
  inferredDate: boolean,
): GeneratedRecord | undefined {
  const type = classifyDoc(doc).type;
  if (type === SKIP) return undefined;

  const ns = osToNs(resolvedDateFrom);
  const dateTo = doc['date-to'];
  const isSpan = !inferredDate && dateTo !== undefined && dateTo > resolvedDateFrom;

  const from = joinNames(doc.authors);
  const to = joinNames(doc.recipients);

  return {
    type,
    title: doc.title,
    // No invented prose: FO gives us no narrative description field.
    description: undefined,
    note: inferredDate
      ? 'Date unknown in the Founders Online catalog; placed near its neighbouring documents in catalog order.'
      : undefined,
    references: [doc.permalink, ...(doc.altPermalinks ?? [])],
    entered: ns,
    ...(isSpan
      ? { start: resolvedDateFrom, end: dateTo, allDay: true }
      : { date: resolvedDateFrom }),
    from: from || undefined,
    to: to || undefined,
    creatorUsername: firstDemoUser(doc.authors),
    assigneeUsername: firstDemoUser(doc.recipients),
    projects: [assignPeriod(ns), ...assignThematic(doc.title, from, to)],
    permalink: doc.permalink,
  };
}
