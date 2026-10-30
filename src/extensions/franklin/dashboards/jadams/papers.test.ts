import { describe, expect, it } from 'vitest';
import { countOf, exchangeLedger, ofTypes, peakYear } from './papers';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('jadams', 'John Adams');

describe('jadams papers', () => {
  it('counts a type from countsByType', () => {
    const data = dataFor(user, [makeRecord(user, 'diary'), makeRecord(user, 'diary')]);
    expect(countOf(data.countsByType, 'diary')).toBe(2);
    expect(countOf(data.countsByType, 'office')).toBe(0);
  });

  it('turns correspondents into sent shares', () => {
    const rows = exchangeLedger([
      { name: 'A', sent: 3, received: 1, total: 4, first: null, last: null },
      { name: 'B', sent: 0, received: 0, total: 0, first: null, last: null },
    ]);
    expect(rows[0].sentShare).toBe(0.75);
    expect(rows[1].sentShare).toBe(0);
  });

  it('finds the peak year, null when empty', () => {
    expect(peakYear([])).toBeNull();
    expect(
      peakYear([
        { year: 1776, count: 2 },
        { year: 1777, count: 5 },
        { year: 1778, count: 5 },
      ]),
    ).toEqual({ year: 1777, count: 5 });
  });

  it('filters display records by type code', () => {
    const recs = dataFor(user, [makeRecord(user, 'diary'), makeRecord(user, 'letter')]).recent;
    expect(ofTypes(recs, 'diary')).toHaveLength(1);
  });
});
