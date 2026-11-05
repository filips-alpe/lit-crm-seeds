/**
 * Page furniture and page numbers in the Lipscomb & Bergh OCR.
 *
 * The scan prints three kinds of furniture, all recognised line by line:
 *   - running heads: "2 Jefferson’s Works" on even pages, "Autobiography 3"
 *     (or "The Anas", "Notes on Virginia", "Appendix", "Parliamentary Manual")
 *     on odd pages — both at the top of the page;
 *   - folios: "(265)" at the foot of a page that opens a section;
 *   - signature marks: "VOL. I—12" at the foot of every sixteenth page.
 *
 * Running heads and folios carry the printed page number, so they double as
 * the page map: every other line is assigned the page of the nearest mark.
 */

export type Furniture = 'running-head' | 'folio' | 'signature';

/** Section names the odd-page running heads use (OCR'd with some noise). */
const ODD_HEADS = [
  'Autobiography',
  'Appendix',
  'The Anas',
  'Notes on Virginia',
  'Parliamentary Manual',
  'Impeachment',
  'The University of Virginia',
  'Special Introduction',
];

/** Digits the OCR misreads as letters in page numbers ("IIO" = 110, "3o" = 30). */
export function parsePageNumber(token: string): number | null {
  const mapped = token.replace(/[IlL|]/g, '1').replace(/[Oo]/g, '0');
  if (!/^\d{1,3}$/.test(mapped)) return null;
  const n = Number(mapped);
  return n > 0 ? n : null;
}

const EVEN_HEAD = /^\s*(\S{1,4})\s+Jefferson['’]s\s+Works\.?\s*$/;
const ODD_HEAD = new RegExp(
  `^\\s*(?:${ODD_HEADS.map((h) => h.replace(/ /g, '\\s+')).join('|')})\\.?\\s+(\\S{1,4})\\s*$`,
);
/** Front-matter heads carry roman page numbers: "viii Special Introduction", "Contents xlii". */
const ROMAN_HEAD = new RegExp(
  `^\\s*(?:[xvil]{1,6}\\.?\\s+(?:${[...ODD_HEADS, 'Contents'].join('|')})|(?:${[...ODD_HEADS, 'Contents'].join('|')})\\s+[xvil]{1,6})\\.?\\s*$`,
);
const FOLIO = /^\s*\((\d{1,3})\)\s*$/;
const ROMAN_FOLIO = /^\s*\([xvil]{1,6}\)\s*$/;
// "VOL. I—12", "VOL, I.—~9 : 1", "VOL. 11—19", "MOL. I.—12", "VOL. I11—20", "VOL. I—I (x)"
const SIGNATURE = /^\s*[VM]OL[.,]?\s*[IL1]{1,3}[.,]?\s*[—–-]+.{0,12}$/;

export type FurnitureMatch = { kind: Furniture; page: number | null; at: 'top' | 'bottom' };

export function classifyFurniture(line: string): FurnitureMatch | null {
  let m = EVEN_HEAD.exec(line) ?? ODD_HEAD.exec(line);
  if (m) return { kind: 'running-head', page: parsePageNumber(m[1]), at: 'top' };
  if (ROMAN_HEAD.test(line)) return { kind: 'running-head', page: null, at: 'top' };
  m = FOLIO.exec(line);
  if (m) return { kind: 'folio', page: Number(m[1]), at: 'bottom' };
  if (ROMAN_FOLIO.test(line)) return { kind: 'folio', page: null, at: 'bottom' };
  if (SIGNATURE.test(line)) return { kind: 'signature', page: null, at: 'bottom' };
  return null;
}

/** Internet Archive's page_numbers.json: printed page label per scanned leaf. */
export type IaPageNumbers = { pages: { leafNum: number; pageNumber: string }[] };

/**
 * (volume, printed page) → 0-based position in the scan, as the IA book
 * reader addresses it (`/page/n<index>`). Printed numbers restart with
 * volume II; the first leaf whose number drops by more than 50 opens it.
 */
export function leafIndex(numbers: IaPageNumbers): Map<string, number> {
  const out = new Map<string, number>();
  let vol = 1;
  let prev = 0;
  numbers.pages.forEach((p, index) => {
    if (!/^\d+$/.test(p.pageNumber)) return;
    const n = Number(p.pageNumber);
    if (vol === 1 && n < prev - 50) vol = 2;
    prev = n;
    const key = `${vol}:${n}`;
    if (!out.has(key)) out.set(key, index);
  });
  return out;
}

export type PageMap = {
  /** Printed volume (1 or 2) of each raw line, by 0-based line index. */
  volume: Uint8Array;
  /** Printed page of each raw line, 0 where it could not be recovered. */
  page: Uint16Array;
  /** Furniture found per 0-based line index. */
  furniture: Map<number, FurnitureMatch>;
};

/**
 * Builds the page map. `volumeTwoStart` is the 0-based line of the second
 * title page; lines from there on belong to volume II.
 *
 * Page marks are checked for plausibility against the previous accepted mark
 * of the same volume: a number that jumps more than 12 pages either way is an
 * OCR misread and is ignored (the line is still removed as furniture).
 */
export function buildPageMap(lines: string[], volumeTwoStart: number): PageMap {
  const volume = new Uint8Array(lines.length);
  const page = new Uint16Array(lines.length);
  const furniture = new Map<number, FurnitureMatch>();
  type Mark = { index: number; page: number; at: 'top' | 'bottom' };
  const marks: Mark[] = [];
  let last = 0;
  for (let i = 0; i < lines.length; i++) {
    if (i === volumeTwoStart) last = 0;
    volume[i] = i < volumeTwoStart ? 1 : 2;
    const f = classifyFurniture(lines[i]);
    if (!f) continue;
    furniture.set(i, f);
    if (f.page === null) continue;
    if (last !== 0 && Math.abs(f.page - last) > 12) continue;
    marks.push({ index: i, page: f.page, at: f.at });
    last = f.page;
  }
  // Each stretch between two marks takes the page of the top mark that opens
  // it, else of the folio that closes it, else the page after a folio.
  for (let k = 0; k <= marks.length; k++) {
    const a = marks[k - 1];
    const b = marks[k];
    const from = a ? a.index + 1 : 0;
    const to = b ? b.index : lines.length;
    const sameVolume = a && b ? volume[a.index] === volume[b.index] : true;
    let p = 0;
    if (a?.at === 'top') p = a.page;
    else if (b?.at === 'bottom' && sameVolume) p = b.page;
    else if (a?.at === 'bottom') p = a.page + 1;
    for (let i = from; i < to; i++) {
      // No mark carries across the volume break: the new volume's front
      // matter has no recoverable page until its first mark.
      const crosses = (a && volume[i] !== volume[a.index]) || (b && volume[i] !== volume[b.index]);
      page[i] = crosses && !(a?.at === 'top' && volume[i] === volume[a.index]) ? 0 : p;
    }
    if (b) page[b.index] = b.page;
  }
  return { volume, page, furniture };
}
