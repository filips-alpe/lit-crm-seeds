import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import * as m from '$lib/paraglide/messages.js';
import Dashboard from './Dashboard.svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';

const user = makeUser('pcollinson', 'Peter Collinson', '#2e5a4a');

describe('pcollinson dashboard', () => {
  it('numbers the communications and shows the Society', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'membership', {
        title: 'Fellow of the Royal Society',
        date: new Date('1728-01-01'),
        to: 'Royal Society',
      }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.body.textContent).toContain(m.few_chunky_carp_type({ numeral: 'I' }));
    expect(document.querySelectorAll('a[href*="/data/"]').length).toBeGreaterThan(0);
  });

  it('renders with no records', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')).not.toBeNull();
    expect(document.body.textContent).toContain(m.quaint_calm_warbler_rush());
  });
});
