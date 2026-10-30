import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('estiles', 'Ezra Stiles', '#4a5a5a');

describe('estiles dashboard', () => {
  it('renders the creed, periods and essays', () => {
    const period = {
      projectId: 'p1',
      project: { id: 'p1', code: 'periode-france-1776-1785', color: '#336' },
    };
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'letter', {
        title: 'To Ezra Stiles',
        date: new Date('1790-03-09'),
        projects: [period],
      }),
      makeRecord(user, 'essay', { title: 'On the Creed', date: new Date('1790-03-09') }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.querySelector('h1')?.textContent).toContain('Ezra Stiles');
    expect(document.body.textContent).toContain('I believe in one God');
    expect(document.body.textContent).toContain('France 1776–1785');
    expect(document.body.textContent).toContain('Essays');
  });

  it('renders with no records, creed intact', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')?.textContent).toContain('Ezra Stiles');
    expect(document.body.textContent).toContain('I believe in one God');
    expect(document.body.textContent).toContain('Nothing here yet.');
  });
});
