import { describe, expect, it } from 'vitest';
import { eras, exchangeWith } from './exchange';

const person = (name: string, sent: number, received: number) => ({
  name,
  sent,
  received,
  total: sent + received,
  first: null,
  last: null,
});

describe('exchangeWith', () => {
  it('computes the share written by the user', () => {
    const ex = exchangeWith([person('Benjamin Franklin', 1, 3)], 'benjamin');
    expect(ex).toMatchObject({ sent: 1, received: 3, total: 4, sentPct: 25 });
  });

  it('is null when the person is absent', () => {
    expect(exchangeWith([person('Someone', 1, 1)], 'benjamin')).toBeNull();
    expect(exchangeWith([], 'benjamin')).toBeNull();
  });
});

describe('eras', () => {
  it('splits counts at the cut-off year', () => {
    const by = [
      { year: 1775, count: 4 },
      { year: 1776, count: 1 },
      { year: 1780, count: 2 },
    ];
    expect(eras(by, 1776)).toEqual({ before: 4, after: 3 });
    expect(eras([], 1776)).toEqual({ before: 0, after: 0 });
  });
});
