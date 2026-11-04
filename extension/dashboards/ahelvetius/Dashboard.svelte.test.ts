import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('ahelvetius', 'Anne-Catherine Helvétius', '#8a5a7a');

describe('ahelvetius dashboard', () => {
  it('renders the salon with its letters and years', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', { date: new Date('1779-10-19'), title: 'Bagatelle' }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.querySelector('h1')?.textContent).toContain('Helvétius');
    expect(document.body.textContent).toContain('Seasons of the correspondence');
    expect(document.body.textContent).toContain('1779');
  });

  it('renders a quiet salon when empty', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.body.textContent).toContain('The salon is quiet');
  });
});
