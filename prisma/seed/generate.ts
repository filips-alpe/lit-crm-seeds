/**
 * Generator: turns the committed source snapshots into the generated seed
 * data the loader reads. There is no hand-curated data.
 *
 * Run with: `tsx prisma/seed/generate.ts`
 * Reads:
 *   - prisma/seed/sources/fo-circle.json              (Founders Online: Franklin + circle documents)
 *   - prisma/seed/sources/wikidata-snapshot.json      (cached Wikidata results for the circle, CC0)
 *   - prisma/seed/sources/fo-franklin-text.json       (public-domain full text matched to FO docs by
 *                                                       permalink — Wikisource/Gutenberg, optional)
 * Writes:
 *   - prisma/seed/generated/records.generated.*.json  (chunked, ~10MB each)
 *   - prisma/seed/data/projects.yaml                  (regenerated in full: period + thematic projects)
 *
 * Deterministic and reproducible: no randomness, no network. Re-running
 * against the same inputs always produces the same output.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as YAML from 'yaml';
import type { CircleRoster, FranklinDoc } from './sources/extract-fo';
import { fillMissingDates } from './pipeline/undated';
import { mapRecord, type GeneratedRecord } from './pipeline/record-mapper';
import { mergeText, type MatchedText } from './pipeline/text-merge';
import { PERIOD_PROJECTS, THEMATIC_RULES } from './pipeline/projects';
import { mapWikidata } from './sources/wikidata/map';
import type { WikidataSnapshot } from './sources/wikidata/fetch';

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(here, 'sources/fo-circle.json');
const WIKIDATA_PATH = resolve(here, 'sources/wikidata-snapshot.json');
const ROSTER_PATH = resolve(here, 'sources/circle.json');
const MATCHED_TEXT_PATH = resolve(here, 'sources/fo-franklin-text.json');
const GENERATED_DIR = resolve(here, 'generated');
const PROJECTS_YAML_PATH = resolve(here, 'data/projects.yaml');

/** Hard cap on the size of the seed. */
export const MAX_RECORDS = 30_000;

const CHUNK_BYTES = 10 * 1024 * 1024;

export function generateRecords(docs: FranklinDoc[]): GeneratedRecord[] {
  const inferred = fillMissingDates(
    docs.map((d) => ({ permalink: d.permalink, dateFrom: d['date-from'] })),
  );
  const records: GeneratedRecord[] = [];
  for (const doc of docs) {
    const fill = inferred.get(doc.permalink);
    const dateFrom = doc['date-from'] ?? fill?.dateFrom;
    if (!dateFrom) continue; // no date at all and no neighbour to borrow from (shouldn't happen on the real snapshot)
    const r = mapRecord(doc, dateFrom, Boolean(fill));
    if (r) records.push(r);
  }
  return records;
}

/** Chronological (New Style), ties broken by permalink so the output is stable. */
export function sortChronologically(records: GeneratedRecord[]): GeneratedRecord[] {
  return [...records].sort(
    (a, b) => a.entered.localeCompare(b.entered) || a.permalink.localeCompare(b.permalink),
  );
}

function chunkRecords<T>(records: T[], maxBytes: number): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentBytes = 2; // []
  for (const r of records) {
    const size = JSON.stringify(r).length + 1;
    if (current.length > 0 && currentBytes + size > maxBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(r);
    currentBytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** Earliest record (by NS `entered` date) whose projects include the given code. */
function earliestRecordFor(
  records: GeneratedRecord[],
  projectCode: string,
): GeneratedRecord | undefined {
  return records
    .filter((r) => r.projects.includes(projectCode))
    .sort((a, b) => a.entered.localeCompare(b.entered))[0];
}

function buildProjectsYaml(records: GeneratedRecord[]): string {
  const rows: Record<string, unknown>[] = [];

  for (const p of PERIOD_PROJECTS) {
    const first = earliestRecordFor(records, p.code);
    const citation = first
      ? ` First document of this period in the generated set: ${first.title} (${first.permalink}).`
      : ' No generated document falls in this period.';
    rows.push({
      code: p.code,
      description: `${p.label}.${citation}`,
      color: p.color,
    });
  }

  for (const t of THEMATIC_RULES) {
    const first = earliestRecordFor(records, t.code);
    const count = records.filter((r) => r.projects.includes(t.code)).length;
    const citation = first
      ? ` Earliest matching document: ${first.title} (${first.permalink}). ${count} documents matched by keyword.`
      : ' No generated document matched this theme.';
    rows.push({
      code: t.code,
      description: `${t.label} — keyword-matched thematic project.${citation}`,
      color: t.color,
    });
  }

  return YAML.stringify(rows);
}

function loadMatchedText(): MatchedText[] {
  if (!existsSync(MATCHED_TEXT_PATH)) return [];
  return JSON.parse(readFileSync(MATCHED_TEXT_PATH, 'utf8')) as MatchedText[];
}

function main() {
  const docs = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as FranklinDoc[];

  let fo = generateRecords(docs);
  const matches = loadMatchedText();
  if (matches.length > 0) fo = mergeText(fo, matches);

  const wikidata = existsSync(WIKIDATA_PATH)
    ? mapWikidata(
        JSON.parse(readFileSync(WIKIDATA_PATH, 'utf8')) as WikidataSnapshot,
        JSON.parse(readFileSync(ROSTER_PATH, 'utf8')) as CircleRoster,
      )
    : [];

  const records = sortChronologically([...fo, ...wikidata]);
  if (records.length > MAX_RECORDS) {
    throw new Error(`Generated ${records.length} records, over the ${MAX_RECORDS} cap`);
  }

  mkdirSync(GENERATED_DIR, { recursive: true });
  for (const f of readdirSync(GENERATED_DIR)) {
    if (f.startsWith('records.generated.')) rmSync(resolve(GENERATED_DIR, f));
  }
  const chunks = chunkRecords(records, CHUNK_BYTES);
  chunks.forEach((chunk, i) => {
    writeFileSync(resolve(GENERATED_DIR, `records.generated.${i}.json`), JSON.stringify(chunk));
  });

  writeFileSync(PROJECTS_YAML_PATH, buildProjectsYaml(records));

  const byType = new Map<string, number>();
  for (const r of records) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  const withText = records.filter((r) => r.text).length;
  console.log(
    `Generated ${records.length} records (${fo.length} Founders Online, ${wikidata.length} Wikidata) ` +
      `in ${chunks.length} chunk(s), ${withText} with merged text. Wrote ${PROJECTS_YAML_PATH}.\n` +
      [...byType]
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `  ${t}: ${n}`)
        .join('\n'),
  );
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) main();
