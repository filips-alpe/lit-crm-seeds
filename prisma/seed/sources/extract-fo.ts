/**
 * Filters the raw 54MB Founders Online metadata dump down to Franklin's
 * circle:
 *  - every Franklin document: all of Franklin Papers, plus docs in other FO
 *    projects where "Franklin, Benjamin" is an author or recipient;
 *  - circle documents that do not involve Franklin himself (see
 *    `selectCircleDocs`): the 17 demo users plus Franklin's top individual
 *    correspondents, bounded by Franklin's death.
 * Cross-project duplicates (the same letter cataloged twice, once by each
 * project) are merged into a single entry, the first permalink kept primary
 * and the other project's permalink appended.
 *
 * Run with: `tsx prisma/seed/sources/extract-fo.ts [path/to/founders-online-metadata.json]`
 * Reads:  .workflow/scratch/founders-online-metadata.json (not committed, 54MB) unless a path is given
 * Writes: prisma/seed/sources/fo-circle.json (committed snapshot)
 *         prisma/seed/sources/circle.json    (committed circle roster, input to the Wikidata importer)
 *
 * Reproducible: re-running against the same raw download always produces the
 * same output (pure filter/dedupe, no randomness, no network).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { demoUsernameFor } from '../pipeline/demo-users';

export type FoDoc = {
  title: string;
  permalink: string;
  project: string;
  authors: string[];
  recipients: string[];
  'date-from'?: string;
  'date-to'?: string;
};

export type FranklinDoc = FoDoc & { altPermalinks?: string[] };

const FRANKLIN_AUTHOR = 'Franklin, Benjamin';

/**
 * Normalizes a title+date pair into a dedupe key: strips bracketed
 * editorial asides ("[Extract]"), strips a trailing comma-date fragment,
 * lowercases, and collapses everything but letters/digits. Combined with an
 * exact date-from match, this is the key used to find the same letter
 * cataloged under two FO projects.
 */
export function normalizeDedupeKey(title: string, dateFrom: string | undefined): string {
  const stripped = title
    .replace(/\[[^\]]*\]/g, '')
    .replace(/,\s*\[?\d.*$/, '') // trailing ", <date>" fragment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return `${stripped}|${dateFrom ?? ''}`;
}

export function isFranklinPapers(doc: FoDoc): boolean {
  return doc.project === 'Franklin Papers';
}

export function involvesFranklin(doc: FoDoc): boolean {
  return doc.authors.includes(FRANKLIN_AUTHOR) || doc.recipients.includes(FRANKLIN_AUTHOR);
}

/** The 7 fields the pipeline actually uses. */
function pickFields(d: FoDoc): FranklinDoc {
  return {
    title: d.title,
    permalink: d.permalink,
    project: d.project,
    authors: d.authors,
    recipients: d.recipients,
    'date-from': d['date-from'],
    'date-to': d['date-to'],
  };
}

/**
 * Builds the deduped Franklin snapshot from the full raw FO array.
 * Only the 7 fields the pipeline actually uses are kept.
 */
export function buildFranklinSnapshot(raw: FoDoc[]): FranklinDoc[] {
  const pick = pickFields;

  const franklinPapers = raw.filter(isFranklinPapers).map(pick);
  const bfOther = raw.filter((d) => !isFranklinPapers(d) && involvesFranklin(d)).map(pick);

  // Franklin Papers dedupe key -> doc (first occurrence wins; FP-internal
  // title+date collisions are a known, intentional non-merge per the ledger).
  const fpByKey = new Map<string, FranklinDoc>();
  for (const doc of franklinPapers) {
    const key = normalizeDedupeKey(doc.title, doc['date-from']);
    if (!fpByKey.has(key)) fpByKey.set(key, doc);
  }

  const standaloneOther: FranklinDoc[] = [];
  for (const doc of bfOther) {
    const key = normalizeDedupeKey(doc.title, doc['date-from']);
    const fpMatch = fpByKey.get(key);
    if (fpMatch) {
      fpMatch.altPermalinks = [...(fpMatch.altPermalinks ?? []), doc.permalink];
    } else {
      standaloneOther.push(doc);
    }
  }

  return [...franklinPapers, ...standaloneOther];
}

// ---------------------------------------------------------------------------
// Circle selection
// ---------------------------------------------------------------------------

/** Franklin's death; circle documents dated later are out of scope. */
export const FRANKLIN_DEATH = '1790-04-17';
/** How many of Franklin's most frequent individual correspondents join the circle. */
export const TOP_CORRESPONDENTS = 100;

/** Demo users so prolific in FO that they only join the circle through rule C or rule B. */
const PROLIFIC_DEMO = /^(Adams, John$|Jefferson, Thomas$|Lafayette, Marie-Joseph)/;
const GROUP_NAME =
  /^(American|First Joint|Committee|Pseudonym|——|Continental|Pennsylvania|Massachusetts|.*Commissioners)/;
const FIRM_OR_VARIANT = / & |Sr\.|, \w+ Jr\.$/;

export const isFranklinName = (name: string): boolean => name === FRANKLIN_AUTHOR;
export const isDemoName = (name: string): boolean => demoUsernameFor(name) !== undefined;

export type RosterPerson = { name: string; count: number; from?: number; to?: number };

export type CircleRoster = {
  /** FO names matching the demo users. */
  demo: string[];
  /** Franklin's top individual correspondents with exchanged-document counts. */
  top: { name: string; count: number }[];
  /**
   * The people the Wikidata importer looks up: demo users, Franklin's top
   * correspondents and the most frequent individuals across the snapshot, with
   * the years their documents span (used to reject namesakes of another era).
   */
  people: RosterPerson[];
};

/** How many of the most frequent individuals in the snapshot are looked up in Wikidata. */
export const WIKIDATA_PEOPLE = 1000;

function buildRosterPeople(docs: FranklinDoc[], extra: Set<string>): RosterPerson[] {
  const stats = new Map<string, RosterPerson>();
  for (const d of docs) {
    const year = d['date-from'] ? Number(d['date-from'].slice(0, 4)) : undefined;
    for (const n of new Set([...d.authors, ...d.recipients])) {
      if (GROUP_NAME.test(n) || FIRM_OR_VARIANT.test(n)) continue;
      const s = stats.get(n) ?? { name: n, count: 0 };
      s.count++;
      if (year) {
        s.from = Math.min(s.from ?? year, year);
        s.to = Math.max(s.to ?? year, year);
      }
      stats.set(n, s);
    }
  }
  const ranked = [...stats.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
  const keep = new Set(ranked.slice(0, WIKIDATA_PEOPLE).map((p) => p.name));
  for (const n of extra) keep.add(n);
  return ranked.filter((p) => keep.has(p.name));
}

/** Top individual correspondents of Franklin by number of documents exchanged. */
export function topCorrespondents(
  raw: FoDoc[],
  k: number = TOP_CORRESPONDENTS,
): CircleRoster['top'] {
  const counts = new Map<string, number>();
  for (const d of raw) {
    const people = new Set([...d.authors, ...d.recipients]);
    if (![...people].some(isFranklinName)) continue;
    for (const n of people) {
      if (isFranklinName(n) || GROUP_NAME.test(n) || FIRM_OR_VARIANT.test(n)) continue;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .map(([name, count]) => ({ name, count }));
}

/**
 * Circle documents that do not involve Franklin, dated up to his death, kept
 * when (all must hold for the doc to be considered; then any one rule):
 *  - A: a participant is a demo user other than Adams/Jefferson/Lafayette;
 *  - B: it has authors and recipients and every one of them is in the circle
 *       (a demo user or a top correspondent);
 *  - C: John Adams is a participant, 1776-1785 (his diary and letters during
 *       the Paris/Hague/Amsterdam years that overlap Franklin's mission).
 * Documents already in `exclude` (the Franklin snapshot) are skipped.
 */
export function selectCircleDocs(
  raw: FoDoc[],
  top: CircleRoster['top'],
  exclude: Set<string>,
): FoDoc[] {
  const topSet = new Set(top.map((t) => t.name));
  const inCircle = (n: string) => isDemoName(n) || topSet.has(n);
  return raw.filter((d) => {
    if (exclude.has(d.permalink)) return false;
    const people = [...d.authors, ...d.recipients];
    if (people.some(isFranklinName)) return false;
    const from = d['date-from'];
    if (from !== undefined && from > FRANKLIN_DEATH) return false;
    if (people.some((n) => isDemoName(n) && !PROLIFIC_DEMO.test(n))) return true; // A
    if (
      d.authors.length > 0 &&
      d.recipients.length > 0 &&
      d.authors.every(inCircle) &&
      d.recipients.every(inCircle)
    ) {
      return true; // B
    }
    return (
      people.includes('Adams, John') &&
      from !== undefined &&
      from >= '1776-01-01' &&
      from <= '1785-12-31'
    ); // C
  });
}

/**
 * Full snapshot: the Franklin snapshot followed by the circle docs. Circle docs
 * cataloged twice under different FO projects are merged like the Franklin ones.
 */
export function buildCircleSnapshot(
  raw: FoDoc[],
  k: number = TOP_CORRESPONDENTS,
): { docs: FranklinDoc[]; roster: CircleRoster } {
  const franklin = buildFranklinSnapshot(raw);
  const exclude = new Set(franklin.flatMap((d) => [d.permalink, ...(d.altPermalinks ?? [])]));
  const top = topCorrespondents(raw, k);
  const circle = selectCircleDocs(raw, top, exclude).map(pickFields);

  const seen = new Map<string, FranklinDoc>();
  const docs: FranklinDoc[] = [];
  for (const d of circle) {
    const key = normalizeDedupeKey(d.title, d['date-from']);
    const prior = seen.get(key);
    // A title that is only a bracketed date ("[July 1783]") normalizes to an empty key; never merge on that.
    if (prior && prior.project !== d.project && !key.startsWith('|')) {
      prior.altPermalinks = [...(prior.altPermalinks ?? []), d.permalink];
    } else {
      seen.set(key, d);
      docs.push(d);
    }
  }
  const demoNames = new Set<string>();
  for (const d of raw) {
    for (const n of [...d.authors, ...d.recipients]) if (isDemoName(n)) demoNames.add(n);
  }
  const all = [...franklin, ...docs];
  const demo = [...demoNames].sort();
  return {
    docs: all,
    roster: {
      demo,
      top,
      people: buildRosterPeople(all, new Set([...demo, ...top.map((t) => t.name)])),
    },
  };
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  const rawPath =
    process.argv[2] ??
    new URL('../../../.workflow/scratch/founders-online-metadata.json', import.meta.url);
  const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as FoDoc[];
  const { docs, roster } = buildCircleSnapshot(raw);
  writeFileSync(new URL('./fo-circle.json', import.meta.url), JSON.stringify(docs));
  writeFileSync(new URL('./circle.json', import.meta.url), JSON.stringify(roster, null, 2) + '\n');
  console.log(`Wrote ${docs.length} docs (${roster.top.length} top correspondents).`);
}
