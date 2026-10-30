import { describe, expect, it } from 'vitest';
import { mapRecord } from './record-mapper';
import type { FranklinDoc } from '../sources/extract-fo';

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

describe('mapRecord', () => {
  it('skips FO editorial front-matter', () => {
    expect(
      mapRecord(doc({ title: 'Editorial Note on X, 1 January 1776' }), '1776-01-01', false),
    ).toBeUndefined();
  });

  it('maps a single-date letter: date column, resolved users, references', () => {
    const r = mapRecord(doc({}), '1776-08-28', false);
    expect(r).toMatchObject({
      type: 'letter',
      title: 'Benjamin Franklin to John Adams, 28 August 1776',
      entered: '1776-08-28',
      date: '1776-08-28',
      from: 'Benjamin Franklin',
      to: 'John Adams',
      creatorUsername: 'bfranklin',
      assigneeUsername: 'jadams',
      references: ['https://founders.archives.gov/documents/Franklin/01-22-02-0346'],
    });
    expect(r?.start).toBeUndefined();
    expect(r?.allDay).toBeUndefined();
  });

  it('maps a span to start/end with allDay and no single date', () => {
    const r = mapRecord(
      doc({ title: 'Notes on Assembly Debates, 26-28 February 1745', 'date-to': '1745-02-28' }),
      '1745-02-26',
      false,
    );
    expect(r).toMatchObject({
      type: 'note',
      start: '1745-02-26',
      end: '1745-02-28',
      allDay: true,
      entered: '1745-03-09',
    });
    expect(r?.date).toBeUndefined();
  });

  it('keeps the Old Style date as recorded in `date` and the New Style date in `entered`', () => {
    const r = mapRecord(
      doc({
        title: 'Record of Birth, 6 January 1706',
        'date-from': '1706-01-06',
        'date-to': '1706-01-06',
        authors: [],
        recipients: [],
      }),
      '1706-01-06',
      false,
    );
    expect(r?.type).toBe('instrument');
    expect(r?.entered).toBe('1706-01-17');
    expect(r?.date).toBe('1706-01-06');
  });

  it('joins several authors and recipients with "; " and takes the first demo user', () => {
    const r = mapRecord(
      doc({
        authors: ['Smith, Unknown', 'Jefferson, Thomas', 'Adams, John'],
        recipients: ['Hamilton, James', 'Collinson, Peter'],
      }),
      '1776-08-28',
      false,
    );
    expect(r?.from).toBe('Unknown Smith; Thomas Jefferson; John Adams');
    expect(r?.to).toBe('James Hamilton; Peter Collinson');
    expect(r?.creatorUsername).toBe('tjefferson');
    expect(r?.assigneeUsername).toBe('pcollinson');
  });

  it('includes altPermalinks in references', () => {
    const r = mapRecord(
      doc({ altPermalinks: ['https://founders.archives.gov/documents/Adams/06-04-02-0236'] }),
      '1776-08-28',
      false,
    );
    expect(r?.references).toEqual([
      'https://founders.archives.gov/documents/Franklin/01-22-02-0346',
      'https://founders.archives.gov/documents/Adams/06-04-02-0236',
    ]);
  });

  it('leaves creator/assignee undefined for unseeded correspondents', () => {
    const r = mapRecord(
      doc({ authors: ['Hamilton, James'], recipients: ['Smith, Unknown'] }),
      '1776-08-28',
      false,
    );
    expect(r?.creatorUsername).toBeUndefined();
    expect(r?.assigneeUsername).toBeUndefined();
  });

  it('flags an inferred date with a note and never invents description prose', () => {
    const r = mapRecord(doc({ 'date-from': undefined, 'date-to': undefined }), '1776-08-28', true);
    expect(r?.note).toMatch(/date unknown/i);
    expect(r?.description).toBeUndefined();
    expect(r?.date).toBe('1776-08-28');
  });

  it('assigns a period project and any matching thematic projects', () => {
    const r = mapRecord(doc({ title: 'Observations on Electricity, 1750' }), '1750-01-01', false);
    expect(r?.projects).toContain('periode-philadelphie-1723-1757');
    expect(r?.projects).toContain('theme-electricite');
  });
});
