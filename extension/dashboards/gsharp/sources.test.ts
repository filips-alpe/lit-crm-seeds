import { describe, expect, it } from 'vitest';
import { countOf, sourceEntries, totalOf } from './sources';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('gsharp', 'Granville Sharp');
const rec = (title: string, iso: string, references: string[]) =>
  makeRecord(user, 'letter', { title, date: new Date(iso), references });

describe('sourceEntries', () => {
  it('flattens references, newest record first, and marks web links', () => {
    const { records } = dataFor(user, [
      rec('old', '1775-01-01', ['Franklin Papers']),
      rec('new', '1789-01-01', ['https://founders.archives.gov/documents/x', 'plain note']),
    ]);
    const e = sourceEntries(records);
    expect(e.map((x) => [x.title, x.reference])).toEqual([
      ['new', 'https://founders.archives.gov/documents/x'],
      ['new', 'plain note'],
      ['old', 'Franklin Papers'],
    ]);
    expect(e[0].href).toBe('https://founders.archives.gov/documents/x');
    expect(e[0].label).toBe('founders.archives.gov/documents/x');
    expect(e[1].href).toBeNull();
  });
  it('honours the limit and skips records without references', () => {
    const { records } = dataFor(user, [
      rec('a', '1775-01-01', ['1', '2', '3']),
      rec('b', '1776-01-01', []),
    ]);
    expect(sourceEntries(records, 2)).toHaveLength(2);
    expect(sourceEntries([])).toEqual([]);
  });
});

describe('counts', () => {
  it('sums countsByType', () => {
    const { countsByType } = dataFor(user, [
      rec('a', '1775-01-01', []),
      makeRecord(user, 'petition', { date: new Date('1788-01-01') }),
    ]);
    expect(totalOf(countsByType)).toBe(2);
    expect(countOf(countsByType, 'petition')).toBe(1);
    expect(countOf(countsByType, 'essay')).toBe(0);
  });
});
