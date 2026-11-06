import { describe, expect, it } from 'vitest';
import { buildPageMap, classifyFurniture, leafIndex, parsePageNumber } from './pages';

describe('classifyFurniture', () => {
  it.each([
    ['2 Jefferson’s Works ', 'running-head', 2],
    ["IIO Jefferson's Works", 'running-head', 110],
    ['Autobiography 3', 'running-head', 3],
    ['The Anas 285', 'running-head', 285],
    ['Notes on Virginia 41', 'running-head', 41],
    ['(265) ', 'folio', 265],
    ['VOL. I—12', 'signature', null],
    ['VOL, I.—~9 : 1', 'signature', null],
    ['viii Special Introduction', 'running-head', null],
  ])('%s → %s', (line, kind, page) => {
    expect(classifyFurniture(line)).toMatchObject({ kind, page });
  });

  it.each([
    'He placed me at the English school at five years',
    'QUERY I.',
    '1707-8, and intermarried 1739',
  ])('leaves text alone: %s', (line) => expect(classifyFurniture(line)).toBeNull());
});

describe('parsePageNumber', () => {
  it('reads OCR letters as digits', () => {
    expect(parsePageNumber('IIO')).toBe(110);
    expect(parsePageNumber('3o')).toBe(30);
    expect(parsePageNumber('x')).toBeNull();
  });
});

describe('buildPageMap', () => {
  const lines = [
    'title page', // 0
    'text on page 1', // 1
    '(1)', // 2 folio closes page 1
    '2 Jefferson’s Works', // 3
    'text on page 2', // 4
    'Autobiography 3', // 5
    'text on page 3', // 6
    'THE WRITINGS OF', // 7 volume II starts
    'vol two front matter', // 8
    'Notes on Virginia 5', // 9
    'text on vol II page 5', // 10
  ];
  const pm = buildPageMap(lines, 7);

  it('assigns each line the page of its nearest mark', () => {
    expect([...pm.page]).toEqual([1, 1, 1, 2, 2, 3, 3, 0, 0, 5, 5]);
  });

  it('splits volumes at the second title page', () => {
    expect([...pm.volume]).toEqual([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2]);
  });

  it('ignores an implausible page jump but still removes the line', () => {
    const p = buildPageMap(['Autobiography 3', 'a', '980 Jefferson’s Works', 'b'], 99);
    expect(p.page[3]).toBe(3);
    expect(p.furniture.has(2)).toBe(true);
  });
});

describe('leafIndex', () => {
  it('maps (volume, page) to the scan position, restarting at volume II', () => {
    const map = leafIndex({
      pages: [
        { leafNum: 1, pageNumber: '' },
        { leafNum: 2, pageNumber: '1' },
        { leafNum: 3, pageNumber: '492' },
        { leafNum: 4, pageNumber: '1' },
      ],
    });
    expect(map.get('1:1')).toBe(1);
    expect(map.get('1:492')).toBe(2);
    expect(map.get('2:1')).toBe(3);
  });
});
