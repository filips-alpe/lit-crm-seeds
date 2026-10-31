/**
 * Turns the cached Smyth OCR into the committed text snapshot and report.
 * Deterministic: reads only the cache and committed snapshots, with no network
 * and no randomness, so the same input always gives byte-identical output.
 *
 * Run with: `tsx prisma/seed/sources/smyth/build.ts [cacheDir]`, then `tsx prisma/seed/generate.ts`
 * Reads:  .workflow/scratch/smyth/vol-NN.txt (see fetch.ts)
 *         prisma/seed/sources/fo-circle.json, prisma/seed/sources/fo-franklin-text.json
 * Writes: prisma/seed/sources/fo-smyth-text.json       (matched text, input to generate.ts)
 *         prisma/seed/sources/smyth/outcomes.json      (what happened to every document)
 *         prisma/seed/sources/smyth/REPORT.md
 *         prisma/seed/sources/smyth/SPOT-CHECK.md      (fixed sample for checking by eye)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateRecords } from '../../generate';
import type { MatchedText } from '../../pipeline/text-merge';
import type { FranklinDoc } from '../extract-fo';
import { DEFAULT_CACHE_DIR, volumeCachePath } from './fetch';
import { matchDocuments, type SmythOutcome } from './match';
import { splitVolume, type SmythDocument } from './split';

const here = dirname(fileURLToPath(import.meta.url));

/** Rows on the spot-check sheet: every weak rule's matches first, then an even spread of the rest. */
const SPOT_CHECK_SIZE = 40;
const SPOT_CHECK_EXCERPT_LENGTH = 220;

export type BuildResult = {
  documents: SmythDocument[];
  matches: MatchedText[];
  outcomes: SmythOutcome[];
  /** Matches dropped because the record already has cleaner text from another source. */
  alreadyHasText: number;
  recordCount: number;
  existingTextCount: number;
};

/** Splits every volume and matches the documents against the records the seed will contain. */
export function buildSmyth(
  volumes: { volume: number; raw: string }[],
  foDocs: FranklinDoc[],
  existing: MatchedText[],
): BuildResult {
  const documents = volumes.flatMap(({ volume, raw }) => splitVolume(raw, volume));
  const seeded = new Set(generateRecords(foDocs).map((r) => r.permalink));
  const records = foDocs.filter((d) => seeded.has(d.permalink));
  const { matches, outcomes } = matchDocuments(documents, records);
  const taken = new Set(existing.map((m) => m.permalink));
  const fresh = matches.filter((m) => !taken.has(m.permalink));
  return {
    documents,
    matches: fresh,
    outcomes,
    alreadyHasText: matches.length - fresh.length,
    recordCount: seeded.size,
    existingTextCount: [...taken].filter((p) => seeded.has(p)).length,
  };
}

function countBy<T>(items: T[], key: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const percent = (part: number, whole: number) =>
  whole === 0 ? '0.0%' : `${((part / whole) * 100).toFixed(1)}%`;

function table(header: [string, string], rows: [string, number][]): string {
  return [
    `| ${header[0]} | ${header[1]} |`,
    '| --- | ---: |',
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join('\n');
}

const REASON_MEANING: Record<string, string> = {
  'split-flagged': 'the split looked unreliable, so the text was not trusted',
  'text-too-short': 'the text is a fragment',
  'no-exact-date': 'Smyth gives no exact day for this letter, or only a span',
  'no-record-on-date': 'no seeded record has this date, including old-style and misread dates',
  'no-name-or-title-match': 'records exist on this date, but none fits the addressee or title',
  ambiguous: 'more than one record fits',
  'contested-record': 'two Smyth documents fit the same record',
};

/** The report, generated so its numbers cannot drift from the data. */
export function renderReport(result: BuildResult): string {
  const { documents, matches, outcomes, alreadyHasText, recordCount, existingTextCount } = result;
  const matched = outcomes.filter((o) => o.status === 'matched');
  const unmatched = outcomes.filter((o) => o.status === 'unmatched');
  const totalWithText = matches.length + existingTextCount;
  const documentKey = (o: { volume: number; number: number }) => `${o.volume}/${o.number}`;
  const confirmedKeys = new Set(documents.filter((d) => d.dateConfirmed).map(documentKey));
  const dateConfirmed = matched.filter((o) => confirmedKeys.has(documentKey(o))).length;
  const flagRows = countBy(
    documents.flatMap((d) => d.flags),
    (flag) => flag,
  );
  const perVolume = Array.from({ length: 10 }, (_, i) => i + 1).map((volume) => {
    const docs = outcomes.filter((o) => o.volume === volume);
    const hits = docs.filter((o) => o.status === 'matched').length;
    return `| ${volume} | ${docs.length} | ${hits} | ${percent(hits, docs.length)} |`;
  });

  return `# Smyth full-text match report

Generated by \`prisma/seed/sources/smyth/build.ts\`. Do not edit by hand.

Source: Albert Henry Smyth, _The Writings of Benjamin Franklin_ (10 vols, 1905-07), public domain,
University of Toronto scans on the Internet Archive (\`writingsofbenjam01franuoft\` to \`10\`).

## Result

- Documents split: **${documents.length}**
- Matched to a Founders Online record: **${matched.length}** (${percent(matched.length, documents.length)} of documents)
- Matches whose exact date is printed twice and agrees (contents table and dateline): ${dateConfirmed} of ${matched.length}
- Left unmatched: **${unmatched.length}**
- Matched, but not used because the record already has cleaner text: ${alreadyHasText}
- Records with full text: ${existingTextCount} before, **${totalWithText}** after, out of ${recordCount} Founders Online records (${percent(existingTextCount, recordCount)} to ${percent(totalWithText, recordCount)})

Coverage of all records stays low because Founders Online holds far more than Smyth printed, including
every letter written to Franklin and every letter among his circle.

## Matches by method

${table(
  ['Method', 'Documents'],
  countBy(matches, (m) => m.matchMethod),
)}

## Why documents stayed unmatched

${table(
  ['Reason', 'Documents'],
  countBy(unmatched, (o) => o.reason ?? 'unknown'),
)}

${Object.entries(REASON_MEANING)
  .map(([reason, meaning]) => `- \`${reason}\`: ${meaning}.`)
  .join('\n')}

Every document's outcome is listed in \`outcomes.json\`.

## By volume

| Volume | Documents | Matched | Rate |
| ---: | ---: | ---: | ---: |
${perVolume.join('\n')}

Volume 1 is Smyth's introduction and the Autobiography, so it has almost nothing to match.

## Split flags

A flagged document is never merged.

${table(['Flag', 'Documents'], flagRows)}

## OCR quality issues

The text is uncorrected OCR. Known problems, none of them repaired in the merged text:

- **Misread characters** remain throughout, such as "Golden" for "Colden", "Gushing" for "Cushing" and
  "Novembers" for "November 5".
- **Hyphens at line ends** are removed when joining lines, so a real compound broken at a line end
  ("self-\\ngovernment") loses its hyphen.
- **Smyth's footnotes** are removed by pattern. A note with an unreadable mark and no "— ED." signature can
  survive in the text, and a real paragraph opening with a lone digit near a page end could be lost.
- **Smyth's archive marks** such as "(A. P. S.)" go with the heading, so they are not in the text.
- **Contents rows** are sometimes garbled. The printed dateline is used instead, and a document with
  neither readable has no exact date, so it stays unmatched.
- **Wording** follows Smyth's edition, not Franklin's manuscript, so it can differ from Founders Online.

## Precision

Precision was not measured against Founders Online's transcriptions, because founders.archives.gov refuses
scripted requests. \`SPOT-CHECK.md\` lists a fixed sample with record links for checking in a browser.
`;
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').replace(/\|/g, '/');
  return flat.length <= SPOT_CHECK_EXCERPT_LENGTH
    ? flat
    : `${flat.slice(0, SPOT_CHECK_EXCERPT_LENGTH)}…`;
}

/** A fixed sample to compare by eye with the linked Founders Online page. */
export function renderSpotCheck(result: BuildResult, foDocs: FranklinDoc[]): string {
  const titles = new Map(foDocs.map((d) => [d.permalink, d.title]));
  const sorted = [...result.matches].sort((a, b) => a.permalink.localeCompare(b.permalink));
  const isTitleRule = (m: MatchedText) => m.matchMethod.endsWith('+title');
  const weak = sorted.filter(isTitleRule);
  const rest = sorted.filter((m) => !isTitleRule(m));
  const wanted = Math.min(Math.max(0, SPOT_CHECK_SIZE - weak.length), rest.length);
  const spread = Array.from(
    { length: wanted },
    (_, i) => rest[Math.floor((i * rest.length) / wanted)],
  );
  const rows = [...weak, ...spread].map((m) => {
    const where = m.source.edition.replace(/^.*?(vol\.)/, '$1').replace(' (uncorrected OCR)', '');
    return `| ${m.matchMethod} | ${where} | [${titles.get(m.permalink) ?? m.permalink}](${m.permalink}) | ${excerpt(m.text)} |`;
  });
  return `# Smyth match spot-check

Generated by \`prisma/seed/sources/smyth/build.ts\`. Do not edit by hand.

Open each record link and compare it with the opening of the matched text. Spelling can differ, because
Smyth and Founders Online transcribe separately, but it should plainly be the same document.

| Method | Smyth | Founders Online record | Matched text opens |
| --- | --- | --- | --- |
${rows.join('\n')}
`;
}

function main() {
  const cacheDir = process.argv[2] ?? DEFAULT_CACHE_DIR;
  const volumes = Array.from({ length: 10 }, (_, i) => i + 1).map((volume) => ({
    volume,
    raw: readFileSync(volumeCachePath(cacheDir, volume), 'utf8'),
  }));
  const foDocs = JSON.parse(
    readFileSync(resolve(here, '../fo-circle.json'), 'utf8'),
  ) as FranklinDoc[];
  const existing = JSON.parse(
    readFileSync(resolve(here, '../fo-franklin-text.json'), 'utf8'),
  ) as MatchedText[];

  const result = buildSmyth(volumes, foDocs, existing);
  writeFileSync(resolve(here, '../fo-smyth-text.json'), JSON.stringify(result.matches, null, 1));
  writeFileSync(resolve(here, 'outcomes.json'), JSON.stringify(result.outcomes, null, 1));
  writeFileSync(resolve(here, 'REPORT.md'), renderReport(result));
  writeFileSync(resolve(here, 'SPOT-CHECK.md'), renderSpotCheck(result, foDocs));
  console.log(
    `${result.documents.length} documents, ${result.matches.length} matched and used. See REPORT.md.`,
  );
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) main();
