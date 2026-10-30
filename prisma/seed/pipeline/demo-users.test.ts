import { describe, expect, it } from 'vitest';
import { demoUsernameFor, DEMO_USER_PATTERNS } from './demo-users';

describe('demoUsernameFor', () => {
  it('resolves FO catalog names to demo usernames', () => {
    expect(demoUsernameFor('Franklin, Benjamin')).toBe('bfranklin');
    expect(demoUsernameFor('Franklin, William Temple')).toBe('wtfranklin');
    expect(demoUsernameFor('Franklin, William')).toBe('wfranklin');
    expect(demoUsernameFor('Hewson, Mary (Polly) Stevenson')).toBe('phewson');
    expect(demoUsernameFor('Cushing, Thomas')).toBe('tcushing');
  });

  it('does not match namesakes', () => {
    expect(demoUsernameFor('Franklin, James')).toBeUndefined();
    expect(demoUsernameFor('Cushing, Thomas, Sr.')).toBeUndefined();
    expect(demoUsernameFor('Adams, John Quincy')).toBeUndefined();
  });

  it('covers all 17 demo users', () => {
    expect(new Set(DEMO_USER_PATTERNS.map((u) => u.username)).size).toBe(17);
  });
});
