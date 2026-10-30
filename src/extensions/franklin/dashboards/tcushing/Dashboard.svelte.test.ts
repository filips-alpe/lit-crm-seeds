import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import * as m from '$lib/paraglide/messages.js';
import Dashboard from './Dashboard.svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';

const user = makeUser('tcushing', 'Thomas Cushing', '#4a4f7a');

describe('tcushing dashboard', () => {
  it('lists docket entries by type', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'petition', {
        title: 'Petition of the House',
        date: new Date('1773-06-01'),
      }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.body.textContent).toContain(m.tasty_zippy_hawk_commend());
    expect(document.body.textContent).toContain('Petition of the House');
  });

  it('renders empty dockets', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')).not.toBeNull();
    expect(document.body.textContent).toContain(m.quaint_calm_warbler_rush());
  });
});
