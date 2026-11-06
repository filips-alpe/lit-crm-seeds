import { describe, expect, it } from 'vitest';
import {
  locateAnchors,
  parseAnasDate,
  roman,
  splitAll,
  splitAnas,
  splitHeaded,
  titleCase,
} from './split';
import type { ContentsEntry } from './contents';

const ctx = (lines: string[]) => ({ lines, furniture: new Map() });

describe('parseAnasDate', () => {
  it.each([
    ['February the 28th, 1792. I was to have been', { month: 2, day: 28, year: 1792 }],
    ['March 1, 1792. ans', { month: 3, day: 1, year: 1792 }],
    ['May the 23d. I had sent', { month: 5, day: 23, year: null }],
    ['Bladensburg, October the 1st, 1792. This morn-', { month: 10, day: 1, year: 1792 }],
  ])('%s', (line, date) => expect(parseAnasDate(line)).toEqual(date));

  it('does not read ordinary sentences as dates', () => {
    expect(parseAnasDate('May I ask the favor of you')).toBeNull();
    expect(parseAnasDate('March of the army')).toBeNull();
  });
});

describe('splitAnas', () => {
  const lines = [
    'CONVERSATION WITH ALEXANDER HAMILTON.', // 0
    '',
    'August the 13th, 1791. Notes of a conversation', // 2
    'between them.',
    '',
    'December the 25th, 1791, Colonel Gunn said', // 5
    '',
    'CABINET MEETINGS.', // 7
    '',
    'February the 28th. Knox and Randolph', // 9 — no year: carries 1791 → rolls to 1792
  ];
  const spans = splitAnas(ctx(lines), 0, lines.length);

  it('starts a memorandum at each heading or dated paragraph; a heading owns its date', () => {
    expect(spans.map((s) => [s.from, s.to])).toEqual([
      [0, 5],
      [5, 7],
      [7, 10],
    ]);
  });

  it('carries the year forward and rolls it when the month goes back', () => {
    expect(spans.map((s) => s.date)).toEqual(['1791-08-13', '1791-12-25', '1792-02-28']);
  });

  it('titles from the heading and date', () => {
    expect(spans[0].title).toBe('The Anas: Conversation with Alexander Hamilton, August 13, 1791');
    expect(spans[1].title).toBe('The Anas: Memorandum, December 25, 1791');
  });
});

describe('splitHeaded', () => {
  it('numbers sections in order, whatever the OCR made of the numeral', () => {
    const lines = [
      'SECTION I.',
      '',
      'THE IMPORTANCE OF ADHERING TO RULES.',
      '',
      'text',
      '',
      'SECTION XIL',
      '',
      'COMMITTEE OF THE WHOLE.',
      '',
      'text',
    ];
    const spans = splitHeaded(ctx(lines), 0, lines.length, 'manual');
    expect(spans.map((s) => [s.from, s.to, s.title])).toEqual([
      [0, 6, 'Parliamentary Manual, Section I: The Importance of Adhering to Rules'],
      [6, 11, 'Parliamentary Manual, Section II: Committee of the Whole'],
    ]);
  });

  it('reads a garbled Query heading', () => {
    const lines = [
      'QUERY II.',
      '',
      'A notice of its rivers?',
      '',
      'x',
      '',
      'OUERY ETLI:',
      '',
      'A notice of the best Seaports?',
    ];
    expect(splitHeaded(ctx(lines), 0, lines.length, 'queries').map((s) => s.title)).toEqual([
      'Notes on Virginia, Query I: A notice of its rivers',
      'Notes on Virginia, Query II: A notice of the best Seaports',
    ]);
  });
});

describe('locateAnchors / splitAll', () => {
  const contents: ContentsEntry[] = [
    { key: 'front', kind: 'skip', anchor: 'TITLE' },
    {
      key: 'a',
      kind: 'record',
      anchor: 'INTRODUCTORY NOTE.',
      type: 'editorial',
      title: 'A',
      author: null,
      date: '1903-01-01',
      part: 'P',
    },
    {
      key: 'b',
      kind: 'record',
      anchor: 'INTRODUCTORY NOTE.',
      type: 'editorial',
      title: 'B',
      author: null,
      date: '1903-01-01',
      part: 'P',
    },
  ];
  const lines = ['TITLE', 'INTRODUCTORY NOTE. ', 'one', 'INTRODUCTORY NOTE.', 'two'];

  it('resolves repeated headings in order and traces each boundary to its raw line', () => {
    expect(locateAnchors(lines, contents).map((a) => a.line)).toEqual([0, 1, 3]);
    expect(splitAll(lines, new Map(), contents).map((s) => [s.key, s.from, s.to])).toEqual([
      ['a', 1, 3],
      ['b', 3, 5],
    ]);
  });

  it('fails loudly when an anchor is missing', () => {
    expect(() => locateAnchors(['TITLE'], contents)).toThrow(/anchor not found: a/);
  });
});

describe('helpers', () => {
  it('roman', () =>
    expect([1, 4, 9, 14, 40, 53].map(roman)).toEqual(['I', 'IV', 'IX', 'XIV', 'XL', 'LIII']));
  it('titleCase', () =>
    expect(titleCase('REASONS FOR SECRETARY OF STATE’S DISSENT')).toBe(
      'Reasons for Secretary of State’s Dissent',
    ));
});
