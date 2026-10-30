import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('wfranklin', 'William Franklin', '#5a3a2e');

describe('wfranklin dashboard', () => {
  it('shows the father and son exchange and the war split', async () => {
    const records = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', {
        date: new Date('1770-01-01'),
        from: user.name,
        to: 'Benjamin Franklin',
      }),
    ];
    const screen = render(Dashboard, { user, data: dataFor(user, records) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Wrote to Benjamin Franklin');
    expect(document.body.textContent).toContain('Before 1776');
  });

  it('renders empty', async () => {
    const screen = render(Dashboard, { user, data: dataFor(user, []) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Nothing recorded yet.');
  });
});
