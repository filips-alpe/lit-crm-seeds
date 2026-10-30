import { describe, expect, it } from 'vitest';
import { formatName, joinNames } from './names';

describe('formatName', () => {
  it('reorders "Last, First" to "First Last"', () => {
    expect(formatName('Franklin, Benjamin')).toBe('Benjamin Franklin');
  });

  it('keeps a trailing suffix after the reordered name', () => {
    expect(formatName('Franklin, James, Jr.')).toBe('James Franklin, Jr.');
  });

  it('passes through unstructured strings with no comma verbatim', () => {
    expect(formatName('"Benjamin Franklin"')).toBe('"Benjamin Franklin"');
  });

  it('handles married/compound names', () => {
    expect(formatName('Bache, Sarah Franklin')).toBe('Sarah Franklin Bache');
  });
});

describe('joinNames', () => {
  it('returns empty string for no names', () => {
    expect(joinNames([])).toBe('');
  });

  it('returns a single formatted name unchanged', () => {
    expect(joinNames(['Franklin, Benjamin'])).toBe('Benjamin Franklin');
  });

  it('joins two or more names with "; "', () => {
    expect(joinNames(['Franklin, Benjamin', 'Adams, John'])).toBe('Benjamin Franklin; John Adams');
    expect(joinNames(['Franklin, Benjamin', 'Adams, John', 'Jay, John'])).toBe(
      'Benjamin Franklin; John Adams; John Jay',
    );
  });
});
