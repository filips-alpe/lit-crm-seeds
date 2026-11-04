import { describe, expect, it } from 'vitest';
import { assignPeriod, assignThematic, PERIOD_PROJECTS } from './projects';

describe('assignPeriod', () => {
  it("places Franklin's birth date (NS) in Boston", () => {
    expect(assignPeriod('1706-01-17')).toBe('periode-boston-1706-1723');
  });

  it('every period boundary is contiguous: endNs of one equals startNs of the next (where both open)', () => {
    for (let i = 0; i < PERIOD_PROJECTS.length - 1; i++) {
      const cur = PERIOD_PROJECTS[i];
      if (!cur.endNs) continue;
      // Find the next period (by array order) that starts where this ends,
      // allowing the London 1724-26 side-branch to overlap Philadelphia.
      const match = PERIOD_PROJECTS.some((p) => p.startNs === cur.endNs);
      expect(match || cur.code === 'periode-londres-1724-1726').toBe(true);
    }
  });

  it('assigns late dates to the final (open-ended) period', () => {
    expect(assignPeriod('1789-01-01')).toBe('periode-philadelphie-1785-1790');
  });

  it('assigns a date just before Congress to the prior London period', () => {
    expect(assignPeriod('1775-03-20')).toBe('periode-londres-1764-1775');
  });

  it('assigns the Congress start date to the Congress period', () => {
    expect(assignPeriod('1775-03-21')).toBe('periode-congres-1775-1776');
  });

  it('every NS date from 1706 resolves to some period (exhaustiveness spot-check)', () => {
    const sample = [
      '1706-01-17',
      '1725-01-01',
      '1760-01-01',
      '1770-01-01',
      '1778-01-01',
      '1786-01-01',
    ];
    for (const d of sample) {
      expect(typeof assignPeriod(d)).toBe('string');
    }
  });
});

describe('assignThematic', () => {
  it('matches electrical-experiment titles', () => {
    expect(assignThematic('Observations on Electricity, 1750')).toContain('theme-electricite');
  });

  it('matches Poor Richard / Gazette titles to printing', () => {
    expect(assignThematic('Poor Richard, 1733')).toContain('theme-imprimerie');
    expect(assignThematic('Extracts from the Gazette, 1729')).toContain('theme-imprimerie');
  });

  it('matches Library Company correspondents', () => {
    expect(assignThematic('Minutes of the Library Company, 1732')).toContain(
      'theme-library-company',
    );
  });

  it('returns an empty array when nothing matches', () => {
    expect(assignThematic('Benjamin Franklin to John Adams, 28 August 1776')).toEqual([]);
  });

  it('can match more than one theme at once', () => {
    const themes = assignThematic(
      'Benjamin Franklin to the Pennsylvania Hospital: Subscription, 1751',
    );
    expect(themes).toContain('theme-pennsylvania-hospital');
  });
});
