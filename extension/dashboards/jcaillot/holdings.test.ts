import { describe, expect, it } from 'vitest';
import { countOf, isEmpty, totalOf } from './holdings';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('jcaillot', 'Jacques Caillot');

describe('holdings', () => {
  it('is empty with no records', () => {
    const { countsByType } = dataFor(user, []);
    expect(isEmpty(countsByType)).toBe(true);
    expect(totalOf(countsByType)).toBe(0);
  });
  it('counts what the user does hold', () => {
    const { countsByType } = dataFor(user, [
      makeRecord(user, 'letter'),
      makeRecord(user, 'letter'),
      makeRecord(user, 'account'),
    ]);
    expect(isEmpty(countsByType)).toBe(false);
    expect(totalOf(countsByType)).toBe(3);
    expect(countOf(countsByType, 'letter')).toBe(2);
    expect(countOf(countsByType, 'essay')).toBe(0);
  });
});
