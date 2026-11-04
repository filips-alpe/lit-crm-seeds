import { describe, expect, it } from 'vitest';
import { generateRecords } from './generate';
import type { FranklinDoc } from './sources/extract-fo';

function doc(partial: Partial<FranklinDoc>): FranklinDoc {
  return {
    title: 'Benjamin Franklin to John Adams, 28 August 1776',
    permalink: 'https://founders.archives.gov/documents/Franklin/01-22-02-0346',
    project: 'Franklin Papers',
    authors: ['Franklin, Benjamin'],
    recipients: ['Adams, John'],
    'date-from': '1776-08-28',
    'date-to': '1776-08-28',
    ...partial,
  };
}

describe('generateRecords', () => {
  it('maps every dated doc to a record', () => {
    const records = generateRecords([doc({})]);
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe('Benjamin Franklin to John Adams, 28 August 1776');
  });

  it('drops FO editorial notes (classifier SKIP)', () => {
    const records = generateRecords([doc({ title: 'Editorial Note on X, 1 January 1776' })]);
    expect(records).toHaveLength(0);
  });

  it('fills in a missing date from a dated neighbour and flags it with a note', () => {
    const records = generateRecords([
      doc({ permalink: 'Franklin/01-01-02-0001', 'date-from': '1710-01-01' }),
      doc({ permalink: 'Franklin/01-01-02-0002', 'date-from': undefined, 'date-to': undefined }),
    ]);
    const undated = records.find((r) => r.permalink === 'Franklin/01-01-02-0002');
    expect(undated?.entered).toBeTruthy();
    expect(undated?.note).toMatch(/date unknown/i);
  });

  it('carries altPermalinks into references', () => {
    const records = generateRecords([
      doc({ altPermalinks: ['https://founders.archives.gov/documents/Adams/06-04-02-0236'] }),
    ]);
    expect(records[0].references).toHaveLength(2);
  });
});
