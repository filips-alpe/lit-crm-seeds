import { describe, expect, it } from 'vitest';
import { termSpan } from './money';

describe('termSpan', () => {
  it('recognises a calendar year', () => {
    expect(termSpan('1731-07-01', '1732-06-30')).toEqual({ kind: 'year', n: 1 });
    expect(termSpan('1768-01-01', '1768-12-31')).toEqual({ kind: 'year', n: 1 });
  });
  it('reports multiple years, months and days', () => {
    expect(termSpan('1768-01-01', '1769-12-31')).toEqual({ kind: 'years', n: 2 });
    expect(termSpan('1768-01-01', '1768-03-31')).toEqual({ kind: 'months', n: 3 });
    expect(termSpan('1768-01-01', '1768-01-10')).toEqual({ kind: 'days', n: 10 });
  });
  it('is null when either end is missing or reversed', () => {
    expect(termSpan('1768-01-01', null)).toBeNull();
    expect(termSpan('1769-01-01', '1768-01-01')).toBeNull();
  });
});
