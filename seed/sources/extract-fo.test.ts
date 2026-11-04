import { describe, expect, it } from 'vitest';
import {
  buildCircleSnapshot,
  buildFranklinSnapshot,
  selectCircleDocs,
  topCorrespondents,
  involvesFranklin,
  isFranklinPapers,
  normalizeDedupeKey,
  type FoDoc,
} from './extract-fo';

function doc(partial: Partial<FoDoc>): FoDoc {
  return {
    title: 'Untitled',
    permalink: 'https://founders.archives.gov/documents/Franklin/00-00-00-0000',
    project: 'Franklin Papers',
    authors: [],
    recipients: [],
    ...partial,
  };
}

describe('normalizeDedupeKey', () => {
  it('strips bracketed editorial asides', () => {
    expect(normalizeDedupeKey('A Letter [Extract]', '1776-08-28')).toBe(
      normalizeDedupeKey('A Letter', '1776-08-28'),
    );
  });

  it('strips the trailing date fragment', () => {
    expect(
      normalizeDedupeKey('Benjamin Franklin to John Adams, 28 August 1776', '1776-08-28'),
    ).toBe(normalizeDedupeKey('Benjamin Franklin to John Adams', '1776-08-28'));
  });

  it('is case- and punctuation-insensitive', () => {
    expect(normalizeDedupeKey('Benjamin Franklin to John Adams', '1776-08-28')).toBe(
      normalizeDedupeKey('BENJAMIN FRANKLIN TO JOHN ADAMS!', '1776-08-28'),
    );
  });

  it('differs when the date differs', () => {
    expect(normalizeDedupeKey('Same Title', '1776-08-28')).not.toBe(
      normalizeDedupeKey('Same Title', '1776-08-29'),
    );
  });
});

describe('isFranklinPapers / involvesFranklin', () => {
  it('isFranklinPapers matches only the Franklin Papers project', () => {
    expect(isFranklinPapers(doc({ project: 'Franklin Papers' }))).toBe(true);
    expect(isFranklinPapers(doc({ project: 'Adams Papers' }))).toBe(false);
  });

  it('involvesFranklin matches exact "Franklin, Benjamin" as author or recipient', () => {
    expect(involvesFranklin(doc({ authors: ['Franklin, Benjamin'] }))).toBe(true);
    expect(involvesFranklin(doc({ recipients: ['Franklin, Benjamin'] }))).toBe(true);
    expect(involvesFranklin(doc({ authors: ['Franklin, William'] }))).toBe(false);
  });
});

describe('buildFranklinSnapshot', () => {
  it('includes every Franklin Papers doc', () => {
    const raw = [doc({ project: 'Franklin Papers', title: 'A' })];
    expect(buildFranklinSnapshot(raw)).toHaveLength(1);
  });

  it('includes a standalone bfOther doc with no FP match', () => {
    const raw = [
      doc({
        project: 'Adams Papers',
        title: 'Unique Letter, 1 January 1776',
        'date-from': '1776-01-01',
        authors: ['Franklin, Benjamin'],
      }),
    ];
    expect(buildFranklinSnapshot(raw)).toHaveLength(1);
  });

  it('excludes other-project docs that do not involve Franklin', () => {
    const raw = [doc({ project: 'Adams Papers', authors: ['Adams, John'] })];
    expect(buildFranklinSnapshot(raw)).toHaveLength(0);
  });

  it('merges a cross-project duplicate: keeps FP permalink primary, appends the other as altPermalinks', () => {
    const raw = [
      doc({
        project: 'Franklin Papers',
        title: 'Benjamin Franklin to John Adams, 28 August 1776',
        'date-from': '1776-08-28',
        permalink: 'https://founders.archives.gov/documents/Franklin/01-22-02-0346',
        authors: ['Franklin, Benjamin'],
        recipients: ['Adams, John'],
      }),
      doc({
        project: 'Adams Papers',
        title: 'Benjamin Franklin to John Adams, 28 August 1776',
        'date-from': '1776-08-28',
        permalink: 'https://founders.archives.gov/documents/Adams/06-04-02-0236',
        authors: ['Franklin, Benjamin'],
        recipients: ['Adams, John'],
      }),
    ];
    const snapshot = buildFranklinSnapshot(raw);
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].permalink).toBe(
      'https://founders.archives.gov/documents/Franklin/01-22-02-0346',
    );
    expect(snapshot[0].altPermalinks).toEqual([
      'https://founders.archives.gov/documents/Adams/06-04-02-0236',
    ]);
  });

  it('does not merge FP-internal title+date collisions (same project, same key)', () => {
    const raw = [
      doc({
        project: 'Franklin Papers',
        title: 'Minutes of the Committee, 12 August 1772',
        'date-from': '1772-08-12',
        permalink: 'a',
      }),
      doc({
        project: 'Franklin Papers',
        title: 'Minutes of the Committee, 12 August 1772: résumé',
        'date-from': '1772-08-12',
        permalink: 'b',
      }),
    ];
    // Different normalized keys (résumé isn't stripped) -> both kept as separate entries.
    expect(buildFranklinSnapshot(raw)).toHaveLength(2);
  });
});

describe('topCorrespondents', () => {
  it('ranks individual correspondents of Franklin, skipping groups, firms and Franklin himself', () => {
    const raw = [
      doc({ authors: ['Franklin, Benjamin'], recipients: ['Lee, Arthur'] }),
      doc({ authors: ['Lee, Arthur'], recipients: ['Franklin, Benjamin'] }),
      doc({ authors: ['Franklin, Benjamin'], recipients: ['Strahan, William'] }),
      doc({ authors: ['Franklin, Benjamin'], recipients: ['American Commissioners'] }),
      doc({ authors: ['Franklin, Benjamin'], recipients: ['Hall & Sellers'] }),
      doc({ authors: ['Lee, Arthur'], recipients: ['Strahan, William'] }), // no Franklin
    ];
    expect(topCorrespondents(raw, 5)).toEqual([
      { name: 'Lee, Arthur', count: 2 },
      { name: 'Strahan, William', count: 1 },
    ]);
  });
});

describe('selectCircleDocs', () => {
  const top = [
    { name: 'Lee, Arthur', count: 9 },
    { name: 'Strahan, William', count: 8 },
  ];
  const select = (docs: FoDoc[], exclude: string[] = []) =>
    selectCircleDocs(docs, top, new Set(exclude)).map((d) => d.title);

  it('rule A: keeps docs with a demo user other than Adams/Jefferson/Lafayette', () => {
    const d = doc({
      title: 'A',
      authors: ['Collinson, Peter'],
      recipients: ['Unknown, Person'],
      'date-from': '1760-01-01',
    });
    expect(select([d])).toEqual(['A']);
  });

  it('rule B: keeps docs whose every participant is in the circle, not partial ones', () => {
    const inside = doc({
      title: 'B',
      authors: ['Lee, Arthur'],
      recipients: ['Strahan, William'],
      'date-from': '1770-01-01',
    });
    const partial = doc({
      title: 'B2',
      authors: ['Lee, Arthur'],
      recipients: ['Strahan, William', 'Nobody, Known'],
      'date-from': '1770-01-01',
    });
    expect(select([inside, partial])).toEqual(['B']);
  });

  it('rule C: keeps Adams docs of 1776-1785 only', () => {
    const adams = (title: string, date: string) =>
      doc({
        title,
        authors: ['Adams, John'],
        recipients: ['Nobody, Known'],
        'date-from': date,
      });
    expect(
      select([
        adams('in', '1780-05-01'),
        adams('before', '1775-12-31'),
        adams('after', '1786-01-01'),
      ]),
    ).toEqual(['in']);
  });

  it('drops docs after Franklin death, docs involving Franklin and excluded permalinks', () => {
    const late = doc({ title: 'late', authors: ['Collinson, Peter'], 'date-from': '1790-04-18' });
    const bf = doc({
      title: 'bf',
      authors: ['Collinson, Peter'],
      recipients: ['Franklin, Benjamin'],
    });
    const ex = doc({ title: 'ex', permalink: 'p://ex', authors: ['Collinson, Peter'] });
    expect(select([late, bf, ex], ['p://ex'])).toEqual([]);
  });
});

describe('buildCircleSnapshot', () => {
  it('appends circle docs after the Franklin snapshot and merges cross-project duplicates', () => {
    const franklin = doc({
      title: 'Benjamin Franklin to Peter Collinson, 1 May 1760',
      permalink: 'p://f',
      authors: ['Franklin, Benjamin'],
      recipients: ['Collinson, Peter'],
      'date-from': '1760-05-01',
    });
    const a = doc({
      title: 'Peter Collinson to Ezra Stiles, 1 May 1761',
      permalink: 'p://a',
      project: 'Adams Papers',
      authors: ['Collinson, Peter'],
      recipients: ['Stiles, Ezra'],
      'date-from': '1761-05-01',
    });
    const dup = { ...a, permalink: 'p://dup', project: 'Jefferson Papers' };
    const { docs } = buildCircleSnapshot([franklin, a, dup]);
    expect(docs.map((d) => d.permalink)).toEqual(['p://f', 'p://a']);
    expect(docs[1].altPermalinks).toEqual(['p://dup']);
  });
});
