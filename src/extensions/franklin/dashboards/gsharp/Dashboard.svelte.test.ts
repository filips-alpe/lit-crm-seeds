import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { dataFor, makeRecord, makeUser, sampleRecords } from '../_kit/fixtures';
import Dashboard from './Dashboard.svelte';

const user = makeUser('gsharp', 'Granville Sharp', '#6a4a3a');

describe('gsharp dashboard', () => {
  it('renders petitions, letters and sources', () => {
    const raw = [
      ...sampleRecords(user),
      makeRecord(user, 'petition', {
        title: 'Memorial against the slave trade',
        date: new Date('1789-02-01'),
        references: ['https://founders.archives.gov/documents/Franklin/01-45-02-0001'],
      }),
    ];
    render(Dashboard, { user, data: dataFor(user, raw) });
    expect(document.querySelector('h1')?.textContent).toContain('Granville Sharp');
    expect(document.body.textContent).toContain('founders.archives.gov');
    expect(document.body.textContent).toContain('Petitions and memorials');
  });

  it('renders with no records', () => {
    render(Dashboard, { user, data: dataFor(user, []) });
    expect(document.querySelector('h1')?.textContent).toContain('Granville Sharp');
    expect(document.body.textContent).toContain('Nothing here yet.');
  });
});
