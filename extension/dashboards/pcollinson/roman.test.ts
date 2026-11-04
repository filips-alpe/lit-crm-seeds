import { describe, expect, it } from 'vitest';
import { toRoman } from './roman';

describe('toRoman', () => {
  it('converts', () => {
    expect(toRoman(1)).toBe('I');
    expect(toRoman(4)).toBe('IV');
    expect(toRoman(14)).toBe('XIV');
    expect(toRoman(1747)).toBe('MDCCXLVII');
  });
  it('falls back to the plain number out of range', () => {
    expect(toRoman(0)).toBe('0');
    expect(toRoman(4000)).toBe('4000');
  });
});
