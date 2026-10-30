import { describe, expect, it } from 'vitest';
import { countOf, seasons, totalOf } from './seasons';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('ahelvetius', 'Anne-Catherine Helvétius');
const letter = (iso: string, id?: string) =>
  makeRecord(user, 'letter', { date: new Date(iso), ...(id ? { title: id } : {}) });

describe('seasons', () => {
  it('places letters along the span, oldest first', () => {
    const { records } = dataFor(user, [letter('1787-09-17', 'b'), letter('1779-10-19', 'a')]);
    const points = seasons(records);
    expect(points.map((p) => [p.title, p.year, p.pct])).toEqual([
      ['a', 1779, 0],
      ['b', 1787, 100],
    ]);
  });
  it('keeps only letters and centres a lone one', () => {
    const { records } = dataFor(user, [
      letter('1779-10-19'),
      makeRecord(user, 'life', { date: new Date('1706-01-17') }),
    ]);
    const points = seasons(records);
    expect(points).toHaveLength(1);
    expect(points[0].pct).toBe(50);
  });
  it('thins a long run to the requested number, keeping both ends', () => {
    const many = Array.from({ length: 40 }, (_, i) => letter(`17${60 + (i % 30)}-03-01`));
    const points = seasons(dataFor(user, many).records, 7);
    expect(points).toHaveLength(7);
    expect(points[0].pct).toBe(0);
    expect(points[6].pct).toBe(100);
  });
  it('handles none', () => {
    expect(seasons([])).toEqual([]);
  });
});

describe('counts', () => {
  it('sums countsByType', () => {
    const { countsByType } = dataFor(user, [
      letter('1779-10-19'),
      letter('1780-10-19'),
      makeRecord(user, 'essay'),
    ]);
    expect(totalOf(countsByType)).toBe(3);
    expect(countOf(countsByType, 'letter')).toBe(2);
    expect(countOf(countsByType, 'petition')).toBe(0);
  });
});
