import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import * as m from '$lib/paraglide/messages.js';
import Dashboard from './Dashboard.svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';

const user = makeUser('tjefferson', 'Thomas Jefferson', '#5a6a3a');

describe('tjefferson dashboard', () => {
  it('shows the periods and the quoted letter', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', {
        title: 'To Franklin, Paris',
        description: 'The pleasure of your company',
        date: new Date('1785-02-01'),
      }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.querySelector('h1')).not.toBeNull();
    expect(document.body.textContent).toContain(m.glad_lazy_husky_aid());
    expect(document.body.textContent).toContain('The pleasure of your company');
  });

  it('renders with no records', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')).not.toBeNull();
    expect(document.body.textContent).toContain(m.quaint_calm_warbler_rush());
  });
});
