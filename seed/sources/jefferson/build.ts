/**
 * Builds the Jefferson dataset from the cached Internet Archive OCR.
 *
 * Run with: `bun seed/sources/jefferson/build.ts [cacheDir]`
 * Reads:    .workflow/scratch/jefferson/{raw.txt,page_numbers.json}  (see fetch.ts)
 *           seed/sources/jefferson/gazetteer.yaml             (curated entities)
 * Writes:   seed/generated/jefferson.generated.json            (records, entities, mentions)
 *           seed/sources/jefferson/corrections.tsv             (every OCR correction)
 *           seed/sources/jefferson/REPORT.md                   (counts, link rate, issues)
 *
 * Deterministic: no network, no randomness, stable ordering.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as YAML from 'yaml';
import { DEFAULT_CACHE_DIR, IA_DETAILS_URL, IA_ITEM, cachePath } from './fetch';
import { buildPageMap, leafIndex, type IaPageNumbers, type PageMap } from './pages';
import { buildHyphenLexicon, cleanSpan, type Correction, type ParagraphStart } from './clean';
import { splitAll, type RecordSpan } from './split';
import {
  buildAliasIndex,
  findMentions,
  unlinkedCandidates,
  type Gazetteer,
  type GazetteerEntity,
} from './entities';
import { renderReport } from './report';
import type { JeffersonDataset, JeffersonMention, JeffersonRecord } from './dataset';

export type { JeffersonDataset, JeffersonMention, JeffersonRecord } from './dataset';

const here = dirname(fileURLToPath(import.meta.url));
export const GAZETTEER_PATH = resolve(here, 'gazetteer.yaml');
export const OUTPUT_PATH = resolve(here, '../../generated/jefferson.generated.json');
const CORRECTIONS_PATH = resolve(here, 'corrections.tsv');
const REPORT_PATH = resolve(here, 'REPORT.md');

export const EDITION =
  'The Writings of Thomas Jefferson, Definitive Edition, ed. Andrew A. Lipscomb and Albert Ellery Bergh (Washington, D.C.: Thomas Jefferson Memorial Association, 1905), vols. I–II';

const VOLUME = ['', 'I', 'II'];

export type BuildStats = {
  documents: { span: RecordSpan; record: JeffersonRecord; corrections: Correction[] }[];
  entities: { entity: GazetteerEntity; mentions: number; records: number }[];
  linked: number;
  /** Documents with at least one linked mention. */
  linkedDocuments: number;
  ambiguous: Map<string, number>;
  candidates: Map<string, number>;
  rawLines: number;
  furnitureLines: number;
};

/** "vol. I, pp. 1–28", "vol. II, p. 23", or "vol. I, front matter" when unnumbered. */
export function citePages(pm: PageMap, from: number, to: number): string {
  const vol = VOLUME[pm.volume[from]];
  const pages: number[] = [];
  for (let i = from; i < to; i++) if (pm.page[i]) pages.push(pm.page[i]);
  if (pages.length === 0) return `vol. ${vol}, front matter`;
  const a = Math.min(...pages);
  const b = Math.max(...pages);
  return a === b ? `vol. ${vol}, p. ${a}` : `vol. ${vol}, pp. ${a}–${b}`;
}

/** Book-reader link to the first numbered page of a span, else the item page. */
export function pageUrl(
  pm: PageMap,
  leaves: Map<string, number>,
  from: number,
  to: number,
): string {
  for (let i = from; i < to; i++) {
    if (!pm.page[i]) continue;
    const leaf = leaves.get(`${pm.volume[i]}:${pm.page[i]}`);
    if (leaf !== undefined) return `${IA_DETAILS_URL}/page/n${leaf}`;
    break;
  }
  return IA_DETAILS_URL;
}

/** The raw line a character offset of the cleaned text came from. */
export function lineAtOffset(paragraphs: ParagraphStart[], offset: number): number {
  let line = paragraphs[0]?.line ?? 1;
  for (const p of paragraphs) {
    if (p.offset > offset) break;
    line = p.line;
  }
  return line;
}

export function buildDataset(
  raw: string,
  pageNumbers: IaPageNumbers,
  gazetteer: Gazetteer,
): { dataset: JeffersonDataset; stats: BuildStats } {
  const lines = raw.split('\n');
  const volumeTwoStart = lines.findIndex((l, i) => i > 1000 && l.trim() === 'THE WRITINGS OF');
  if (volumeTwoStart < 0) throw new Error('second title page not found');
  const pm = buildPageMap(lines, volumeTwoStart);
  const leaves = leafIndex(pageNumbers);
  const lexicon = buildHyphenLexicon(lines);
  const spans = splitAll(lines, pm.furniture);
  const index = buildAliasIndex(gazetteer);

  const documents: BuildStats['documents'] = [];
  const mentions: JeffersonMention[] = [];
  const ambiguous = new Map<string, number>();
  const candidates = new Map<string, number>();
  // Per entity: mention count, records, first mention (document order) and variants seen.
  type Seen = {
    mentions: number;
    records: Set<string>;
    first?: { record: string; line: number };
    entered?: string;
    variants: Map<string, number>;
  };
  const seen = new Map<string, Seen>();

  for (const span of spans) {
    const cleaned = cleanSpan(lines, span.from, span.to, pm.furniture, lexicon);
    const citation = citePages(pm, span.from, span.to);
    const record: JeffersonRecord = {
      key: span.key,
      type: span.type,
      title: span.title,
      description: [
        span.part,
        span.author ? `By ${span.author}` : null,
        span.recipient ? `to ${span.recipient}` : null,
      ]
        .filter(Boolean)
        .join('. ')
        .replace('. to ', ' to '),
      text: cleaned.text,
      note:
        `Source: ${EDITION.split(',')[0]}, ${citation} (Internet Archive ${IA_ITEM}, OCR lines ${span.from + 1}–${span.to}).` +
        (span.approx ? ' Date approximate.' : ''),
      references: [pageUrl(pm, leaves, span.from, span.to)],
      entered: span.date,
      date: span.date,
      from: span.author ?? undefined,
      to: span.recipient,
    };
    documents.push({ span, record, corrections: cleaned.corrections });

    const found = findMentions(cleaned.text, index, span.key);
    for (const m of found) {
      if (!m.entity) {
        ambiguous.set(
          m.surface.replace(/\s+/g, ' '),
          (ambiguous.get(m.surface.replace(/\s+/g, ' ')) ?? 0) + 1,
        );
        continue;
      }
      mentions.push({ record: span.key, entity: m.entity, start: m.start, end: m.end });
      const s: Seen = seen.get(m.entity) ?? {
        mentions: 0,
        records: new Set(),
        variants: new Map(),
      };
      s.mentions++;
      s.records.add(span.key);
      s.first ??= { record: span.key, line: lineAtOffset(cleaned.paragraphs, m.start) };
      if (!s.entered || span.date < s.entered) s.entered = span.date;
      const v = m.surface.replace(/\s+/g, ' ');
      s.variants.set(v, (s.variants.get(v) ?? 0) + 1);
      seen.set(m.entity, s);
    }
    for (const c of unlinkedCandidates(cleaned.text, found))
      candidates.set(c, (candidates.get(c) ?? 0) + 1);
  }

  // Entities that the text actually mentions become records; the rest of the
  // gazetteer is dropped so no entity page is empty.
  const entityRecords: JeffersonRecord[] = [];
  const entityStats: BuildStats['entities'] = [];
  for (const entity of gazetteer.entities) {
    const s = seen.get(entity.key);
    if (!s || !s.first) continue;
    const firstLine = s.first.line - 1;
    const variants = [...s.variants.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([v]) => v);
    const firstTitle = documents.find((d) => d.record.key === s.first!.record)!.record.title;
    entityRecords.push({
      key: `entity-${entity.key}`,
      type: entity.type,
      title: entity.name,
      description: entity.description,
      note:
        `Printed as: ${variants.join('; ')}. First mentioned in “${firstTitle}”, ${citePages(pm, firstLine, firstLine + 1)} ` +
        `(OCR line ${s.first.line}). Source: ${EDITION.split(',')[0]} (Internet Archive ${IA_ITEM}).`,
      references: [pageUrl(pm, leaves, firstLine, firstLine + 1)],
      entered: s.entered!,
    });
    entityStats.push({ entity, mentions: s.mentions, records: s.records.size });
  }
  for (const m of mentions) m.entity = `entity-${m.entity}`;

  const records = [...documents.map((d) => d.record), ...entityRecords];
  const furnitureLines = pm.furniture.size;
  return {
    dataset: {
      source: { item: IA_ITEM, url: IA_DETAILS_URL, edition: EDITION },
      records,
      mentions,
    },
    stats: {
      documents,
      entities: entityStats,
      linked: mentions.length,
      linkedDocuments: new Set(mentions.map((m) => m.record)).size,
      ambiguous,
      candidates,
      rawLines: lines.length,
      furnitureLines,
    },
  };
}

function main() {
  const cacheDir = process.argv[2] ?? DEFAULT_CACHE_DIR;
  const raw = readFileSync(cachePath(cacheDir, 'raw'), 'utf8');
  const pageNumbers = JSON.parse(
    readFileSync(cachePath(cacheDir, 'pageNumbers'), 'utf8'),
  ) as IaPageNumbers;
  const gazetteer = YAML.parse(readFileSync(GAZETTEER_PATH, 'utf8')) as Gazetteer;
  const { dataset, stats } = buildDataset(raw, pageNumbers, gazetteer);

  writeFileSync(OUTPUT_PATH, JSON.stringify(dataset, null, 0) + '\n');
  const tsv = ['line\tkind\trecord\traw\tresult'];
  for (const d of stats.documents) {
    for (const c of d.corrections) {
      tsv.push(
        [c.line, c.kind, d.record.key, c.raw, c.result]
          .map((v) => String(v).replace(/\t/g, ' '))
          .join('\t'),
      );
    }
  }
  writeFileSync(CORRECTIONS_PATH, tsv.join('\n') + '\n');
  writeFileSync(REPORT_PATH, renderReport(stats));
  console.log(
    `${stats.documents.length} documents, ${stats.entities.length} entities, ${stats.linked} linked mentions`,
  );
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) main();
