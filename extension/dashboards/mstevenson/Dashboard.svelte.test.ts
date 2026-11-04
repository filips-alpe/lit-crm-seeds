import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('mstevenson', 'Margaret Stevenson', '#6b4a7a');

describe('mstevenson dashboard', () => {
  it('shows the Craven Street years with her letters and life events', async () => {
    const records = [
      ...sampleRecords(user),
      makeRecord(user, 'life', { title: 'Birth of Polly', date: new Date('1743-05-01T00:00:00Z') }),
    ];
    const screen = render(Dashboard, { user, data: dataFor(user, records) });
    await expect
      .element(screen.getByRole('heading', { level: 1 }))
      .toHaveTextContent('Craven Street');
    expect(document.body.textContent).toContain('Craven Street, 1757–1775');
    expect(document.body.textContent).toContain('Birth of Polly');
  });

  it('renders the empty axis without data', async () => {
    const screen = render(Dashboard, { user, data: dataFor(user, []) });
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).toContain('Nothing on file yet.');
  });
});
