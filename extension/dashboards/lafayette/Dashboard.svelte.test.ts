import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import * as m from '$lib/paraglide/messages.js';
import Dashboard from './Dashboard.svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';

const user = makeUser('lafayette', 'Marquis de Lafayette', '#3a4f8a');

describe('lafayette dashboard', () => {
  it('features the newest letter', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', { title: 'Dear General', date: new Date('1789-05-05') }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.body.textContent).toContain(m.this_trite_mongoose_intend());
    expect(document.body.textContent).toContain('Dear General');
  });

  it('renders with no records and without a hero', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')).not.toBeNull();
    expect(document.body.textContent).not.toContain(m.this_trite_mongoose_intend());
    expect(document.body.textContent).toContain(m.quaint_calm_warbler_rush());
  });
});
