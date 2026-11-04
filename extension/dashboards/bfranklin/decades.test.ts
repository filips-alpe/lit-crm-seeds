import { describe, expect, it } from 'vitest';
import { decadeCounts, peakYear } from './decades';

describe('decadeCounts', () => {
  it('buckets years into decades and fills gaps', () => {
    const out = decadeCounts([
      { year: 1706, count: 1 },
      { year: 1729, count: 2 },
      { year: 1731, count: 4 },
      { year: 1752, count: 5 },
    ]);
    expect(out).toEqual([
      { decade: 1700, count: 1 },
      { decade: 1710, count: 0 },
      { decade: 1720, count: 2 },
      { decade: 1730, count: 4 },
      { decade: 1740, count: 0 },
      { decade: 1750, count: 5 },
    ]);
  });
  it('is empty-safe', () => expect(decadeCounts([])).toEqual([]));
});

describe('peakYear', () => {
  it('returns the busiest year', () => {
    expect(
      peakYear([
        { year: 1776, count: 3 },
        { year: 1777, count: 9 },
      ]),
    ).toEqual({ year: 1777, count: 9 });
  });
  it('is null when nothing counted', () => {
    expect(peakYear([])).toBeNull();
    expect(peakYear([{ year: 1700, count: 0 }])).toBeNull();
  });
});
