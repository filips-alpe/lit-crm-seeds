import { describe, expect, it } from 'vitest';
import { exchangeMax, exchangeRows, lifeItems } from './exchange';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';

const user = makeUser('phewson', 'Polly Hewson');
const person = (name: string, sent: number, received: number) => ({
  name,
  sent,
  received,
  total: sent + received,
  first: null,
  last: null,
});

describe('phewson exchange', () => {
  it('drops silent correspondents and scales to the largest side', () => {
    const rows = exchangeRows([person('A', 5, 2), person('B', 0, 0)]);
    expect(rows).toHaveLength(1);
    expect(exchangeMax(rows)).toBe(5);
    expect(exchangeMax([])).toBe(1);
  });

  it('orders life events oldest first and falls back to from/to for the title', () => {
    const data = dataFor(user, [
      makeRecord(user, 'life', {
        title: null,
        from: 'Polly',
        to: 'London',
        date: new Date('1770-01-01'),
      }),
      makeRecord(user, 'life', { title: 'Marriage', date: new Date('1759-01-01') }),
      makeRecord(user, 'letter', { date: new Date('1760-01-01') }),
    ]);
    const items = lifeItems(data.recent);
    expect(items.map((i) => i.title)).toEqual(['Marriage', 'Polly · London']);
  });
});
