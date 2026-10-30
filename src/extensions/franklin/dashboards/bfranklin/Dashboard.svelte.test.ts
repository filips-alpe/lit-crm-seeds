import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('bfranklin', 'Benjamin Franklin', '#7a5230');

describe('bfranklin dashboard', () => {
  it('renders the masthead, decades and offices with sample data', async () => {
    const records = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', { date: new Date('1757-05-01') }),
    ];
    const screen = render(Dashboard, { user, data: dataFor(user, records) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Franklin/);
    expect(document.body.textContent).toContain('1750s');
    expect(document.body.textContent).toContain('Minister to France');
  });

  it('renders with no records at all', async () => {
    const screen = render(Dashboard, { user, data: dataFor(user, []) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Nothing on file yet.');
  });
});
