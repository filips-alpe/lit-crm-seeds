import { describe, expect, it } from 'vitest';
import { buildAliasIndex, findMentions, unlinkedCandidates, type Gazetteer } from './entities';

const gazetteer: Gazetteer = {
  entities: [
    {
      key: 'george-washington',
      type: 'person',
      name: 'George Washington',
      aliases: ['General Washington', 'President Washington'],
    },
    { key: 'washington-dc', type: 'place', name: 'Washington, D. C.', aliases: ['Washington'] },
    { key: 'washington-county', type: 'place', name: 'Washington County', aliases: ['Washington'] },
    {
      key: 'alexander-hamilton',
      type: 'person',
      name: 'Alexander Hamilton',
      aliases: ['Hamilton', 'Colonel Hamilton', 'A. Hamilton'],
    },
    {
      key: 'edmund-randolph',
      type: 'person',
      name: 'Edmund Randolph',
      aliases: ['Edmond Randolph', 'E. Randolph'],
    },
  ],
  unlinked: ['Mr. Randolph', 'Randolph'],
};
const index = buildAliasIndex(gazetteer);
const linked = (text: string) => findMentions(text, index).map((m) => [m.surface, m.entity]);

describe('entity resolution', () => {
  it('resolves variant names to one entity, longest variant first', () => {
    expect(linked('General Washington wrote to Colonel Hamilton and Edmond Randolph.')).toEqual([
      ['General Washington', 'george-washington'],
      ['Colonel Hamilton', 'alexander-hamilton'],
      ['Edmond Randolph', 'edmund-randolph'],
    ]);
  });

  it('leaves a variant claimed by two entities unlinked', () => {
    expect(linked('He went to Washington.')).toEqual([['Washington', null]]);
  });

  it('leaves listed ambiguous names unlinked and stops shorter matches inside them', () => {
    expect(linked('Mr. Randolph and Randolph agreed.')).toEqual([
      ['Mr. Randolph', null],
      ['Randolph', null],
    ]);
  });

  it('matches whole words only, including before a possessive', () => {
    expect(linked('Hamiltonian ideas; A. Hamilton’s leaving')).toEqual([
      ['A. Hamilton', 'alexander-hamilton'],
    ]);
  });

  it('matches across a line-wrap space but never across a paragraph break', () => {
    expect(linked('General  Washington')).toEqual([['General  Washington', 'george-washington']]);
    expect(linked('General\n\nWashington')).toEqual([['Washington', null]]);
  });

  it('offsets slice back to the surface text', () => {
    const text = 'Notes of Alexander Hamilton and Th: Jefferson.';
    for (const m of findMentions(text, index)) expect(text.slice(m.start, m.end)).toBe(m.surface);
  });

  it('rejects duplicate keys', () => {
    expect(() =>
      buildAliasIndex({ entities: [gazetteer.entities[0], gazetteer.entities[0]] }),
    ).toThrow(/duplicate/);
  });
});

describe('unlinkedCandidates', () => {
  it('reports honorific names the gazetteer misses, not the ones it links', () => {
    const text = 'he said to Colonel Gunn and Colonel Hamilton that day';
    expect(unlinkedCandidates(text, findMentions(text, index))).toContain('Colonel Gunn');
    expect(unlinkedCandidates(text, findMentions(text, index))).not.toContain('Colonel Hamilton');
  });
});
