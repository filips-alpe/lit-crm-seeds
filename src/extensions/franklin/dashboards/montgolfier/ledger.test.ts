import { describe, expect, it } from 'vitest';
import { accountRows } from './ledger';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('montgolfier', 'Montgolfier paper-works, Annonay');

describe('accountRows', () => {
  it('lists only accounts, newest first', () => {
    const { records } = dataFor(user, [
      makeRecord(user, 'account', { title: 'old', date: new Date('1780-01-01') }),
      makeRecord(user, 'account', {
        title: 'new',
        start: new Date('1784-01-01'),
        end: new Date('1784-06-01'),
      }),
      makeRecord(user, 'letter', { title: 'a letter', date: new Date('1785-01-01') }),
    ]);
    expect(accountRows(records).map((r) => r.title)).toEqual(['new', 'old']);
  });
  it('handles none', () => {
    expect(accountRows([])).toEqual([]);
  });
});
