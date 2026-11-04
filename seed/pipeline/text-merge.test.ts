import { describe, expect, it } from 'vitest';
import { mergeText, type MatchedText } from './text-merge';
import type { GeneratedRecord } from './record-mapper';

function record(partial: Partial<GeneratedRecord>): GeneratedRecord {
  return {
    type: 'letter',
    title: 'Some Letter',
    references: ['https://founders.archives.gov/documents/Franklin/01-01-01-0001'],
    entered: '1776-01-01',
    projects: ['periode-france-1776-1785'],
    permalink: 'https://founders.archives.gov/documents/Franklin/01-01-01-0001',
    ...partial,
  };
}

function match(partial: Partial<MatchedText>): MatchedText {
  return {
    permalink: 'https://founders.archives.gov/documents/Franklin/01-01-01-0001',
    text: 'Dear Sir, ...',
    source: {
      name: 'Wikisource',
      edition: 'Smyth 1905-07',
      url: 'https://en.wikisource.org/wiki/Example',
    },
    matchMethod: 'exact-date-and-recipient',
    confidence: 0.95,
    ...partial,
  };
}

describe('mergeText', () => {
  it('attaches text and adds the source URL to references when a permalink matches', () => {
    const [merged] = mergeText([record({})], [match({})]);
    expect(merged.text).toBe('Dear Sir, ...');
    expect(merged.references).toEqual([
      'https://founders.archives.gov/documents/Franklin/01-01-01-0001',
      'https://en.wikisource.org/wiki/Example',
    ]);
  });

  it('leaves records with no match unchanged', () => {
    const [merged] = mergeText([record({})], [match({ permalink: 'other' })]);
    expect(merged.text).toBeUndefined();
    expect(merged.references).toEqual([
      'https://founders.archives.gov/documents/Franklin/01-01-01-0001',
    ]);
  });

  it('does not duplicate the source URL if already present in references', () => {
    const r = record({
      references: [
        'https://founders.archives.gov/documents/Franklin/01-01-01-0001',
        'https://en.wikisource.org/wiki/Example',
      ],
    });
    const [merged] = mergeText([r], [match({})]);
    expect(merged.references).toHaveLength(2);
  });

  it('fills an empty `to` from the match place', () => {
    const [merged] = mergeText([record({})], [match({ place: 'Boston' })]);
    expect(merged.to).toBe('Boston');
  });

  it('does not override an existing `to` with the match place', () => {
    const [merged] = mergeText([record({ to: 'Paris' })], [match({ place: 'Boston' })]);
    expect(merged.to).toBe('Paris');
  });

  it('fills an empty description from the match description', () => {
    const [merged] = mergeText([record({})], [match({ description: 'Son of Josiah and Abiah.' })]);
    expect(merged.description).toBe('Son of Josiah and Abiah.');
  });

  it('does not override an existing description with the match description', () => {
    const [merged] = mergeText(
      [record({ description: 'Existing account.' })],
      [match({ description: 'Son of Josiah and Abiah.' })],
    );
    expect(merged.description).toBe('Existing account.');
  });
});
