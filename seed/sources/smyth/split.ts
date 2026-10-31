/**
 * Splits one volume of Smyth's OCR into individual documents.
 *
 * Smyth numbers every document across the edition, and each volume's contents
 * table lists number, title, date and page. A body heading only counts as a
 * boundary if its number is in sequence and its text agrees with the contents
 * entry, so the two OCR passes check each other. Anything that suggests a
 * boundary was missed sets a flag, and flagged documents are never merged.
 */

export type SmythDate = { iso: string; precision: 'day' | 'month' | 'year' };

export type ContentsEntry = {
  number: number;
  title: string;
  date?: SmythDate;
  page?: number;
};

export type SplitFlag =
  | 'followed-by-gap' // the next number in sequence has no heading, so it may be inside this text
  | 'swallowed-heading' // the text contains a line that looks like a letter heading
  | 'date-conflict' // contents and dateline give different dates
  | 'implausible-length' // far longer or shorter than the contents page span
  | 'unknown-end'; // runs into Smyth's own Life of Franklin, with no marked end

export type SmythDocument = {
  volume: number;
  number: number;
  title: string;
  date?: SmythDate;
  page?: number;
  text: string;
  flags: SplitFlag[];
};

const MONTHS = [
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
const MONTH_PATTERN = MONTHS.join('|');
const FIRST_YEAR = 1706;
const LAST_YEAR = 1790;

/** A printed page rarely holds this many lines, so a longer "footnote" is really body text. */
const MAX_FOOTNOTE_LINES = 30;
/** Generous bounds on OCR characters per printed page, for the length plausibility check. */
const MAX_CHARS_PER_PAGE = 3000;
const MIN_CHARS_PER_PAGE = 150;

const pad = (n: number) => String(n).padStart(2, '0');
const squeeze = (s: string) => s.replace(/\s+/g, ' ').trim();

function parseYear(raw: string): number | undefined {
  const year = Number(raw.replace(/[Il]/g, '1').replace(/O/g, '0'));
  return Number.isInteger(year) && year >= FIRST_YEAR && year <= LAST_YEAR ? year : undefined;
}

/**
 * Parses a single date, exactly. Spans, qualified dates and garbled days give
 * undefined: a wrong date would match the wrong record, a missing one only
 * leaves it unmatched.
 */
export function parseSmythDate(raw: string): SmythDate | undefined {
  const s = squeeze(raw).replace(/\.$/, '');

  const day = new RegExp(`^(${MONTH_PATTERN}) (\\d{1,2}),? ([\\dIlO]{4})$`).exec(s);
  if (day) {
    const month = MONTHS.indexOf(day[1]) + 1;
    const dayOfMonth = Number(day[2]);
    const year = parseYear(day[3]);
    if (!year || dayOfMonth < 1) return undefined;
    if (dayOfMonth > new Date(Date.UTC(year, month, 0)).getUTCDate()) return undefined;
    return { iso: `${year}-${pad(month)}-${pad(dayOfMonth)}`, precision: 'day' };
  }

  const month = new RegExp(`^(${MONTH_PATTERN}),? ([\\dIlO]{4})$`).exec(s);
  if (month) {
    const year = parseYear(month[2]);
    if (!year) return undefined;
    return { iso: `${year}-${pad(MONTHS.indexOf(month[1]) + 1)}`, precision: 'month' };
  }

  if (/^[\dIlO]{4}$/.test(s)) {
    const year = parseYear(s);
    return year ? { iso: String(year), precision: 'year' } : undefined;
  }
  return undefined;
}

const ENTRY_START = /^\s*(\d{1,4})\s*[.,]\s+(\S.*)$/;
const ENDS_WITH_PAGE = /(?:^|[^\d,])\s*(\d{1,3})\s*$/;
const CONTENTS_RUNNING_HEAD = /^\s*(?:[ivxlc]+\s+CONTENTS|CONTENTS\s+[ivxlc]+)\s*$/i;
/** The contents table has ended once this many lines pass without a new entry. */
const MAX_LINES_BETWEEN_ENTRIES = 60;
/** Contents numbers increase; a bigger jump than this is OCR noise, not a skipped row. */
const MAX_CONTENTS_NUMBER_JUMP = 40;

/** A numbered line with no lowercase words outside parentheses: a body heading, not a contents row. */
function isCapsHeading(rest: string): boolean {
  return !/[a-z]{3}/.test(rest.replace(/\(.*?\)/g, ''));
}

/**
 * First date in a contents row. OCR often leaves junk between the date and the
 * page number, so the row is searched rather than parsed from its end.
 */
const ROW_DATE = new RegExp(
  `(?<![A-Za-z\\d])(?:(?:${MONTH_PATTERN}) \\d ?\\d?,? |(?:${MONTH_PATTERN}),? )?\\[?[\\dIlO]{4}\\]?(?![A-Za-z\\d])`,
);

function finishEntry(number: number, buffer: string): ContentsEntry {
  const pageMatch = ENDS_WITH_PAGE.exec(buffer);
  const page = pageMatch ? Number(pageMatch[1]) : undefined;
  const row = squeeze(buffer);
  const dateMatch = ROW_DATE.exec(row);
  const beforeDate = dateMatch ? row.slice(0, dateMatch.index) : row.replace(/[\s\d.,•·'‘’`:;v\-—]+$/, '');
  const titleEnd = beforeDate.lastIndexOf('. ');
  if (!dateMatch) return { number, title: beforeDate, page };
  if (titleEnd === -1) return { number, title: beforeDate.replace(/[\s.,]+$/, ''), page };

  // Text between the title's full stop and the date means a span or a qualifier
  // ("July 22-October 11, 1726", "About May 1, 1770"): not an exact date.
  const qualifier = beforeDate.slice(titleEnd + 2).trim();
  const dateText = dateMatch[0].replace(/[[\]]/g, '').replace(/ (\d) (\d),/, ' $1$2,');
  return {
    number,
    title: beforeDate.slice(0, titleEnd).trim(),
    date: qualifier ? undefined : parseSmythDate(dateText),
    page,
  };
}

/** Reads the contents table, returning its entries and the line where it ends. */
function readContents(lines: string[]): { entries: ContentsEntry[]; endLine: number } {
  const start = lines.findIndex((l) => /^\s*CONTENTS/.test(l));
  if (start === -1) return { entries: [], endLine: 0 };

  const entries: ContentsEntry[] = [];
  let open: { number: number; buffer: string } | undefined;
  let linesSinceEntry = 0;
  let endLine = start;

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (CONTENTS_RUNNING_HEAD.test(line) || !line.trim()) continue;
    const match = ENTRY_START.exec(line);
    // Stray numbers ("1." from a speck, a page number) fail the increasing-sequence test.
    const number = match ? Number(match[1]) : NaN;
    const inSequence =
      !open || (number > open.number && number - open.number <= MAX_CONTENTS_NUMBER_JUMP);
    if (match && inSequence && !isCapsHeading(match[2])) {
      if (open) entries.push(finishEntry(open.number, open.buffer));
      open = { number, buffer: match[2] };
      linesSinceEntry = 0;
      endLine = i;
      continue;
    }
    if (++linesSinceEntry > MAX_LINES_BETWEEN_ENTRIES) break;
    // A row is complete once it has its page number; later text is not part of it.
    if (open && !ENDS_WITH_PAGE.test(open.buffer) && !ROW_DATE.test(squeeze(open.buffer))) {
      open.buffer += ` ${line}`;
      endLine = i;
    }
  }
  if (open) entries.push(finishEntry(open.number, open.buffer));
  return { entries, endLine };
}

/** Parses the numbered contents table at the front of a volume. */
export function parseContents(lines: string[]): ContentsEntry[] {
  return readContents(lines).entries;
}

const WRITINGS_HEAD = /THE\s+WRITINGS\s+OF\s+BENJAMIN\s+FRANKLIN/;
const YEAR_HEAD = /^\s*\W?[1Il][\dIlO]{3}\s*\]/;
/** OCR often reads the note mark 2 as "a". */
const FOOTNOTE_START = /^\s*[1-9a*†‡§]\s+["“'‘(]?[A-Z]/;
/** Smyth signs his own notes "— ED."; a line ending that way is never Franklin's text. */
const EDITOR_SIGNATURE = /[—–-]\s*ED[.,]?\s*$/;

function isRunningHead(line: string): boolean {
  return (WRITINGS_HEAD.test(line) && line.trim().length < 70) || YEAR_HEAD.test(line);
}

/** Splits lines into pages at running heads, discarding the heads. */
function splitPages(lines: string[]): string[][] {
  const pages: string[][] = [[]];
  for (const line of lines) {
    if (isRunningHead(line)) pages.push([]);
    else pages[pages.length - 1].push(line);
  }
  return pages;
}

/** Removes every paragraph up to a line signed by the editor, wherever it sits on the page. */
function stripSignedNotes(page: string[]): string[] {
  const kept: string[] = [];
  let paragraphStart = 0;
  for (const line of page) {
    if (!line.trim()) {
      kept.push(line);
      paragraphStart = kept.length;
    } else if (EDITOR_SIGNATURE.test(line)) {
      kept.length = paragraphStart;
    } else {
      kept.push(line);
    }
  }
  return kept;
}

/** Removes the footnote block at the foot of a page, if one is close enough to the end. */
function stripFootnotes(page: string[]): string[] {
  for (let i = 0; i < page.length; i++) {
    const startsNote = i === 0 || !page[i - 1].trim() || EDITOR_SIGNATURE.test(page[i - 1]);
    if (startsNote && FOOTNOTE_START.test(page[i]) && page.length - i <= MAX_FOOTNOTE_LINES) {
      return page.slice(0, i);
    }
  }
  return page;
}

/** Turns raw body lines into reading text: no page furniture, joined lines, one blank between paragraphs. */
export function cleanBody(lines: string[]): string {
  const paragraphs: string[] = [];
  let current = '';
  let continuePrevious = false;

  const flush = () => {
    if (current) paragraphs.push(current);
    current = '';
  };

  const pages = splitPages(lines).map((page) => stripSignedNotes(stripFootnotes(page)));
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0 && current === '' && paragraphs.length > 0) continuePrevious = true;
    for (const raw of page) {
      const line = squeeze(raw).replace(/([A-Za-z.,;:!?'"’”)\]])[1-9](?=\s|$)/g, '$1');
      if (!line) {
        flush();
        continue;
      }
      if (continuePrevious) {
        continuePrevious = false;
        const previous = paragraphs[paragraphs.length - 1];
        // A paragraph left open at the foot of a page continues on the next.
        if (!/[.!?:;"”]$/.test(previous)) current = paragraphs.pop() as string;
      }
      if (!current) current = line;
      else if (/[a-z]-$/.test(current)) current = current.slice(0, -1) + line;
      else current += ` ${line}`;
    }
    flush();
  });
  return paragraphs.join('\n\n');
}

const SIGNIFICANT_STOPWORDS = new Set([
  'miss',
  'mrs',
  'from',
  'with',
  'that',
  'this',
  'dear',
  'about',
  'upon',
  'into',
  'concerning',
]);

function significantWords(s: string): string[] {
  return (s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !SIGNIFICANT_STOPWORDS.has(w));
}

/** Levenshtein distance, for tolerating single-character OCR errors in names. */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, substitution);
    }
    previous = row;
  }
  return previous[b.length];
}

function agreesWithContents(heading: string, title: string): boolean {
  const titleWords = significantWords(title);
  return significantWords(heading).some((word) =>
    titleWords.some((t) => t === word || (t.length >= 5 && editDistance(t, word) <= 1)),
  );
}

const LIFE_OF_FRANKLIN = /^\s*CHAPTER\s+I\s*$/;
const BACK_MATTER =
  /University\s+of\s+T[o0]r|DO\s+NOT\s+REMOVE|LOWE-MARTIN|Acme\s+Library|^\s*\d{9,}/;
const LETTER_HEADING_LIKE = /^\s*\S{1,6}[.,]\s+TO\s+[A-Z][A-Z.' -]+\d?\s*(\(.*\))?\s*$/;
const DATELINE_LAST_WORDS = new RegExp(`(?:${MONTH_PATTERN}) \\d{1,2},? [\\dIlO]{4}\\.?$`);
const MAX_DATELINE_LENGTH = 60;
const DATELINE_SEARCH_LINES = 4;

/** The date printed above the letter text, if the first few lines end in an exact date. */
function findDateline(lines: string[]): SmythDate | undefined {
  const firstLines = lines.filter((l) => l.trim()).slice(0, DATELINE_SEARCH_LINES);
  for (const raw of firstLines) {
    const line = squeeze(raw);
    if (line.length > MAX_DATELINE_LENGTH) continue;
    const match = DATELINE_LAST_WORDS.exec(line);
    if (match) return parseSmythDate(match[0]);
  }
  return undefined;
}

type Heading = { number: number; line: number; text: string };

function findHeadings(lines: string[], entries: ContentsEntry[], fromLine: number): Heading[] {
  if (entries.length === 0) return [];
  const byNumber = new Map(entries.map((e) => [e.number, e]));
  const first = entries[0].number;
  const last = entries[entries.length - 1].number;
  const headings: Heading[] = [];
  let previous = first - 1;

  for (let i = fromLine; i < lines.length; i++) {
    const match = ENTRY_START.exec(lines[i]);
    if (!match || !isCapsHeading(match[2]) || !/^[A-Z"'“‘]/.test(match[2])) continue;
    const number = Number(match[1]);
    if (number <= previous || number < first || number > last) continue;

    const entry = byNumber.get(number);
    const nextLine = lines.slice(i + 1, i + 4).find((l) => l.trim()) ?? '';
    const text = isCapsHeading(nextLine) ? `${match[2]} ${nextLine}` : match[2];
    // Numbers absent from the contents (an OCR miss there) must at least look like a letter.
    if (entry ? !agreesWithContents(text, entry.title) : !/^TO\s/.test(match[2])) continue;

    headings.push({ number, line: i, text: squeeze(match[2]) });
    previous = number;
  }
  return headings;
}

function titleCaseHeading(heading: string): string {
  return squeeze(heading.replace(/\(.*?\)/g, '').replace(/\d/g, ''))
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** Splits one volume's raw OCR into documents, in edition order. */
export function splitVolume(raw: string, volume: number): SmythDocument[] {
  const lines = raw.split('\n');
  const { entries, endLine } = readContents(lines);
  const headings = findHeadings(lines, entries, endLine + 1);
  const entryByNumber = new Map(entries.map((e) => [e.number, e]));
  const present = new Set(headings.map((h) => h.number));

  return headings.map((heading, index) => {
    const next = headings[index + 1];
    let body = lines.slice(heading.line + 1, next ? next.line : lines.length);
    const backMatter = body.findIndex((l) => BACK_MATTER.test(l) || LIFE_OF_FRANKLIN.test(l));
    const reachesLife = backMatter !== -1 && LIFE_OF_FRANKLIN.test(body[backMatter]);
    if (backMatter !== -1) body = body.slice(0, backMatter);

    const entry = entryByNumber.get(heading.number);
    const dateline = findDateline(body);
    const date = entry?.date?.precision === 'day' ? entry.date : (dateline ?? entry?.date);
    const text = cleanBody(body);

    const flags: SplitFlag[] = [];
    // A number between this heading and the next that the contents lists, or any skipped number.
    const followedByGap = next
      ? next.number !== heading.number + 1
      : entries.some((e) => e.number > heading.number && !present.has(e.number));
    if (followedByGap) flags.push('followed-by-gap');
    if (reachesLife) flags.push('unknown-end');
    if (body.some((l) => LETTER_HEADING_LIKE.test(l))) flags.push('swallowed-heading');
    if (entry?.date?.precision === 'day' && dateline && dateline.iso !== entry.date.iso) {
      flags.push('date-conflict');
    }

    const nextPage = entryByNumber.get(heading.number + 1)?.page;
    if (entry?.page !== undefined && nextPage !== undefined && nextPage >= entry.page) {
      const pageSpan = nextPage - entry.page + 1;
      const tooLong = text.length > pageSpan * MAX_CHARS_PER_PAGE;
      const tooShort = pageSpan > 2 && text.length < (pageSpan - 2) * MIN_CHARS_PER_PAGE;
      if (tooLong || tooShort) flags.push('implausible-length');
    }

    return {
      volume,
      number: heading.number,
      title: entry?.title ?? titleCaseHeading(heading.text),
      date,
      page: entry?.page,
      text,
      flags,
    };
  });
}
