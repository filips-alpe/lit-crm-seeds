import { describe, expect, it } from 'vitest';
import { countOf, findCorrespondent, sliceYears, timelineItems, totalOf } from './pick';
import { makeRecord, makeUser } from '../_kit/fixtures';
import { dataFor } from '../_kit/fixtures';

const user = makeUser('dfranklin', 'Deborah Read Franklin');

describe('pick helpers', () => {
  it('counts types from the per-type counts', () => {
    const data = dataFor(user, [
      makeRecord(user, 'letter'),
      makeRecord(user, 'letter'),
      makeRecord(user, 'life'),
    ]);
    expect(countOf(data.countsByType, 'letter')).toBe(2);
    expect(countOf(data.countsByType, 'letter', 'life')).toBe(3);
    expect(totalOf(data.countsByType)).toBe(3);
  });

  it('finds a correspondent by name fragments', () => {
    const people = [
      { name: 'William Franklin', sent: 1, received: 2, total: 3, first: null, last: null },
      { name: 'Benjamin Franklin', sent: 5, received: 4, total: 9, first: null, last: null },
    ];
    expect(findCorrespondent(people, 'benjamin', 'franklin')?.total).toBe(9);
    expect(findCorrespondent(people, 'nobody')).toBeNull();
  });

  it('orders timeline items by date with undated last', () => {
    const records = dataFor(user, [
      makeRecord(user, 'life', { title: 'Undated' }),
      makeRecord(user, 'life', { title: 'Marriage', date: new Date('1730-09-01T00:00:00Z') }),
      makeRecord(user, 'life', { title: 'Birth', date: new Date('1708-01-01T00:00:00Z') }),
    ]).records;
    expect(timelineItems(records).map((i) => i.title)).toEqual(['Birth', 'Marriage', 'Undated']);
  });

  it('slices years', () => {
    const by = [
      { year: 1775, count: 2 },
      { year: 1776, count: 3 },
      { year: 1777, count: 0 },
    ];
    expect(sliceYears(by, 1776, 1777).map((y) => y.year)).toEqual([1776, 1777]);
  });
});
