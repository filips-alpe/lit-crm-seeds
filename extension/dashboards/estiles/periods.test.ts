import { describe, expect, it } from 'vitest';
import { countOf, periodBars, periodLabel } from './periods';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const proj = (code: string, count: number) => ({ id: code, code, color: '#123', count });

describe('periodLabel', () => {
  it('humanises period codes and leaves others alone', () => {
    expect(periodLabel('periode-londres-agence-1757-1762')).toBe('Londres Agence 1757–1762');
    expect(periodLabel('theme-electricite')).toBe('theme-electricite');
  });
});

describe('periodBars', () => {
  it('keeps periods only, chronologically, scaled to the busiest', () => {
    const bars = periodBars([
      proj('periode-france-1776-1785', 10),
      proj('theme-aps', 99),
      proj('periode-londres-1764-1775', 5),
    ]);
    expect(bars.map((b) => [b.label, b.width])).toEqual([
      ['Londres 1764–1775', 0.5],
      ['France 1776–1785', 1],
    ]);
  });
  it('handles none', () => {
    expect(periodBars([])).toEqual([]);
  });
});

describe('countOf', () => {
  it('reads countsByType', () => {
    const user = makeUser('estiles', 'Ezra Stiles');
    const { countsByType } = dataFor(user, [makeRecord(user, 'essay'), makeRecord(user, 'letter')]);
    expect(countOf(countsByType, 'essay')).toBe(1);
    expect(countOf(countsByType, 'note')).toBe(0);
  });
});
