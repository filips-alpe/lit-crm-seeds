import { describe, expect, it } from 'vitest';
import { isOldStyle, osToNs } from './dates';

describe('isOldStyle', () => {
  it('is true for any date before the 1700-03-01 Julian/Gregorian gap widening', () => {
    expect(isOldStyle('1699-12-31')).toBe(true);
  });

  it('is true for dates in the 10-day-gap era up to 1700-02-28', () => {
    expect(isOldStyle('1700-02-28')).toBe(true);
  });

  it('is true through the last OS date England used, 1752-09-02', () => {
    expect(isOldStyle('1752-09-02')).toBe(true);
  });

  it('is false from the Gregorian switch, 1752-09-03, onward', () => {
    expect(isOldStyle('1752-09-03')).toBe(false);
  });

  it('is false for modern dates', () => {
    expect(isOldStyle('1785-03-15')).toBe(false);
  });
});

describe('osToNs', () => {
  it('adds 10 days for OS dates before 1700-03-01 (the Julian-only gap)', () => {
    // Franklin's birth: 6 January 1706 OS is the famous +11 case, so pick an
    // earlier anchor to exercise the +10 branch: 1 January 1699 OS.
    expect(osToNs('1699-01-01')).toBe('1699-01-11');
  });

  it('adds 11 days for OS dates from 1700-03-01 through 1752-09-02', () => {
    // Franklin's birth, 6 January 1706 OS -> 17 January 1706 NS.
    expect(osToNs('1706-01-06')).toBe('1706-01-17');
  });

  it('adds 11 days at the boundary date 1752-09-02', () => {
    expect(osToNs('1752-09-02')).toBe('1752-09-13');
  });

  it('returns the date unchanged from 1752-09-03 onward (already NS)', () => {
    expect(osToNs('1752-09-03')).toBe('1752-09-03');
  });

  it('returns the date unchanged for modern dates', () => {
    expect(osToNs('1785-03-15')).toBe('1785-03-15');
  });

  it('handles month/year rollover correctly (end of February OS)', () => {
    // 20 February 1751 OS + 11 days -> 3 March 1751 NS (non-leap handling via Date).
    expect(osToNs('1751-02-20')).toBe('1751-03-03');
  });
});
