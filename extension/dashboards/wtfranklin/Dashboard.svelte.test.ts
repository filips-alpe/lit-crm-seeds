import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('wtfranklin', 'William Temple Franklin', '#3a5a40');

describe('wtfranklin dashboard', () => {
  it('shows the Passy years with sample data', async () => {
    const records = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', { date: new Date('1778-02-01') }),
    ];
    const screen = render(Dashboard, { user, data: dataFor(user, records) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Busiest year: 1778');
  });

  it('renders empty', async () => {
    const screen = render(Dashboard, { user, data: dataFor(user, []) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Nothing recorded yet.');
  });
});
