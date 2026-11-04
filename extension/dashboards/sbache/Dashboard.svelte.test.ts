import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('sbache', 'Sarah Bache', '#9a3f5e');

describe('sbache dashboard', () => {
  it('leads with Dear Sally and her letters, with a located journey', async () => {
    const records = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', {
        date: new Date('1784-04-04'),
        from: 'Benjamin Franklin',
        to: 'Sarah Bache',
        fromGeo: '48.85,2.27',
        toGeo: '39.95,-75.16',
        mine: 'assignee',
      }),
    ];
    render(Dashboard, { user, data: dataFor(user, records) });
    expect(document.body.textContent).toContain('Dear Sally');
    expect(document.body.textContent).toContain('Miles a letter travelled');
  });

  it('renders empty', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.body.textContent).toContain('No letters from your father yet.');
  });
});
