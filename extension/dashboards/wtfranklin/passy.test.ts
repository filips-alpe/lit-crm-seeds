import { describe, expect, it } from 'vitest';
import { passyWindow } from './passy';

describe('passyWindow', () => {
  it('counts the years at Passy against the rest', () => {
    const w = passyWindow([
      { year: 1776, count: 2 },
      { year: 1777, count: 3 },
      { year: 1778, count: 7 },
      { year: 1786, count: 1 },
    ]);
    expect(w.inside).toBe(10);
    expect(w.outside).toBe(3);
    expect(w.peak).toEqual({ year: 1778, count: 7 });
    expect(w.years.map((y) => y.year)).toEqual([1777, 1778]);
  });

  it('is empty with no data', () => {
    expect(passyWindow([])).toEqual({ years: [], inside: 0, outside: 0, peak: null });
  });
});
