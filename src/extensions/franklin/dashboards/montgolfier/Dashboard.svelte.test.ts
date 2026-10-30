import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('montgolfier', 'Montgolfier paper-works, Annonay', '#7d6b58');

describe('montgolfier dashboard', () => {
  it('lists accounts in the ledger', () => {
    const raw = [
      makeRecord(user, 'account', {
        title: 'Bill for twenty reams',
        date: new Date('1783-04-01'),
      }),
      makeRecord(user, 'account', { title: 'Receipt for stock', date: new Date('1783-05-01') }),
      makeRecord(user, 'letter', { title: 'Letter on paper stock', date: new Date('1783-03-01') }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.querySelector('h1')?.textContent).toContain('Montgolfier');
    expect(document.body.textContent).toContain('Bill for twenty reams');
    expect(document.body.textContent).toContain('Receipt for stock');
    expect(document.body.textContent).toContain('Letters');
  });

  it('presents the role with a clear empty ledger', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')?.textContent).toContain('Montgolfier');
    expect(document.body.textContent).toContain('Illustrative role');
    expect(document.body.textContent).toContain('No orders on the books.');
  });
});
