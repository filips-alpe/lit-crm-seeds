import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import * as m from '$lib/paraglide/messages.js';
import Dashboard from './Dashboard.svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';

const user = makeUser('jadams', 'John Adams', '#3f5a6a');

describe('jadams dashboard', () => {
  it('renders the diary section with entries', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'diary', { title: 'Diary, 5 March 1778', date: new Date('1778-03-05') }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.querySelector('h1')?.textContent).toContain('Adams');
    expect(document.body.textContent).toContain(m.muddy_funny_beetle_dare());
    expect(document.querySelectorAll('a[href*="/data/"]').length).toBeGreaterThan(0);
  });

  it('renders with no records', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')).not.toBeNull();
    expect(document.body.textContent).toContain(m.quaint_calm_warbler_rush());
  });
});
