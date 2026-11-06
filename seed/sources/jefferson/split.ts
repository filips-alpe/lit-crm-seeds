/**
 * Splits the scan into record spans: raw line ranges with their metadata.
 *
 * Top-level boundaries come from the contents map (contents.ts). Three
 * containers split further by their own headings:
 *   - the Anas: a new memorandum starts at a paragraph that opens with a date
 *     ("February the 28th, 1792.") or at one of the Anas's own headings
 *     ("CABINET MEETINGS.", "CONVERSATION WITH JOHN ADAMS."); a heading and
 *     the date paragraph right after it are one memorandum. A date without a
 *     year takes the year of the memorandum before it (rolled forward when
 *     the month goes backwards);
 *   - Notes on Virginia: one record per "QUERY n." heading;
 *   - the Parliamentary Manual: one record per "SECTION n." heading.
 * Container children are numbered in order, so a garbled heading number
 * ("SECTION XIL") does not matter; the count is checked against the book.
 */
import { CONTENTS, type ContentsEntry, type DocumentTypeCode } from './contents';
import type { FurnitureMatch } from './pages';

export type RecordSpan = {
  key: string;
  /** 0-based raw line range [from, to). */
  from: number;
  to: number;
  type: DocumentTypeCode;
  title: string;
  author: string | null;
  recipient?: string;
  date: string;
  approx: boolean;
  part: string;
};

const norm = (s: string) => s.trim();

function matches(line: string, anchor: string | RegExp): boolean {
  return typeof anchor === 'string' ? norm(line) === anchor : anchor.test(norm(line));
}

/** Finds every contents anchor in order; throws if one is missing. */
export function locateAnchors(
  lines: string[],
  contents: ContentsEntry[] = CONTENTS,
): { entry: ContentsEntry; line: number }[] {
  const found: { entry: ContentsEntry; line: number }[] = [];
  let at = 0;
  for (const entry of contents) {
    let i = at;
    while (i < lines.length && !matches(lines[i], entry.anchor)) i++;
    if (i >= lines.length) throw new Error(`contents anchor not found: ${entry.key}`);
    found.push({ entry, line: i });
    at = i + 1;
  }
  return found;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// "February the 28th, 1792.", "March 1, 1792.", "May the 23d.", "Feb. 7.",
// "Bladensburg, October the 1st, 1792." (a place may precede the date)
const DATE_START =
  /^(?:[A-Z][a-z]+(?: [A-Z][a-z]+)?, )?(Jan(?:uary|\.)|Feb(?:ruary|\.)|Mar(?:ch|\.)|Apr(?:il|\.)|May|June?|July?|Aug(?:ust|\.)|Sept?(?:ember|\.)|Oct(?:ober|\.)|Nov(?:ember|\.)|Dec(?:ember|\.))\s+(?:the\s+)?([0-9][0-9IlO]?|[IlO][0-9])(?:st|th|d|nd|rd)?(?=[\s.,])[.,]?(?:\s*(1[78]\d\d)\b)?/;

export type AnasDate = { month: number; day: number; year: number | null };

export function parseAnasDate(line: string): AnasDate | null {
  const m = DATE_START.exec(norm(line));
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  const day = Number(m[2].replace(/[Il]/g, '1').replace(/O/g, '0'));
  if (!month || !(day >= 1 && day <= 31)) return null;
  return { month, day, year: m[3] ? Number(m[3]) : null };
}

const ANAS_HEADING =
  /^(CONVERSATIONS? WITH|CABINET MEETINGS|CONFERENCES? (WITH|OF)|MEMORANDUM OF|COPY OF A MINUTE|A RECAPITULATION|DINNER WITH|REASONS FOR)\b/;

const ROMAN = [
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
] as const;
export function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "REASONS FOR SECRETARY OF STATE’S DISSENT." → "Reasons for Secretary of State’s Dissent" */
export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s(-])([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase())
    .replace(/(?<=\s)(Of|The|And|With|In|On|To|A|An|For|At)\b/g, (w) => w.toLowerCase());

/** Heading text as a title: trailing punctuation and OCR specks dropped. */
const cleanHeading = (s: string) =>
  s
    .replace(/^[^A-Za-z]+/, '')
    .replace(/[^A-Za-z)]+$/, '')
    .trim();

type Ctx = { lines: string[]; furniture: Map<number, FurnitureMatch> };

/** True when line i opens a paragraph: the previous non-furniture line is blank. */
function opensParagraph(ctx: Ctx, i: number): boolean {
  for (let j = i - 1; j >= 0; j--) {
    if (ctx.furniture.has(j)) continue;
    return norm(ctx.lines[j]) === '';
  }
  return true;
}

/** The text of the next non-blank lines after `i` up to a blank line. */
function nextParagraph(ctx: Ctx, i: number): string {
  let j = i + 1;
  while (j < ctx.lines.length && norm(ctx.lines[j]) === '') j++;
  const out: string[] = [];
  while (j < ctx.lines.length && norm(ctx.lines[j]) !== '') out.push(norm(ctx.lines[j++]));
  return out.join(' ').replace(/- /g, '');
}

export function splitAnas(ctx: Ctx, from: number, to: number, startYear = 1791): RecordSpan[] {
  type Start = { line: number; heading?: string; date?: AnasDate };
  const starts: Start[] = [];
  for (let i = from; i < to; i++) {
    if (ctx.furniture.has(i) || !opensParagraph(ctx, i)) continue;
    const text = norm(ctx.lines[i]);
    if (ANAS_HEADING.test(text)) {
      starts.push({ line: i, heading: cleanHeading(text) });
      continue;
    }
    const date = parseAnasDate(text);
    if (!date) continue;
    const prev = starts.at(-1);
    // A date right under a heading belongs to that heading's memorandum.
    if (prev?.heading && !prev.date && onlyBlankBetween(ctx, prev.line, i)) {
      prev.date = date;
      continue;
    }
    starts.push({ line: i, date });
  }
  if (starts[0]?.line !== from) starts.unshift({ line: from });

  const spans: RecordSpan[] = [];
  let year = startYear;
  let lastMonth = 0;
  starts.forEach((s, k) => {
    let iso: string;
    if (s.date) {
      if (s.date.year) year = s.date.year;
      else if (s.date.month < lastMonth) year += 1;
      lastMonth = s.date.month;
      iso = `${year}-${String(s.date.month).padStart(2, '0')}-${String(s.date.day).padStart(2, '0')}`;
    } else {
      iso = `${year}-${String(Math.max(lastMonth, 1)).padStart(2, '0')}-01`;
    }
    const [y, mo, d] = iso.split('-').map(Number);
    const when = s.date ? `${MONTH_NAMES[mo - 1]} ${d}, ${y}` : `${y}`;
    const heading = s.heading ? titleCase(s.heading) : 'Memorandum';
    spans.push({
      key: `anas-${String(k + 1).padStart(3, '0')}`,
      from: s.line,
      to: starts[k + 1]?.line ?? to,
      type: 'memorandum',
      title: `The Anas: ${heading}, ${when}`,
      author: 'Thomas Jefferson',
      date: iso,
      approx: !s.date,
      part: 'The Anas',
    });
  });
  return spans;
}

function onlyBlankBetween(ctx: Ctx, a: number, b: number): boolean {
  for (let j = a + 1; j < b; j++) {
    if (ctx.furniture.has(j)) continue;
    const t = norm(ctx.lines[j]);
    if (t !== '' && !/^[A-Z ,.'’-]+$/.test(t)) return false;
  }
  return true;
}

const QUERY_HEADING = /^[QO]UER[YV]\b/;
const SECTION_HEADING = /^S[EB][CG]T?[IL]?[O0]?N\b|^SEGTION/;

export function splitHeaded(
  ctx: Ctx,
  from: number,
  to: number,
  kind: 'queries' | 'manual',
): RecordSpan[] {
  const re = kind === 'queries' ? QUERY_HEADING : SECTION_HEADING;
  const starts: number[] = [];
  for (let i = from; i < to; i++) {
    if (!ctx.furniture.has(i) && re.test(norm(ctx.lines[i])) && opensParagraph(ctx, i))
      starts.push(i);
  }
  return starts.map((line, k) => {
    const n = roman(k + 1);
    const heading = cleanHeading(nextParagraph(ctx, line));
    const common = { from: line, to: starts[k + 1] ?? to, author: 'Thomas Jefferson' };
    if (kind === 'queries') {
      return {
        ...common,
        key: `notes-query-${String(k + 1).padStart(2, '0')}`,
        type: 'query' as const,
        title: `Notes on Virginia, Query ${n}: ${heading}`,
        date: '1781-12-20',
        approx: true,
        part: 'Notes on Virginia',
      };
    }
    return {
      ...common,
      key: `manual-section-${String(k + 1).padStart(2, '0')}`,
      type: 'rule' as const,
      title: `Parliamentary Manual, Section ${n}: ${titleCase(heading)}`,
      date: '1801-02-27',
      approx: false,
      part: 'Manual of Parliamentary Practice',
    };
  });
}

export const EXPECTED = { queries: 23, manual: 53 } as const;

export function splitAll(
  lines: string[],
  furniture: Map<number, FurnitureMatch>,
  contents: ContentsEntry[] = CONTENTS,
): RecordSpan[] {
  const ctx = { lines, furniture };
  const anchors = locateAnchors(lines, contents);
  const spans: RecordSpan[] = [];
  anchors.forEach(({ entry, line }, k) => {
    const to = anchors[k + 1]?.line ?? lines.length;
    if (entry.kind === 'skip') return;
    if (entry.kind === 'record') {
      spans.push({
        key: entry.key,
        from: line,
        to,
        type: entry.type,
        title: entry.title,
        author: entry.author,
        recipient: entry.recipient,
        date: entry.date,
        approx: entry.approx ?? false,
        part: entry.part,
      });
      return;
    }
    if (entry.kind === 'anas') {
      spans.push(...splitAnas(ctx, line, to));
      return;
    }
    const children = splitHeaded(ctx, line, to, entry.kind);
    if (children.length !== EXPECTED[entry.kind]) {
      throw new Error(`${entry.key}: found ${children.length}, expected ${EXPECTED[entry.kind]}`);
    }
    spans.push(...children);
  });
  return spans;
}
