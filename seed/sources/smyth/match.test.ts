import { describe, expect, it } from 'vitest';
import type { FranklinDoc } from '../extract-fo';
import { matchDocuments, type SmythOutcome } from './match';
import type { SmythDocument } from './split';

function smyth(partial: Partial<SmythDocument>): SmythDocument {
  return {
    volume: 2,
    number: 46,
    title: 'To William Strahan',
    date: { iso: '1744-07-31', precision: 'day' },
    page: 280,
    text: 'SIR: — This encloses bills for twenty pounds, and more besides.',
    flags: [],
    dateConfirmed: true,
    ...partial,
  };
}

function fo(partial: Partial<FranklinDoc>): FranklinDoc {
  return {
    title: 'Benjamin Franklin to William Strahan, 31 July 1744',
    permalink: 'https://founders.archives.gov/documents/Franklin/01-02-02-0100',
    project: 'Franklin Papers',
    authors: ['Franklin, Benjamin'],
    recipients: ['Strahan, William'],
    'date-from': '1744-07-31',
    'date-to': '1744-07-31',
    ...partial,
  };
}

const onlyOutcome = (docs: SmythDocument[], records: FranklinDoc[]): SmythOutcome => {
  const { outcomes } = matchDocuments(docs, records);
  expect(outcomes).toHaveLength(docs.length);
  return outcomes[0];
};

describe('matchDocuments: letters', () => {
  it('matches on exact date and correspondent, citing the volume', () => {
    const { matches } = matchDocuments([smyth({})], [fo({})]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      permalink: 'https://founders.archives.gov/documents/Franklin/01-02-02-0100',
      text: smyth({}).text,
      source: {
        name: 'Internet Archive',
        url: 'https://archive.org/details/writingsofbenjam02franuoft',
      },
      matchMethod: 'exact-date+recipient',
    });
    expect(matches[0].source.edition).toContain('vol. 2, no. 46, p. 280');
  });

  it('ignores honorifics and particles in the addressee', () => {
    const { matches } = matchDocuments(
      [smyth({ title: 'To Comte de Vergennes' })],
      [fo({ recipients: ['Vergennes, Charles Gravier, comte de'] })],
    );
    expect(matches).toHaveLength(1);
  });

  it('matches any one of several addressees', () => {
    const { matches } = matchDocuments(
      [smyth({ title: 'To Josiah and Abiah Franklin' })],
      [fo({ recipients: ['Franklin, Josiah', 'Franklin, Abiah Folger'] })],
    );
    expect(matches).toHaveLength(1);
  });

  it('tolerates one OCR error in a long surname, at lower confidence', () => {
    const { matches } = matchDocuments(
      [smyth({ title: 'To Cadwallader Golden' })],
      [fo({ recipients: ['Colden, Cadwallader'] })],
    );
    expect(matches[0].matchMethod).toBe('exact-date+recipient-ocr-tolerant');
    expect(matches[0].confidence).toBeLessThan(
      matchDocuments([smyth({})], [fo({})]).matches[0].confidence,
    );
  });

  it('does not correct a surname with no given name to support it', () => {
    expect(
      onlyOutcome([smyth({ title: 'To Mr. Morris' })], [fo({ recipients: ['Norris, Isaac'] })])
        .reason,
    ).toBe('no-name-or-title-match');
  });

  it('does not match one institution to another sharing its first word', () => {
    expect(
      onlyOutcome(
        [smyth({ title: 'To the Committee of Foreign Affairs' })],
        [fo({ recipients: ['Committee of Secret Correspondence'] })],
      ).reason,
    ).toBe('no-name-or-title-match');
    expect(
      matchDocuments(
        [smyth({ title: 'To the Committee of Foreign Affairs' })],
        [fo({ recipients: ['Committee of Foreign Affairs'] })],
      ).matches,
    ).toHaveLength(1);
  });

  it('does not tolerate an OCR error in a short surname', () => {
    expect(
      onlyOutcome([smyth({ title: 'To John Ray' })], [fo({ recipients: ['Jay, John'] })]).reason,
    ).toBe('no-name-or-title-match');
  });

  it('rejects a surname match whose given name contradicts it', () => {
    expect(onlyOutcome([smyth({ title: 'To John Strahan' })], [fo({})]).reason).toBe(
      'no-name-or-title-match',
    );
  });

  it('recognises a maiden name filed inside the married name', () => {
    const { matches } = matchDocuments(
      [smyth({ title: 'To Miss Mary Stevenson' })],
      [fo({ recipients: ['Hewson, Mary (Polly) Stevenson'] })],
    );
    expect(matches).toHaveLength(1);
  });

  it('rejects a maiden name whose given name differs', () => {
    expect(
      onlyOutcome(
        [smyth({ title: 'To Miss Jane Stevenson' })],
        [fo({ recipients: ['Hewson, Mary (Polly) Stevenson'] })],
      ).reason,
    ).toBe('no-name-or-title-match');
  });

  it('recognises the first word of a compound surname', () => {
    const { matches } = matchDocuments(
      [smyth({ title: 'To Madame Brillon' })],
      [fo({ recipients: ['Brillon de Jouy, Anne-Louise Boivin'] })],
    );
    expect(matches).toHaveLength(1);
  });

  it('accepts an initial that agrees with the given name', () => {
    const { matches } = matchDocuments([smyth({ title: 'To W. Strahan' })], [fo({})]);
    expect(matches).toHaveLength(1);
  });

  it('matches a letter to Franklin only against a record addressed to him', () => {
    const toFranklin = fo({
      title: 'David Hartley to Benjamin Franklin, 31 July 1744',
      authors: ['Hartley, David'],
      recipients: ['Franklin, Benjamin'],
    });
    const title = 'From David Hartley to Benjamin Franklin';
    expect(matchDocuments([smyth({ title })], [toFranklin]).matches).toHaveLength(1);
    const wrongDirection = fo({ recipients: ['Hartley, David'] });
    expect(matchDocuments([smyth({ title })], [wrongDirection]).matches).toHaveLength(0);
  });

  it('does not match a letter Franklin did not write', () => {
    const other = fo({ authors: ['Adams, John'], recipients: ['Strahan, William'] });
    expect(matchDocuments([smyth({})], [other]).matches).toHaveLength(0);
  });
});

describe('matchDocuments: conservative refusals', () => {
  it('leaves a document unmatched when two records fit', () => {
    const outcome = onlyOutcome(
      [smyth({})],
      [fo({}), fo({ permalink: 'other', title: 'Benjamin Franklin to William Strahan (draft)' })],
    );
    expect(outcome).toMatchObject({ status: 'unmatched', reason: 'ambiguous' });
  });

  it('leaves both documents unmatched when they claim the same record', () => {
    const { matches, outcomes } = matchDocuments(
      [smyth({ number: 46 }), smyth({ number: 47 })],
      [fo({})],
    );
    expect(matches).toHaveLength(0);
    expect(outcomes.map((o) => o.reason)).toEqual(['contested-record', 'contested-record']);
  });

  it('never matches a flagged document', () => {
    expect(onlyOutcome([smyth({ flags: ['followed-by-gap'] })], [fo({})]).reason).toBe(
      'split-flagged',
    );
  });

  it('does not match a letter across a one-day date difference', () => {
    expect(onlyOutcome([smyth({})], [fo({ 'date-from': '1744-08-01' })]).reason).toBe(
      'no-record-on-date',
    );
  });

  it('does not match a letter dated only to the year', () => {
    expect(
      onlyOutcome([smyth({ date: { iso: '1744', precision: 'year' } })], [fo({})]).reason,
    ).toBe('no-exact-date');
  });

  it('does not match an unnamed addressee', () => {
    expect(onlyOutcome([smyth({ title: 'To -' })], [fo({})]).reason).toBe('no-name-or-title-match');
  });

  it('refuses a fragment too short to be the document', () => {
    expect(onlyOutcome([smyth({ text: 'B. FRANKLIN.' })], [fo({})]).reason).toBe('text-too-short');
  });
});

describe('matchDocuments: essays and other titled pieces', () => {
  const essay = fo({
    title: 'A Witch Trial at Mount Holly, 22 October 1730',
    recipients: [],
    'date-from': '1730-10-22',
  });

  it('matches an exact date with a closely overlapping title', () => {
    const { matches } = matchDocuments(
      [
        smyth({
          title: 'A Witch Trial at Mount Holly',
          date: { iso: '1730-10-22', precision: 'day' },
        }),
      ],
      [essay],
    );
    expect(matches[0].matchMethod).toBe('exact-date+title');
  });

  it('refuses an exact date with an unrelated title', () => {
    const doc = smyth({
      title: 'An Apology for Printers',
      date: { iso: '1730-10-22', precision: 'day' },
    });
    expect(onlyOutcome([doc], [essay]).reason).toBe('no-name-or-title-match');
  });

  it('accepts a year-only date only for a near-identical title', () => {
    const year = { iso: '1730', precision: 'year' } as const;
    const near = smyth({ title: 'A Witch Trial at Mount Holly', date: year });
    expect(matchDocuments([near], [essay]).matches[0].matchMethod).toBe('same-period+title');
    const loose = smyth({ title: 'A Witch Trial in Philadelphia', date: year });
    expect(matchDocuments([loose], [essay]).matches).toHaveLength(0);
  });
});

describe('matchDocuments: determinism', () => {
  it('gives identical output whatever order the records arrive in', () => {
    const docs = [smyth({ number: 46 }), smyth({ number: 47, title: 'To John Jay' })];
    const records = [
      fo({}),
      fo({ permalink: 'jay', title: 'Benjamin Franklin to John Jay', recipients: ['Jay, John'] }),
    ];
    expect(matchDocuments(docs, [...records].reverse())).toEqual(matchDocuments(docs, records));
  });
});
