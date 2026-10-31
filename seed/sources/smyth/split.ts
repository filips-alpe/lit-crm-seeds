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
  /** The contents table and the printed dateline independently gave this exact date. */
  dateConfirmed: boolean;
  /** Signed note lines with no recognisable mark: the signature went, the rest of the note may remain. */
  unmarkedNotes: number;
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
  const beforeDate = dateMatch
    ? row.slice(0, dateMatch.index)
    : row.replace(/[\s\d.,•·'‘’`:;v\-—]+$/, '');
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

const WRITINGS_HEAD = /THE\s+WRITINGS\s+OF\s+BENJ/;
/** Even pages end "[1744"; the rest of the line varies with the OCR. */
const BRACKETED_YEAR_AT_END = /\[\s*[1Il]\s*[7I]\s*[\dIlOo]\s*[\dIlOo]\S?\s*$/;
/** Odd pages: "1778] AURORA BOREALIS 209", also read as "1 78 1]", "I75o]", "•750]", "I755J", "1750". */
const YEAR_THEN_CAPS = /^\s*\W?[\dIl•][\dIlOoiS ]{2,6}[\]J}]?\s+[A-Z"'“‘(]/;
/** Printer's sheet mark at the foot of a page: "VOL. IX — L". */
const SHEET_MARK = /^\s*VOL\.?\s+[IVXLl1]+\s*[—–-]\s*[\dA-Za-z]{1,2}(?:\s+[\dA-Za-z]{1,2})?\s*$/;
const MAX_RUNNING_HEAD_LENGTH = 80;
/** A head the OCR broke over several lines opens with the year alone: "1777]". */
const YEAR_ONLY_HEAD = /^\s*\W?[\dIl•][\dIlOoiS ]{2,6}[\]J}]\s*$/;
/** An odd-page head that lost its year: "TO PHILIP SCHUYLER 447". */
const CAPS_TITLE_WITH_PAGE = /^\s*TO\s+[A-Z][A-Z .,'’-]*\s\d{1,3}\s*$/;
/** The same head broken over two lines: "TO EDWARD BANCROFT", then "141". */
const CAPS_TITLE_ALONE = /^\s*TO\s+[A-Z][A-Z .,'’-]*$/;
/** How far the rest of a broken head can trail its year, in non-blank lines. */
const BROKEN_HEAD_EXTRA_LINES = 2;
/** OCR often reads the note mark 2 as "a". */
const FOOTNOTE_START = /^\s*[1-9a*†‡§]\s+["“'‘(]?[A-Z]/;
/** Smyth signs his own notes "— ED."; a line with that signature is never Franklin's text. */
const EDITOR_SIGNATURE = /[—–-]\s*E[Ddn](?:[.,\-'"’”*\d]|\s*$)|^\s*E[Ddn][.,]\s*$/;
/** Franklin signs his own notes "— F."; those are his words and stay. */
const FRANKLIN_SIGNATURE = /[—–-]\s*F\.\s*$/;
/** The signature's dash left at the end of the line above a bare "ED.". */
const TRAILING_DASH = /[—–-]\s*$/;
/**
 * The first line of a signed note, with the mark as OCR left it: "1 doubled",
 * "iSee p. 62", "i William Lee", "iln A. P. S.", "UnA. P. S.". Looser than
 * FOOTNOTE_START because a signature below already says a note is present.
 */
const SIGNED_NOTE_START =
  /^\s*(?:[1-9*†‡§]\s+\S|a\s+["“'‘(]?[A-Z]|[1il!]\s?["“'‘(]?[A-Z]|[iU1]n\s?[A-Z])/;

function isRunningHead(line: string): boolean {
  if (line.trim().length > MAX_RUNNING_HEAD_LENGTH) return false;
  if (WRITINGS_HEAD.test(line)) return true;
  if (/[a-z]{3}/.test(line)) return false;
  return (
    BRACKETED_YEAR_AT_END.test(line) || YEAR_THEN_CAPS.test(line) || CAPS_TITLE_WITH_PAGE.test(line)
  );
}

function nextLineIsPageNumber(lines: string[], index: number): boolean {
  const next = lines.slice(index + 1, index + 4).find((l) => l.trim());
  return next !== undefined && /^\s*\d{1,3}\s*$/.test(next);
}

/** Splits lines into pages at running heads, discarding the heads and sheet marks. */
function splitPages(lines: string[]): string[][] {
  const pages: string[][] = [[]];
  let brokenHeadLinesLeft = 0;
  for (const [index, line] of lines.entries()) {
    if (brokenHeadLinesLeft > 0 && line.trim()) {
      brokenHeadLinesLeft = /[a-z]{3}/.test(line) ? 0 : brokenHeadLinesLeft - 1;
      if (brokenHeadLinesLeft > 0 || !/[a-z]{3}/.test(line)) continue;
    }
    if (YEAR_ONLY_HEAD.test(line)) {
      pages.push([]);
      brokenHeadLinesLeft = BROKEN_HEAD_EXTRA_LINES;
    } else if (CAPS_TITLE_ALONE.test(line) && nextLineIsPageNumber(lines, index)) {
      pages.push([]);
      brokenHeadLinesLeft = 1;
    } else if (isRunningHead(line)) pages.push([]);
    else if (!SHEET_MARK.test(line)) pages[pages.length - 1].push(line);
  }
  return pages;
}

/** Groups a page's lines into paragraphs, which are separated by blank lines. */
function pageParagraphs(page: string[]): string[][] {
  const paragraphs: string[][] = [[]];
  for (const line of page) {
    if (line.trim()) paragraphs[paragraphs.length - 1].push(line);
    else if (paragraphs[paragraphs.length - 1].length > 0) paragraphs.push([]);
  }
  return paragraphs.filter((p) => p.length > 0);
}

/**
 * Removes Smyth's notes from a paragraph. A signed line ends a note, which
 * starts at the nearest marked line above it. With no recognisable mark, only
 * the signed line goes: the lines above may well be the letter, so an unsigned
 * remnant of a note is the price of never deleting Franklin's text.
 */
function stripSignedNotes(paragraph: string[]): { kept: string[]; unmarked: number } {
  const kept: string[] = [];
  let unmarked = 0;
  for (const line of paragraph) {
    if (!EDITOR_SIGNATURE.test(line)) {
      kept.push(line);
      continue;
    }
    if (SIGNED_NOTE_START.test(line)) continue; // a whole note on one line
    let noteStart = kept.length - 1;
    while (noteStart >= 0 && !SIGNED_NOTE_START.test(kept[noteStart])) noteStart--;
    if (noteStart >= 0) {
      kept.length = noteStart;
    } else {
      unmarked++;
      if (kept.length > 0 && TRAILING_DASH.test(kept[kept.length - 1])) kept.pop();
    }
  }
  return { kept, unmarked };
}

/**
 * A note's mark must also appear in the page's text ("Brillante.1"). Franklin
 * capitalises his nouns, so "a Settlement of all my Affairs" or "3 Pounds more"
 * can open a real paragraph, and the mark is what tells them apart. OCR "a" is
 * a misread 2.
 */
function hasMarkInText(note: string[], text: string[][]): boolean {
  const marker = note[0].trim()[0];
  const mark = marker === 'a' ? '2' : marker;
  if (!/[1-9]/.test(mark)) return text.some((p) => p.some((line) => line.includes(mark)));
  // Attached to a word, or set apart by OCR at the end of a line ("and 1").
  const inText = new RegExp(`[A-Za-z.,;:!?'"’”)\\]]${mark}(?=\\s|$)|\\s${mark}\\s*$`);
  return text.some((p) => p.some((line) => inText.test(line)));
}

/**
 * Removes the notes at the foot of a page. Only paragraphs recognisable as
 * notes go: when in doubt the paragraph stays, since a stray note in the text
 * is far better than a lost passage.
 */
function stripFootnotes(
  page: string[],
  context: string[] = [],
): { paragraphs: string[][]; unmarked: number } {
  const stripped = pageParagraphs(page).map(stripSignedNotes);
  const unmarked = stripped.reduce((total, p) => total + p.unmarked, 0);
  const paragraphs = stripped.map((p) => p.kept).filter((p) => p.length > 0);
  while (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1];
    const textAbove = [...paragraphs.slice(0, -1), context];
    if (!FOOTNOTE_START.test(last[0]) || !hasMarkInText(last, textAbove)) break;
    if (FRANKLIN_SIGNATURE.test(last[last.length - 1])) break;
    paragraphs.pop();
  }
  return { paragraphs, unmarked };
}

/** Turns raw body lines into reading text: no page furniture, joined lines, one blank between paragraphs. */
export function cleanBody(lines: string[], firstPageContext: string[] = []): string {
  return cleanBodyDetail(lines, firstPageContext).text;
}

/**
 * Left as the last paragraph of a document: a page number or OCR speck ("585",
 * "CJ", "V,", "' 1", ".."), or the next letter's salutation where OCR printed
 * it above that letter's heading. A letter followed by a full stop may be a
 * signature ("F."), so it stays.
 */
const TRAILING_FURNITURE =
  /^(?:[^A-Za-z0-9]*(?:\d{1,3}|[A-Z]{1,2},?|[a-z])?[^A-Za-z0-9.]*|(?:DEAR )?SIR[,:]?)$/;
/** A speck with no letters or digits at the top of a document: "*", "•»". */
const LEADING_SPECK = /^[^A-Za-z0-9]{1,4}$/;

function cleanBodyDetail(
  lines: string[],
  firstPageContext: string[],
): { text: string; unmarkedNotes: number } {
  const paragraphs: string[] = [];

  const clean = (raw: string) =>
    squeeze(raw).replace(/([A-Za-z.,;:!?'"’”)\]])[1-9](?=\s|$)/g, '$1');

  const joinLine = (text: string, line: string) =>
    /[a-z]-$/.test(text) ? text.slice(0, -1) + line : `${text} ${line}`;

  const pages = splitPages(lines).map((page, index) =>
    stripFootnotes(page, index === 0 ? firstPageContext : []),
  );
  for (const { paragraphs: page } of pages) {
    page.forEach((paragraph, index) => {
      const text = paragraph.map(clean).reduce(joinLine);
      const previous = paragraphs[paragraphs.length - 1];
      // A paragraph left open at the foot of a page continues at the top of the next.
      if (index === 0 && previous !== undefined && !/[.!?:;"”]$/.test(previous)) {
        paragraphs[paragraphs.length - 1] = joinLine(previous, text);
      } else {
        paragraphs.push(text);
      }
    });
  }
  while (paragraphs.length > 1 && TRAILING_FURNITURE.test(paragraphs[paragraphs.length - 1])) {
    paragraphs.pop();
  }
  while (paragraphs.length > 1 && LEADING_SPECK.test(paragraphs[0])) paragraphs.shift();
  return {
    text: paragraphs.join('\n\n'),
    unmarkedNotes: pages.reduce((total, page) => total + page.unmarked, 0),
  };
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

/** Upper bound when looking back for the top of a page. */
const MAX_LINES_PER_PAGE = 60;
const LIFE_OF_FRANKLIN = /^\s*CHAPTER\s+I\s*$/;
const BACK_MATTER =
  /^\s*APPENDIX\s*$|University\s+of\s+T[o0]r|DO\s+NOT\s+REMOVE|LOWE-MARTIN|Acme\s+Library|^\s*\d{9,}/;
const LETTER_HEADING_LIKE = /^\s*\S{1,6}[.,]\s+TO\s+[A-Z][A-Z.' -]+\d?\s*(\(.*\))?\s*$/;
const DATELINE_LAST_WORDS = new RegExp(`(?:${MONTH_PATTERN}) \\d{1,2},? [\\dIlO]{4}\\.?$`);
const MAX_DATELINE_LENGTH = 60;
const DATELINE_SEARCH_LINES = 4;

/** Smyth's source mark, as in "(A. P. S.)" or "(L. c.)". */
const ARCHIVE_MARK = /\([A-Za-z][A-Za-z. ]{0,14}\)/;

const HEADING_CONTINUATION = /^\s*(?:AND|OF|IN|FOR|ON|AT|BY)\s/;

/**
 * Drops the end of a wrapped heading from the top of a document: capitals, and
 * either a source mark, a connecting word, a hyphen carried over, or only words
 * from the document's title. A salutation ends in punctuation, so it stays.
 */
function dropHeadingRemainder(body: string[], title: string): string[] {
  const titleWords = new Set(significantWords(title));
  let rest = body;
  let carriedHyphen = false;
  for (;;) {
    const first = rest.findIndex((l) => l.trim());
    if (first === -1) return rest;
    const line = rest[first];
    const hasMark = ARCHIVE_MARK.test(line);
    if (
      !isCapsHeading(line) ||
      (!hasMark && (/\d/.test(line.replace(/\d\s*$/, '')) || /[,:;]\s*$/.test(line)))
    ) {
      return rest;
    }
    const words = significantWords(line);
    const onlyTitleWords = words.length > 0 && words.every((w) => titleWords.has(w));
    if (!hasMark && !carriedHyphen && !HEADING_CONTINUATION.test(line) && !onlyTitleWords) {
      return rest;
    }
    carriedHyphen = /-\s*$/.test(line);
    rest = rest.slice(first + 1);
  }
}

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
    // The contents table can stop short of the volume's real end (vol. 7 lists to 1064 but
    // prints to 1071), so the next number past it still ends the document before it.
    const pastContents = number > last;
    if (number <= previous || number < first || (pastContents && number !== previous + 1)) continue;

    const entry = byNumber.get(number);
    const nextLine = lines.slice(i + 1, i + 4).find((l) => l.trim()) ?? '';
    const text = isCapsHeading(nextLine) ? `${match[2]} ${nextLine}` : match[2];
    // Numbers absent from the contents (an OCR miss there) must at least look like a letter.
    const accepted = entry
      ? agreesWithContents(text, entry.title)
      : pastContents || /^TO\s/.test(match[2]);
    if (!accepted) continue;

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

/**
 * The heading and whatever shares its page: a note at the foot of a document's
 * first page can belong to a mark in either ("TO JAMES READ1").
 */
function printedAbove(lines: string[], headingLine: number): string[] {
  let start = headingLine;
  while (
    start > 0 &&
    headingLine - start < MAX_LINES_PER_PAGE &&
    !isRunningHead(lines[start - 1])
  ) {
    start--;
  }
  return lines.slice(start, headingLine + 1);
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
    body = dropHeadingRemainder(body, entry?.title ?? titleCaseHeading(heading.text));
    const dateline = findDateline(body);
    const date = entry?.date?.precision === 'day' ? entry.date : (dateline ?? entry?.date);
    const { text, unmarkedNotes } = cleanBodyDetail(body, printedAbove(lines, heading.line));

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

    const dateConfirmed =
      entry?.date?.precision === 'day' && dateline !== undefined && dateline.iso === entry.date.iso;

    return {
      dateConfirmed,
      unmarkedNotes,
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
