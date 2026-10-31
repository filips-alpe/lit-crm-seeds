import { describe, expect, it } from 'vitest';
import type { MatchedText } from '../../pipeline/text-merge';
import type { FranklinDoc } from '../extract-fo';
import { buildSmyth, renderReport, renderSpotCheck } from './build';

const PERMALINK = 'https://founders.archives.gov/documents/Franklin/01-02-02-0100';

const raw = [
  'CONTENTS',
  '46.  To  William  Strahan.     July  31,  1744      .  280 ',
  '47.  To  John  Jay.     August  2,  1744      .  281 ',
  '',
  '46.    TO  WILLIAM  STRAHAN ',
  '',
  'July  31,  1744. ',
  '',
  'SIR:  —  This  encloses  bills  for  twenty  pounds  and  more  besides.',
  '',
  '47.    TO  JOHN  JAY ',
  '',
  'August  2,  1744. ',
  '',
  'SIR:  —  A  second  letter,  which  no  record  on  this  date  will  fit.',
].join('\n');

const foDocs: FranklinDoc[] = [
  {
    title: 'Benjamin Franklin to William Strahan, 31 July 1744',
    permalink: PERMALINK,
    project: 'Franklin Papers',
    authors: ['Franklin, Benjamin'],
    recipients: ['Strahan, William'],
    'date-from': '1744-07-31',
    'date-to': '1744-07-31',
  },
];

const existingText: MatchedText = {
  permalink: PERMALINK,
  text: 'Cleaner text.',
  source: { name: 'Wikisource', edition: 'x', url: 'https://en.wikisource.org/wiki/X' },
  matchMethod: 'direct',
  confidence: 1,
};

describe('buildSmyth', () => {
  it('reports matched and unmatched documents', () => {
    const result = buildSmyth([{ volume: 2, raw }], foDocs, []);
    expect(result.matches.map((m) => m.permalink)).toEqual([PERMALINK]);
    expect(result.outcomes.map((o) => o.status)).toEqual(['matched', 'unmatched']);
    expect(result.outcomes[1].reason).toBe('no-record-on-date');
  });

  it('does not replace text a record already has', () => {
    const result = buildSmyth([{ volume: 2, raw }], foDocs, [existingText]);
    expect(result.matches).toEqual([]);
    expect(result.alreadyHasText).toBe(1);
    expect(result.existingTextCount).toBe(1);
  });

  it('does not match a record the seed drops', () => {
    const editorial: FranklinDoc = {
      ...foDocs[0],
      title: 'Editorial Note to Strahan, 31 July 1744',
    };
    expect(buildSmyth([{ volume: 2, raw }], [editorial], []).matches).toEqual([]);
  });

  it('gives byte-identical output on a re-run', () => {
    const run = () => {
      const result = buildSmyth([{ volume: 2, raw }], foDocs, []);
      return (
        JSON.stringify(result.matches) + JSON.stringify(result.outcomes) + renderReport(result)
      );
    };
    expect(run()).toBe(run());
  });
});

describe('renderSpotCheck', () => {
  it('links each sampled match to its record, next to the matched text', () => {
    const sheet = renderSpotCheck(buildSmyth([{ volume: 2, raw }], foDocs, []), foDocs);
    expect(sheet).toContain(`[Benjamin Franklin to William Strahan, 31 July 1744](${PERMALINK})`);
    expect(sheet).toContain('vol. 2, no. 46, p. 280');
    expect(sheet).toContain('This encloses bills');
  });
});

describe('renderReport', () => {
  it('states match rate, coverage and unmatched count', () => {
    const report = renderReport(buildSmyth([{ volume: 2, raw }], foDocs, []));
    expect(report).toContain('Documents split: **2**');
    expect(report).toContain('Left unmatched: **1**');
    expect(report).toContain('Matched to a Founders Online record: **1** (50.0% of documents)');
    expect(report).toContain('| no-record-on-date | 1 |');
    expect(report).toContain('## OCR quality issues');
    expect(report).toContain('no letter by Franklin after 1744-07-31');
    expect(report).toContain('signed lines in merged texts had no recognisable mark');
    expect(report).toContain('printed twice and agrees (contents table and dateline): 1 of 1');
  });
});
