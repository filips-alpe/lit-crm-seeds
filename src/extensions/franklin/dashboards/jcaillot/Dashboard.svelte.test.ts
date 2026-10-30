import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('jcaillot', 'Jacques Caillot', '#5e503f');

describe('jcaillot dashboard', () => {
  it('shows what he holds when there are records', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', { title: 'Order for the press', date: new Date('1783-02-01') }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.querySelector('h1')?.textContent).toContain('Jacques Caillot');
    expect(document.body.textContent).toContain('On the bench');
    expect(document.body.textContent).toContain('By kind of paper');
  });

  it('presents the role with a clear empty state', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')?.textContent).toContain('Jacques Caillot');
    expect(document.body.textContent).toContain('Illustrative role');
    expect(document.body.textContent).toContain('No records are held in this name');
    expect(document.body.textContent).not.toContain('On the bench');
  });
});
