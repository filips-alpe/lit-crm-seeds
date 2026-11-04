import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import * as m from '$lib/paraglide/messages.js';
import Dashboard from './Dashboard.svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';

const user = makeUser('phewson', 'Polly Hewson', '#2e6f7e');

describe('phewson dashboard', () => {
  it('shows the exchange and household events', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'life', {
        title: 'Marriage to William Hewson',
        date: new Date('1770-07-10'),
      }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.body.textContent).toContain(m.loved_bad_mare_fond());
    expect(document.body.textContent).toContain('Marriage to William Hewson');
    expect(document.body.textContent).toContain('Benjamin Franklin');
  });

  it('renders with no records', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')).not.toBeNull();
    expect(document.body.textContent).toContain(m.quaint_calm_warbler_rush());
  });
});
