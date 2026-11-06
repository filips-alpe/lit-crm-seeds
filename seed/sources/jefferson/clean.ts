/**
 * Mechanical OCR cleanup for one record's span of raw lines.
 *
 * The wording is never touched. The only changes, each logged as a
 * correction against its raw line number, are:
 *   - furniture: running heads, folios and signature marks are removed;
 *   - page-join: a paragraph split by a page break is joined back together
 *     (the block before the break does not end a sentence, or the block after
 *     it starts lower-case);
 *   - footnote: a footnote printed at the foot of a page that interrupts a
 *     paragraph is moved to follow the paragraph it interrupted;
 *   - noise: a short block that is mostly not words — the OCR of an
 *     illustration plate, a page printed sideways or a library stamp — is
 *     dropped (at least 30% of its tokens are garbled and under half of its
 *     words occur five or more times elsewhere in the book);
 *   - hyphenation: a word broken at a line end ("discon-" / "tinued") is
 *     rejoined. The hyphen is kept when the hyphenated form is the one the
 *     book itself prints mid-line more often ("twenty-five").
 *
 * Line breaks inside a paragraph are the printer's column width, not
 * wording: they become single spaces. Paragraphs are separated by a blank line.
 */
import type { FurnitureMatch } from './pages';

export type CorrectionKind = 'furniture' | 'noise' | 'page-join' | 'footnote' | 'hyphenation';

export type Correction = {
  /** 1-based raw line number the correction applies to. */
  line: number;
  kind: CorrectionKind;
  raw: string;
  result: string;
};

/** Hyphenated vs closed spellings the book prints mid-line, for the line-end rule. */
export type HyphenLexicon = { hyphenated: Map<string, number>; closed: Map<string, number> };

const WORD = /[A-Za-z]+(?:-[A-Za-z]+)*/g;

export function buildHyphenLexicon(lines: string[]): HyphenLexicon {
  const hyphenated = new Map<string, number>();
  const closed = new Map<string, number>();
  for (const line of lines) {
    // The last token of a line may be a line-end break; only count the rest.
    const body = line.replace(/\S+\s*$/, '');
    for (const w of body.match(WORD) ?? []) {
      const lw = w.toLowerCase();
      if (lw.includes('-')) {
        hyphenated.set(lw, (hyphenated.get(lw) ?? 0) + 1);
        closed.set(lw.replace(/-/g, ''), closed.get(lw.replace(/-/g, '')) ?? 0);
      } else {
        closed.set(lw, (closed.get(lw) ?? 0) + 1);
      }
    }
  }
  return { hyphenated, closed };
}

/**
 * Joins `left` (ending in a hyphen) with `right`. Returns the joined text and
 * whether the hyphen was kept.
 */
export function joinHyphenated(
  left: string,
  right: string,
  lexicon: HyphenLexicon,
): { text: string; keptHyphen: boolean } {
  const head = /([A-Za-z]+)-$/.exec(left)?.[1] ?? '';
  const tail = /^([A-Za-z]+)/.exec(right)?.[1] ?? '';
  const key = `${head}-${tail}`.toLowerCase();
  const asHyphen = lexicon.hyphenated.get(key) ?? 0;
  const asClosed = lexicon.closed.get(`${head}${tail}`.toLowerCase()) ?? 0;
  const keep = asHyphen > 0 && asHyphen >= asClosed;
  return { text: keep ? left + right : left.slice(0, -1) + right, keptHyphen: keep };
}

const LINE_END_HYPHEN = /[A-Za-z]-$/;
const STARTS_LOWER = /^[a-z]/;
const ENDS_SENTENCE = /[.!?”"’'):\]]$/;
/** "1 The opinions…", "* See…", "† …": a footnote at the foot of a page. */
const FOOTNOTE_START = /^(?:\d{1,2}|[*†‡§¹²³])\s+\S/;

type Line = { n: number; text: string };

/** How often a lower-cased word occurs in the book (both spellings counted). */
function frequency(word: string, lexicon: HyphenLexicon): number {
  return (lexicon.closed.get(word) ?? 0) + (lexicon.hyphenated.get(word) ?? 0);
}

/** A token no printed word looks like: mixed case inside, letters fused with digits, stray symbols. */
const GARBLED = /[a-z][A-Z]|[A-Za-z]\d|\d[A-Za-z]|[^\p{L}\p{N}\s.,;:'’"“”()\-—&?!*†‡]/u;

export function isNoise(lines: Line[], lexicon: HyphenLexicon): boolean {
  if (lines.length > 12) return false;
  const tokens = lines.flatMap((l) => l.text.split(/\s+/)).filter((t) => t.length >= 2);
  const words = lines.flatMap((l) => l.text.match(/[A-Za-z]{2,}/g) ?? []);
  if (words.length < 2) return false;
  const garbled = tokens.filter((t) => GARBLED.test(t)).length;
  const common = words.filter((w) => frequency(w.toLowerCase(), lexicon) >= 5).length;
  // Both tests: rare words alone are not noise (plant lists, Latin), and
  // a garbled dateline of common words ("MoNTICELLO, May r2") is text.
  return tokens.length >= 3 && garbled / tokens.length >= 0.3 && common / words.length < 0.5;
}
type Block = { lines: Line[]; afterBreak: boolean; footnote: boolean };

/** Where an output paragraph starts (character offset) and its first raw line (1-based). */
export type ParagraphStart = { offset: number; line: number };

export type CleanResult = { text: string; corrections: Correction[]; paragraphs: ParagraphStart[] };

/**
 * Cleans raw lines [from, to) (0-based). `furniture` is the page map's
 * furniture index (0-based line → match).
 */
export function cleanSpan(
  lines: string[],
  from: number,
  to: number,
  furniture: Map<number, FurnitureMatch>,
  lexicon: HyphenLexicon,
): CleanResult {
  const corrections: Correction[] = [];
  const blocks: Block[] = [];
  let current: Line[] = [];
  let sawBreak = false;
  const flush = () => {
    if (current.length === 0) return;
    blocks.push({ lines: current, afterBreak: sawBreak, footnote: false });
    current = [];
    sawBreak = false;
  };
  for (let i = from; i < to; i++) {
    const text = lines[i].trim();
    if (furniture.has(i)) {
      flush();
      sawBreak = true;
      corrections.push({ line: i + 1, kind: 'furniture', raw: text, result: '' });
      continue;
    }
    if (text === '') {
      flush();
      continue;
    }
    current.push({ n: i + 1, text });
  }
  flush();

  // Plate and stamp OCR: drop short blocks whose words the book never uses.
  for (let k = blocks.length - 1; k >= 0; k--) {
    if (isNoise(blocks[k].lines, lexicon)) {
      for (const l of blocks[k].lines) {
        corrections.push({ line: l.n, kind: 'noise', raw: l.text, result: '' });
      }
      // The block's place still separates what came before and after it.
      if (blocks[k + 1]) blocks[k + 1].afterBreak ||= true;
      blocks.splice(k, 1);
    }
  }

  // A short block that starts with a footnote mark and is followed by a page
  // break is a footnote.
  for (let k = 0; k < blocks.length - 1; k++) {
    const b = blocks[k];
    if (blocks[k + 1].afterBreak && b.lines.length <= 8 && FOOTNOTE_START.test(b.lines[0].text)) {
      b.footnote = true;
    }
  }

  // Rebuild paragraphs: body blocks split by a page break are joined; the
  // footnotes that sat between them follow the joined paragraph.
  const paragraphs: { lines: Line[]; notes: Block[] }[] = [];
  let pendingNotes: Block[] = [];
  for (const b of blocks) {
    if (b.footnote) {
      pendingNotes.push(b);
      continue;
    }
    const prev = paragraphs.at(-1);
    const prevLast = prev?.lines.at(-1)?.text ?? '';
    const breakBefore = b.afterBreak || pendingNotes.length > 0;
    const continues =
      prev &&
      breakBefore &&
      (STARTS_LOWER.test(b.lines[0].text) ||
        LINE_END_HYPHEN.test(prevLast) ||
        !ENDS_SENTENCE.test(prevLast));
    if (continues) {
      corrections.push({
        line: b.lines[0].n,
        kind: 'page-join',
        raw: b.lines[0].text,
        result: 'joined to the paragraph before the page break',
      });
      prev.lines.push(...b.lines);
      for (const note of pendingNotes) {
        corrections.push({
          line: note.lines[0].n,
          kind: 'footnote',
          raw: note.lines[0].text,
          result: 'moved after the paragraph it interrupts',
        });
      }
      prev.notes.push(...pendingNotes);
    } else {
      for (const note of pendingNotes) paragraphs.push({ lines: note.lines, notes: [] });
      paragraphs.push({ lines: [...b.lines], notes: [] });
    }
    pendingNotes = [];
  }
  for (const note of pendingNotes) paragraphs.push({ lines: note.lines, notes: [] });

  const joinLines = (ls: Line[]): string => {
    let out = '';
    for (let k = 0; k < ls.length; k++) {
      const { text } = ls[k];
      if (k === 0) {
        out = text;
        continue;
      }
      if (LINE_END_HYPHEN.test(out) && STARTS_LOWER.test(text)) {
        const { text: joined, keptHyphen } = joinHyphenated(out, text, lexicon);
        const head = /\S+$/.exec(out)?.[0] ?? '';
        const tail = /^\S+/.exec(text)?.[0] ?? '';
        corrections.push({
          line: ls[k - 1].n,
          kind: 'hyphenation',
          raw: `${head}|${tail}`,
          result: keptHyphen ? `${head}${tail}` : `${head.slice(0, -1)}${tail}`,
        });
        out = joined;
      } else {
        out = `${out} ${text}`;
      }
    }
    return out;
  };

  // Each output paragraph remembers its first raw line, so a character offset
  // can be traced back to a page.
  const parts = paragraphs.flatMap((p) => [p.lines, ...p.notes.map((note) => note.lines)]);
  const starts: ParagraphStart[] = [];
  let text = '';
  for (const ls of parts) {
    if (text) text += '\n\n';
    starts.push({ offset: text.length, line: ls[0].n });
    text += joinLines(ls);
  }
  corrections.sort((a, b) => a.line - b.line);
  return { text, corrections, paragraphs: starts };
}
