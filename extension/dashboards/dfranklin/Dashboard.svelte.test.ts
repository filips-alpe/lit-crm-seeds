import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('dfranklin', 'Deborah Read Franklin', '#8a2f3e');

describe('dfranklin dashboard', () => {
  it('shows the letters count, the silence and life events', async () => {
    const records = [
      ...sampleRecords(user),
      makeRecord(user, 'life', { title: 'Marriage', date: new Date('1730-09-01T00:00:00Z') }),
    ];
    const screen = render(Dashboard, { user, data: dataFor(user, records) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Marriage');
    expect(document.body.textContent).toContain('1783');
  });

  it('renders empty', async () => {
    const screen = render(Dashboard, { user, data: dataFor(user, []) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Nothing recorded yet.');
  });
});
