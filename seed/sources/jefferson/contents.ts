/**
 * The contents map of the scan: where each record starts.
 *
 * The item holds volumes I and II of the Lipscomb & Bergh edition. Each
 * entry names the exact raw line that opens it (`anchor`, matched after
 * trimming, searched forward from the previous entry so repeated headings
 * resolve in order). A record runs from its anchor to the next entry's
 * anchor. Entries of kind `skip` mark material that is not a record: title
 * pages, contents lists, illustration lists and the library card at the end.
 *
 * Three entries are containers that split further by their own headings:
 * the Anas by dated memorandum, Notes on Virginia by Query, and the
 * Parliamentary Manual by Section (see split.ts).
 *
 * Anchors were taken from the cached OCR (raw.txt). Where the OCR garbles a
 * heading the anchor is the garbled line, and `ocr` records what it reads as.
 */

export type DocumentTypeCode =
  | 'memoir'
  | 'memorandum'
  | 'epistle'
  | 'paper'
  | 'query'
  | 'rule'
  | 'editorial';

export type ContentsEntry = {
  key: string;
  anchor: string | RegExp;
  /** What a garbled anchor line actually reads in the printed book. */
  ocr?: string;
} & (
  | { kind: 'skip' }
  | {
      kind: 'record';
      type: DocumentTypeCode;
      title: string;
      /** Who wrote it; null for editorial matter whose author the scan does not name. */
      author: string | null;
      recipient?: string;
      /** Date of writing (ISO). `approx` when only the year or season is known. */
      date: string;
      approx?: boolean;
      /** Where the edition puts it: "Autobiography", "Appendix to the Autobiography (Note A)", … */
      part: string;
    }
  | { kind: 'anas' | 'queries' | 'manual' }
);

const TJ = 'Thomas Jefferson';

export const CONTENTS: ContentsEntry[] = [
  { key: 'front-matter', kind: 'skip', anchor: /^pus 1$/ },
  {
    key: 'special-introduction',
    kind: 'record',
    anchor: 'SPECIAL INTRODUCTION.',
    type: 'editorial',
    title: 'Special Introduction',
    author: null,
    date: '1903-01-01',
    approx: true,
    part: 'Front matter, vol. I',
  },
  {
    key: 'lincoln-tribute',
    kind: 'record',
    anchor: "LINCOLN'S TRIBUTE TO JEFFERSON.",
    type: 'epistle',
    title: "Lincoln's Tribute to Jefferson: letter to H. L. Pierce and others",
    author: 'Abraham Lincoln',
    recipient: 'H. L. Pierce',
    date: '1859-04-06',
    part: 'Front matter, vol. I',
  },
  { key: 'contents-vol-1', kind: 'skip', anchor: 'CONTENTS' },
  {
    key: 'autobiography-introductory-note',
    kind: 'record',
    anchor: 'INTRODUCTORY NOTE.',
    type: 'editorial',
    title: 'Introductory Note to the Autobiography',
    author: null,
    date: '1903-01-01',
    approx: true,
    part: 'Autobiography',
  },
  {
    key: 'autobiography-1',
    kind: 'record',
    anchor: 'AUTOBIOGRAPHY, WITH APPENDIX.',
    type: 'memoir',
    title: 'Autobiography, part 1: to the Declaration of Independence (1743–1776)',
    author: TJ,
    date: '1821-01-06',
    part: 'Autobiography',
  },
  {
    key: 'declaration-draft',
    kind: 'record',
    anchor: 'A Declaration by the Representatives of the United',
    type: 'paper',
    title: 'The Declaration of Independence as originally reported',
    author: TJ,
    date: '1776-06-28',
    part: 'Autobiography',
  },
  {
    key: 'autobiography-2',
    kind: 'record',
    anchor: 'The Declaration thus signed on the 4th, on paper,',
    type: 'memoir',
    title: 'Autobiography, part 2: Congress, Virginia and the mission to France (1776–1785)',
    author: TJ,
    date: '1821-01-06',
    part: 'Autobiography',
  },
  {
    key: 'barbary-proposals',
    kind: 'record',
    anchor: '"Proposals for concerted operation among the',
    type: 'paper',
    title:
      'Proposals for concerted operation among the powers at war with the piratical States of Barbary',
    author: TJ,
    date: '1786-07-01',
    approx: true,
    part: 'Autobiography',
  },
  {
    key: 'autobiography-3',
    kind: 'record',
    anchor: 'Spain had just concluded a treaty with Algiers,',
    type: 'memoir',
    title: 'Autobiography, part 3: France, the Barbary powers and Holland (1785–1786)',
    author: TJ,
    date: '1821-01-06',
    part: 'Autobiography',
  },
  {
    key: 'vergennes-extract',
    kind: 'record',
    anchor: '“Extrait de la depéche de Monsieur le Comte de',
    type: 'epistle',
    title: 'Extract from the despatch of the Count de Vergennes to the Marquis de Verac',
    author: 'Count de Vergennes',
    recipient: 'Marquis de Verac',
    date: '1786-03-01',
    part: 'Autobiography',
  },
  {
    key: 'autobiography-4',
    kind: 'record',
    anchor: 'This letter was communicated by the Patriots to',
    type: 'memoir',
    title: 'Autobiography, part 4: the French Revolution and the return home (1786–1790)',
    author: TJ,
    date: '1821-01-06',
    part: 'Autobiography',
  },
  { key: 'appendix-heading', kind: 'skip', anchor: 'APPENDIX.' },
  {
    key: 'note-a-saunderson',
    kind: 'record',
    anchor: '[Note A.]',
    type: 'epistle',
    title: 'Letter to John Saunderson',
    author: TJ,
    recipient: 'John Saunderson',
    date: '1820-08-31',
    part: 'Appendix to the Autobiography (Note A)',
  },
  {
    key: 'wythe-notes',
    kind: 'record',
    anchor: 'NOTES FOR THE BIOGRAPHY OF GEORGE WYTHE.',
    type: 'memorandum',
    title: 'Notes for the Biography of George Wythe',
    author: TJ,
    date: '1820-08-31',
    part: 'Appendix to the Autobiography (Note A)',
  },
  {
    key: 'note-b-wells',
    kind: 'record',
    anchor: '[Note B.]',
    type: 'epistle',
    title: 'Letter to Samuel A. Wells',
    author: TJ,
    recipient: 'Samuel A. Wells',
    date: '1819-05-12',
    part: 'Appendix to the Autobiography (Note B)',
  },
  {
    key: 'note-c-instructions',
    kind: 'record',
    anchor: '[Nore C.]',
    ocr: '[Note C.]',
    type: 'memorandum',
    title: 'On the instructions given to the first delegation of Virginia to Congress, August 1774',
    author: TJ,
    date: '1774-08-01',
    approx: true,
    part: 'Appendix to the Autobiography (Note C)',
  },
  {
    key: 'note-d-summary-view',
    kind: 'record',
    anchor: '[Note D.]',
    type: 'paper',
    title:
      'Instructions for the Deputies appointed to meet in General Congress on the part of Virginia',
    author: TJ,
    date: '1774-08-01',
    approx: true,
    part: 'Appendix to the Autobiography (Note D)',
  },
  {
    key: 'note-e-wythe-letter',
    kind: 'record',
    anchor: '[Nore E.]',
    ocr: '[Note E.]',
    type: 'epistle',
    title: 'Letter to George Wythe',
    author: TJ,
    recipient: 'George Wythe',
    date: '1778-11-01',
    part: 'Appendix to the Autobiography (Note E)',
  },
  {
    key: 'crimes-bill',
    kind: 'record',
    anchor: 'A Bill for proportioning Crimes and Punishments, in',
    type: 'paper',
    title: 'A Bill for proportioning Crimes and Punishments in cases heretofore Capital',
    author: TJ,
    date: '1778-11-01',
    part: 'Appendix to the Autobiography (Note E)',
  },
  {
    key: 'note-f-money-unit',
    kind: 'record',
    anchor: '[NOTE FJ',
    ocr: '[NOTE F.]',
    type: 'paper',
    title: 'Notes on the Establishment of a Money Unit and of a Coinage for the United States',
    author: TJ,
    date: '1784-04-01',
    approx: true,
    part: 'Appendix to the Autobiography (Note F)',
  },
  {
    key: 'money-unit-supplementary',
    kind: 'record',
    anchor: 'Supplementary Explanations.',
    type: 'paper',
    title: 'Supplementary Explanations on the Money Unit',
    author: TJ,
    date: '1784-04-01',
    approx: true,
    part: 'Appendix to the Autobiography (Note F)',
  },
  {
    key: 'note-g-summary',
    kind: 'record',
    anchor: '[Nore G.]',
    ocr: '[Note G.]',
    type: 'memorandum',
    title: "Thomas Jefferson's Summary of his own Achievements",
    author: TJ,
    date: '1800-01-01',
    approx: true,
    part: 'Appendix to the Autobiography (Note G)',
  },
  {
    key: 'note-h-washington-1',
    kind: 'record',
    anchor: '[Note H.]',
    type: 'epistle',
    title: 'Letter from George Washington, New York, October 13, 1789',
    author: 'George Washington',
    recipient: TJ,
    date: '1789-10-13',
    part: 'Appendix to the Autobiography (Note H)',
  },
  {
    key: 'note-h-washington-2',
    kind: 'record',
    anchor: 'New YORK, November 30, 1789.',
    type: 'epistle',
    title: 'Letter from George Washington, New York, November 30, 1789',
    author: 'George Washington',
    recipient: TJ,
    date: '1789-11-30',
    part: 'Appendix to the Autobiography (Note H)',
  },
  { key: 'anas-heading', kind: 'skip', anchor: 'THE ANAS.' },
  {
    key: 'anas-introductory-note',
    kind: 'record',
    anchor: 'INTRODUCTORY NOTE.',
    type: 'editorial',
    title: 'Introductory Note to the Anas',
    author: null,
    date: '1903-01-01',
    approx: true,
    part: 'The Anas',
  },
  {
    key: 'anas-explanation',
    kind: 'record',
    anchor: 'THE ANAS.',
    type: 'memorandum',
    title: 'The Anas: Explanation of the three volumes bound in marbled paper',
    author: TJ,
    date: '1818-02-04',
    part: 'The Anas',
  },
  { key: 'anas', kind: 'anas', anchor: 'CONVERSATION WITH ALEXANDER HAMILTON.' },
  { key: 'title-vol-2', kind: 'skip', anchor: 'THE WRITINGS OF' },
  {
    key: 'carter-university',
    kind: 'record',
    anchor: 'THE UNIVERSITY OF VIRGINIA,',
    type: 'editorial',
    title: 'The University of Virginia, and Thomas Jefferson, its Father (James C. Carter)',
    author: 'James C. Carter',
    date: '1903-01-01',
    approx: true,
    part: 'Front matter, vol. II',
  },
  { key: 'contents-vol-2', kind: 'skip', anchor: 'CONTENTS.' },
  {
    key: 'notes-introductory',
    kind: 'record',
    anchor: 'INTRODUCTORY NOTES.',
    type: 'editorial',
    title: 'Introductory Notes to Notes on Virginia',
    author: null,
    date: '1903-01-01',
    approx: true,
    part: 'Notes on Virginia',
  },
  { key: 'notes-title', kind: 'skip', anchor: "JEFFERSON'S WORKS." },
  { key: 'notes', kind: 'queries', anchor: 'QUERY I.' },
  {
    key: 'notes-appendix-1-thomson',
    kind: 'record',
    anchor: 'APPENDIX',
    type: 'paper',
    title: 'Appendix No. I to Notes on Virginia: Observations by Charles Thomson',
    author: 'Charles Thomson',
    date: '1784-01-01',
    approx: true,
    part: 'Appendix to Notes on Virginia (No. I)',
  },
  {
    key: 'notes-appendix-2-constitution',
    kind: 'record',
    anchor: 'Now Lt:',
    ocr: 'No. II.',
    type: 'paper',
    title: 'Appendix No. II to Notes on Virginia: Draft of a Fundamental Constitution for Virginia',
    author: TJ,
    date: '1783-06-01',
    approx: true,
    part: 'Appendix to Notes on Virginia (No. II)',
  },
  {
    key: 'notes-appendix-3-religious-freedom',
    kind: 'record',
    anchor: 'No; LL',
    ocr: 'No. III.',
    type: 'paper',
    title: 'Appendix No. III to Notes on Virginia: An Act for establishing Religious Freedom',
    author: TJ,
    date: '1786-01-16',
    part: 'Appendix to Notes on Virginia (No. III)',
  },
  {
    key: 'notes-appendix-4-logan',
    kind: 'record',
    anchor: 'AN APPENDIX RELATIVE TO THE MURDER OF',
    type: 'paper',
    title: "Appendix No. IV to Notes on Virginia: relative to the murder of Logan's family",
    author: TJ,
    date: '1800-01-01',
    approx: true,
    part: 'Appendix to Notes on Virginia (No. IV)',
  },
  {
    key: 'manual-preface',
    kind: 'record',
    anchor: 'A MANUAL',
    type: 'rule',
    title: 'A Manual of Parliamentary Practice: Introduction',
    author: TJ,
    date: '1801-02-27',
    part: 'Manual of Parliamentary Practice',
  },
  { key: 'manual', kind: 'manual', anchor: 'SECTION I.' },
  { key: 'library-card', kind: 'skip', anchor: 'f Jefferson, Thomas.' },
];
