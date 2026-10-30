import { describe, expect, it } from 'vitest';
import { labelVariants, pickMatches, QUERIES, resolveQuery } from './queries';

describe('labelVariants', () => {
  it('builds "First Last" first, then the first given name alone', () => {
    expect(labelVariants('Lee, Arthur')).toEqual(['Arthur Lee']);
    expect(labelVariants('Dumas, Charles William Frederick')).toEqual([
      'Charles William Frederick Dumas',
      'Charles Dumas',
    ]);
  });
  it('handles titled and particled names', () => {
    expect(labelVariants('Vergennes, Charles Gravier, comte de')[0]).toBe(
      'Charles Gravier, comte de Vergennes',
    );
    expect(labelVariants('Sartine, Antoine-Raymond-Gualbert-Gabriel de')).toContain(
      'Antoine de Sartine',
    );
  });
  it('drops nicknames in parentheses and generation suffixes', () => {
    expect(labelVariants('Hewson, Mary (Polly) Stevenson')[0]).toBe('Mary Stevenson Hewson');
    expect(labelVariants('Wharton, Joseph, Jr.')[0]).toBe('Joseph Wharton');
  });
});

describe('pickMatches', () => {
  const row = (lbl: string, qid: string, born: string, sl: string, died?: string) => ({
    lbl,
    p: `http://www.wikidata.org/entity/${qid}`,
    born,
    sl,
    ...(died ? { died } : {}),
  });

  it('resolves a unique candidate', () => {
    const { matched } = pickMatches(
      ['Lee, Arthur'],
      [row('Arthur Lee', 'Q1', '1740-12-20T00:00:00Z', '12')],
    );
    expect(matched.get('Lee, Arthur')).toBe('Q1');
  });

  it('prefers a clearly more notable namesake and leaves close calls ambiguous', () => {
    const rows = [
      row('John Jay', 'Q1', '1745-12-12T00:00:00Z', '90'),
      row('John Jay', 'Q2', '1750-01-01T00:00:00Z', '3'),
      row('Tom Smith', 'Q3', '1740-01-01T00:00:00Z', '4'),
      row('Tom Smith', 'Q4', '1741-01-01T00:00:00Z', '3'),
    ];
    const r = pickMatches(['Jay, John', 'Smith, Tom'], rows);
    expect(r.matched.get('Jay, John')).toBe('Q1');
    expect(r.ambiguous).toEqual(['Smith, Tom']);
  });

  it('discards namesakes whose lifespan cannot cover the person documents', () => {
    const rows = [
      row('John Dalton', 'Q1', '1766-09-06T00:00:00Z', '80', '1844-07-27T00:00:00Z'),
      row('John Dalton', 'Q2', '1710-01-01T00:00:00Z', '2', '1780-01-01T00:00:00Z'),
    ];
    const activity = new Map([['Dalton, John', { from: 1750, to: 1778 }]]);
    expect(pickMatches(['Dalton, John'], rows, activity).matched.get('Dalton, John')).toBe('Q2');
  });

  it('reports names with no candidate', () => {
    expect(pickMatches(['Nobody, Known'], []).unmatched).toEqual(['Nobody, Known']);
  });
});

describe('queries', () => {
  it('escape quotes in resolve labels', () => {
    expect(resolveQuery(['A "B" C'])).toContain('"A \\"B\\" C"@en');
  });
  it('every family restricts to the requested people', () => {
    for (const build of Object.values(QUERIES))
      expect(build(['Q1', 'Q2'])).toContain('wd:Q1 wd:Q2');
  });
});
