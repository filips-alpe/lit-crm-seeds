import { describe, expect, it } from 'vitest';
import { featuredLetter, ofType, yearsSpan } from './featured';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('lafayette', 'Marquis de Lafayette');

describe('lafayette featured', () => {
  it('picks the newest letter and ignores other types', () => {
    const data = dataFor(user, [
      makeRecord(user, 'membership', { date: new Date('1790-01-01') }),
      makeRecord(user, 'letter', { title: 'old', date: new Date('1778-01-01') }),
      makeRecord(user, 'letter', { title: 'new', date: new Date('1782-01-01') }),
    ]);
    expect(featuredLetter(data.recent)?.title).toBe('new');
    expect(ofType(data.recent, 'membership')).toHaveLength(1);
  });

  it('is null without letters', () => {
    expect(featuredLetter([])).toBeNull();
  });

  it('counts the span in years', () => {
    expect(yearsSpan({ earliest: new Date('1777-06-01'), latest: new Date('1790-01-01') })).toBe(
      14,
    );
    expect(yearsSpan({ earliest: null, latest: null })).toBeNull();
  });
});
