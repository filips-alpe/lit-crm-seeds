import { describe, expect, it } from 'vitest';
import { agencyTotal, agencyYears, countOf } from './docket';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('tcushing', 'Thomas Cushing');

describe('tcushing docket', () => {
  it('always yields the six agency years, zero-filled', () => {
    const years = agencyYears([{ year: 1773, count: 4 }]);
    expect(years.map((y) => y.year)).toEqual([1770, 1771, 1772, 1773, 1774, 1775]);
    expect(years[3].count).toBe(4);
    expect(
      agencyTotal([
        { year: 1769, count: 9 },
        { year: 1773, count: 4 },
      ]),
    ).toBe(4);
  });

  it('counts types from countsByType', () => {
    const data = dataFor(user, [
      makeRecord(user, 'petition', { date: new Date('1771-01-01') }),
      makeRecord(user, 'petition', { date: new Date('1772-01-01') }),
    ]);
    expect(countOf(data.countsByType, 'petition')).toBe(2);
    expect(countOf(data.countsByType, 'proceedings')).toBe(0);
  });
});
