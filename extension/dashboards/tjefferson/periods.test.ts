import { describe, expect, it } from 'vitest';
import { periodSplit } from './periods';

describe('periodSplit', () => {
  it('splits years around the Paris ministry', () => {
    const p = periodSplit([
      { year: 1780, count: 2 },
      { year: 1784, count: 3 },
      { year: 1789, count: 1 },
      { year: 1790, count: 4 },
    ]);
    expect(p.map((x) => [x.id, x.count])).toEqual([
      ['before', 2],
      ['paris', 4],
      ['after', 4],
    ]);
  });

  it('is all zeros when empty', () => {
    expect(periodSplit([]).every((p) => p.count === 0)).toBe(true);
  });
});
