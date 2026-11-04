import { describe, expect, it } from 'vitest';
import { activeYears, longestSilence } from './silence';

const years = (counts: number[]) => counts.map((count, i) => ({ year: 1760 + i, count }));

describe('longestSilence', () => {
  it('finds the longest run of empty years between dated ones', () => {
    expect(longestSilence(years([1, 0, 0, 4, 0, 1]))).toEqual({ from: 1761, to: 1762, years: 2 });
  });

  it('ignores trailing zeros and handles no data', () => {
    expect(longestSilence(years([1, 1, 0]))).toBeNull();
    expect(longestSilence([])).toBeNull();
  });
});

describe('activeYears', () => {
  it('counts years that hold something', () => {
    expect(activeYears(years([1, 0, 2]))).toEqual({ active: 2, span: 3 });
  });
});
