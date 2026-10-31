import { describe, expect, it } from 'vitest';
import { cleanBody, parseContents, parseSmythDate, splitVolume } from './split';

describe('parseSmythDate', () => {
  it('parses a full date to an ISO day', () => {
    expect(parseSmythDate('July 31, 1744')).toEqual({ iso: '1744-07-31', precision: 'day' });
  });

  it('keeps month-only and year-only dates at their real precision', () => {
    expect(parseSmythDate('March, 1778')).toEqual({ iso: '1778-03', precision: 'month' });
    expect(parseSmythDate('1777')).toEqual({ iso: '1777', precision: 'year' });
  });

  it('repairs letter-for-digit OCR only inside the year', () => {
    expect(parseSmythDate('July 31, I744')).toEqual({ iso: '1744-07-31', precision: 'day' });
  });

  it('refuses spans, garbled days and impossible dates rather than guessing', () => {
    expect(parseSmythDate('July 22-October 11, 1726')).toBeUndefined();
    expect(parseSmythDate('February n, 1723')).toBeUndefined();
    expect(parseSmythDate('February 31, 1723')).toBeUndefined();
    expect(parseSmythDate('July 31, 1999')).toBeUndefined();
  });
});

describe('parseContents', () => {
  it('reads number, title, date and page, joining wrapped entries', () => {
    const entries = parseContents([
      'CONTENTS',
      '',
      'NO.  PAGE',
      '',
      '7.  To  Miss  Jane  Franklin.     January  6,  1727      ....  87 ',
      '',
      '11.  A  Modest  Enquiry  into  the  Nature  and  Necessity  of  a  Paper ',
      '',
      'Currency.     April  3,  1729 133 ',
      '',
    ]);
    expect(entries).toEqual([
      {
        number: 7,
        title: 'To Miss Jane Franklin',
        date: { iso: '1727-01-06', precision: 'day' },
        page: 87,
      },
      {
        number: 11,
        title: 'A Modest Enquiry into the Nature and Necessity of a Paper Currency',
        date: { iso: '1729-04-03', precision: 'day' },
        page: 133,
      },
    ]);
  });

  it('leaves the date undefined for a span', () => {
    const [entry] = parseContents([
      'CONTENTS',
      '6.  Journal  of  a  Voyage  from  London  to  Philadelphia.     July  22- ',
      'October  11,  1726 53 ',
    ]);
    expect(entry.title).toBe('Journal of a Voyage from London to Philadelphia');
    expect(entry.date).toBeUndefined();
    expect(entry.page).toBe(53);
  });
});

describe('parseContents on noisy OCR', () => {
  it('ignores stray numbers that break the increasing sequence', () => {
    const entries = parseContents([
      'CONTENTS',
      '103.  To  John  Adams.     June  1,  1750  .  10 ',
      '1.  ......  ',
      '104.  To  John  Jay.     June  2,  1750  .  11 ',
    ]);
    expect(entries.map((e) => e.number)).toEqual([103, 104]);
  });

  it('keeps a capitalised row, recognising it by its date', () => {
    const entries = parseContents([
      'CONTENTS',
      '815.  To  John  Adams.     June  1,  1777  .  10 ',
      '816.  TO  THE  COMMITTEE.     June  2,  1777  .  11 ',
      '817.  To  John  Jay.     June  3,  1777  .  12 ',
    ]);
    expect(entries.map((e) => e.number)).toEqual([815, 816, 817]);
  });
});

describe('parseContents date extraction', () => {
  const entry = (row: string) => parseContents(['CONTENTS', row])[0];

  it('reads the date despite OCR junk before the page number', () => {
    expect(
      entry('1200.  To  John  Jay.     April  12, 1781     .   .»,./•   •  238 '),
    ).toMatchObject({
      title: 'To John Jay',
      date: { iso: '1781-04-12' },
      page: 238,
    });
  });

  it('rejoins a day split in two by OCR', () => {
    expect(
      entry('1386.  To  Comte  de  Vergennes.     January  1 8,  1783   ...  8 ').date?.iso,
    ).toBe('1783-01-18');
  });

  it('reads a bracketed year', () => {
    expect(
      entry('1202.  To  Miss  Georgiana  Shipley.     [1781]     L,,,,;    242 ').date,
    ).toEqual({
      iso: '1781',
      precision: 'year',
    });
  });

  it('does not let garbage after a date replace it', () => {
    const entries = parseContents([
      'CONTENTS',
      '185.   To  James  Wright.     June  26,  1755 ',
      '+  «•**  1  i   1  ,  1  /  V  W  f ',
      '186.   To  John  Jay.     March  14,  1755 ',
    ]);
    expect(entries[0].date?.iso).toBe('1755-06-26');
  });

  it('treats a qualified date as no exact date', () => {
    expect(
      entry('13.  Dialogues  on  Virtue.     June  23,  and  July  9,  1730 157 '),
    ).toMatchObject({
      title: 'Dialogues on Virtue',
      page: 157,
    });
    expect(
      entry('13.  Dialogues  on  Virtue.     June  23,  and  July  9,  1730 157 ').date,
    ).toBeUndefined();
  });
});

describe('cleanBody', () => {
  it('drops both running-head forms and rejoins a paragraph across the page break', () => {
    const text = cleanBody([
      'I  desire  you  to  take  the  properest',
      '',
      '',
      '280      THE  WRITINGS  OF  BENJAMIN  FRANKLIN      [1744 ',
      '',
      'measures  for  getting  them  sold.',
      '',
      '',
      '1778]  AURORA  BOREALIS  209 ',
      '',
      'Air  being  thus  made  lighter  rises.',
    ]);
    expect(text).toBe(
      'I desire you to take the properest measures for getting them sold.\n\nAir being thus made lighter rises.',
    );
  });

  it('removes a page-end footnote block and in-text footnote marks', () => {
    const text = cleanBody([
      'the  ever  amiable  Brillante.1',
      '',
      "1  For  the  history  of  this  bagatelle  see  Franklin's  letter.",
      'It  has  been  generally  said.  —  ED.',
      '',
      '',
      '1778]  AURORA  BOREALIS  209 ',
      '',
      'To  me,  after  all.',
    ]);
    expect(text).toBe('the ever amiable Brillante.\n\nTo me, after all.');
  });

  it('removes a footnote whose mark OCR read as the letter a', () => {
    expect(
      cleanBody(['Body  text  here.2', '', 'a  Richard  Boulton,  The  Works,  London.', '']),
    ).toBe('Body text here.');
  });

  it('removes a note continued from the previous page, recognised by its signature', () => {
    expect(
      cleanBody([
        '1699.  4  vols.  Octavo.  Peter  Shaw,  London:  1738.  —  ED. ',
        '',
        'Franklin  resumes  his  letter.',
      ]),
    ).toBe('Franklin resumes his letter.');
  });

  it.each([
    '1 78 1]  TO  MRS.   CAROLINE  EDES  339 ',
    '1  73i]  AN  APOLOGY  FOR  PRINTERS  177 ',
    'I75o]  TO  PETER  COLLINSON  425 ',
    '•750]  TO  MRS.  ABIAH  FRANKLIN  3 ',
    'I755J  TO  JARED  ELIOT  281 ',
    '1750  TO  JARED  ELIOT  53 ',
    '1750  TO  PETER  COLLINSOtf  49 ',
    '1760]  TO  PETER  FRANKLIN  t$ ',
    'I74SJ  TO  JOHN"  FRANKLIN,  AT  BOSTON  283 ',
    'TO  PHILIP  SCHUYLER  447 ',
    '14      THE  WRITINGS  OF  BENJAMIN  FRANKUN      [1750 ',
    '54      THE  WRITINGS  OF  BENJAMIN-  FRANKLIN     [1751 ',
    '1 82      THE  WRITINGS  OF  BENJAMIN  FRANKLIN     [1774 ',
  ])('recognises the garbled running head %s', (head) => {
    expect(cleanBody(['Permit  me', '', '', head, '', 'to  repeat  my  Thanks.'])).toBe(
      'Permit me to repeat my Thanks.',
    );
  });

  it('removes a running head the OCR broke over several lines', () => {
    expect(
      cleanBody([
        'the  cost  to  have',
        '',
        '1779] ',
        '',
        'TO  CHARLES  EPP ',
        '',
        '371 ',
        '',
        'it  sent.',
      ]),
    ).toBe('the cost to have it sent.');
  });

  it('stops skipping a broken head at the first line of prose', () => {
    expect(cleanBody(['Ending.', '', '1779] ', '', 'Prose  resumes  here.', '', 'More.'])).toBe(
      'Ending.\n\nProse resumes here.\n\nMore.',
    );
  });

  it('keeps the next page when a note precedes a running head it cannot recognise', () => {
    const text = cleanBody([
      'Permit  me',
      '',
      '1  See  the  Duke,  who  said  they  were  well  combined.  —  ED. ',
      '',
      'to  repeat  my  Thanks  for  your  elegant  Present.',
    ]);
    expect(text).toContain('to repeat my Thanks');
    expect(text).not.toContain('Duke');
  });

  it('keeps a signature directly above a signed note', () => {
    expect(
      cleanBody([
        'most  humble  Servant, ',
        '',
        'B.   FRANKLIN1 ',
        "1  For  Josiah  Tucker's  reply,  see  page  198.  —  ED. ",
      ]),
    ).toBe('most humble Servant,\n\nB. FRANKLIN');
  });

  it('keeps a page that is one paragraph opening like a note', () => {
    expect(
      cleanBody([
        'I  shall  apply  Myself  to  such',
        '',
        '',
        '212   THE  WRITINGS  OF  BENJAMIN  FRANKLIN  [1763 ',
        '',
        'a  Settlement  of  all  my  Affairs.',
      ]),
    ).toBe('I shall apply Myself to such a Settlement of all my Affairs.');
  });

  it('keeps a last paragraph opening like a note when the page has no such mark', () => {
    const text = cleanBody(['First  paragraph.', '', '3  Pounds  more  were  still  wanting.']);
    expect(text).toContain('3 Pounds more were still wanting.');
  });

  it('removes a printer sheet mark', () => {
    for (const mark of ['VOL.  IX  —  L ', 'VOL.  Ill  —  2  D ']) {
      expect(cleanBody(['Your  humble  Servant.', '', mark, '', 'Return  that.'])).toBe(
        'Your humble Servant.\n\nReturn that.',
      );
    }
  });

  it('keeps a numbered list item in the middle of a page', () => {
    const text = cleanBody(['1  Hogshead  of  sugar.', '', 'And  the  rest  of  the  account.']);
    expect(text).toContain('Hogshead');
  });

  it('joins words hyphenated across a line end', () => {
    expect(cleanBody(['towards  forming  an  Hypothe- ', 'sis  for  its  Explanation.'])).toBe(
      'towards forming an Hypothesis for its Explanation.',
    );
  });
});

function volume(bodyLines: string[], contents: string[]): string {
  return ['CONTENTS', '', ...contents, '', ...bodyLines].join('\n');
}

describe('splitVolume', () => {
  const contents = [
    '46.  To  William  Strahan.     July  31,  1744      .  280 ',
    '47.  To  Josiah  and  Abiah  Franklin.     April  13,  1738    .  281 ',
  ];

  it('splits on numbered headings that agree with the contents', () => {
    const docs = splitVolume(
      volume(
        [
          '46.    TO  WILLIAM  STRAHAN ',
          '',
          'July  31,  1744. ',
          '',
          'SIR:  —  This  encloses  bills.',
          '',
          '47.    TO   JOSIAH  AND  ABIAH  FRANKLIN1 ',
          '',
          'April  13,  1738. ',
          '',
          'HONOURED  FATHER  AND  MOTHER,  I  have  your  favour.',
        ],
        contents,
      ),
      2,
    );
    expect(docs.map((d) => d.number)).toEqual([46, 47]);
    expect(docs[0]).toMatchObject({
      volume: 2,
      title: 'To William Strahan',
      date: { iso: '1744-07-31', precision: 'day' },
      page: 280,
      flags: [],
    });
    expect(docs[0].text).toBe('July 31, 1744.\n\nSIR: — This encloses bills.');
    expect(docs[1].text).toContain('I have your favour.');
  });

  it('ignores a numbered caps line whose text disagrees with the contents entry', () => {
    const docs = splitVolume(
      volume(
        [
          '46.    TO  WILLIAM  STRAHAN ',
          '',
          'July  31,  1744. ',
          '',
          'Virtues  follow.',
          '',
          '47.    JUSTICE. ',
          '',
          'Wrong  none.',
        ],
        contents,
      ),
      2,
    );
    expect(docs.map((d) => d.number)).toEqual([46]);
    expect(docs[0].text).toContain('Wrong none.');
  });

  it('flags a document followed by a gap, since it may contain the missing one', () => {
    const docs = splitVolume(
      volume(
        ['45.    TO  JOHN  ADAMS ', '', 'Text.', '', '47.    TO  JOHN  JAY ', '', 'Text.'],
        [
          '45.  To  John  Adams.     June  1,  1780  .  10 ',
          '46.  To  Mary  Hewson.     June  2,  1780  .  10 ',
          '47.  To  John  Jay.     June  3,  1780  .  10 ',
        ],
      ),
      8,
    );
    expect(docs.find((d) => d.number === 45)?.flags).toContain('followed-by-gap');
    expect(docs.find((d) => d.number === 47)?.flags).not.toContain('followed-by-gap');
  });

  it('records when contents and dateline independently agree on the date', () => {
    const [confirmed] = splitVolume(
      volume(['46.    TO  WILLIAM  STRAHAN ', '', 'July  31,  1744. ', '', 'Text.'], contents),
      2,
    );
    expect(confirmed.dateConfirmed).toBe(true);
    const [unconfirmed] = splitVolume(
      volume(['46.    TO  WILLIAM  STRAHAN ', '', 'Text.'], contents),
      2,
    );
    expect(unconfirmed.dateConfirmed).toBe(false);
  });

  it('flags a document whose contents and dateline dates disagree', () => {
    const [doc] = splitVolume(
      volume(['46.    TO  WILLIAM  STRAHAN ', '', 'August  2,  1744. ', '', 'Text.'], contents),
      2,
    );
    expect(doc.flags).toContain('date-conflict');
  });

  it('falls back to the dateline when the contents date is unreadable', () => {
    const [doc] = splitVolume(
      volume(
        ['46.    TO  WILLIAM  STRAHAN ', '', 'Philadelphia,  July  31,  1744. ', '', 'Text.'],
        ['46.  To  William  Strahan.     July  3i,  1744      .  280 '],
      ),
      2,
    );
    expect(doc.date).toEqual({ iso: '1744-07-31', precision: 'day' });
    expect(doc.flags).toEqual([]);
  });

  it('flags a document containing an unrecognised letter heading', () => {
    const [doc] = splitVolume(
      volume(
        ['46.    TO  WILLIAM  STRAHAN ', '', 'Text.', '', 'l047.    TO  JOHN  ADAMS ', '', 'More.'],
        contents.slice(0, 1),
      ),
      2,
    );
    expect(doc.flags).toContain('swallowed-heading');
  });

  it('flags a document far longer than its contents page span allows', () => {
    const long = Array.from(
      { length: 300 },
      () => 'A  full  line  of  ordinary  prose  text  here,',
    );
    const [doc] = splitVolume(
      volume(
        ['46.    TO  WILLIAM  STRAHAN ', '', 'July  31,  1744. ', '', ...long],
        [
          '46.  To  William  Strahan.     July  31,  1744      .  280 ',
          '47.  To  Josiah  Franklin.     April  13,  1745    .  281 ',
        ],
      ),
      2,
    );
    expect(doc.flags).toContain('implausible-length');
  });

  it('stops the last document of a volume at the library back matter', () => {
    const docs = splitVolume(
      volume(
        [
          '46.    TO  WILLIAM  STRAHAN ',
          '',
          'July  31,  1744. ',
          '',
          'The  end  of  the  letter.',
          '',
          'University  of  Toronto  Library ',
          '',
          'DO  NOT  REMOVE  THE  CARD ',
        ],
        contents.slice(0, 1),
      ),
      2,
    );
    expect(docs[0].text).toBe('July 31, 1744.\n\nThe end of the letter.');
  });

  it('does not mistake a caps row in the contents for the body heading', () => {
    const docs = splitVolume(
      [
        'CONTENTS',
        '45.  To  John  Adams.     June  1,  1780  .  10 ',
        '46.  TO  MARY  HEWSON.     June  2,  1780  .  11 ',
        '47.  To  John  Jay.     June  3,  1780  .  12 ',
        '',
        '45.    TO  JOHN  ADAMS ',
        'Adams  text.',
        '46.    TO  MARY  HEWSON ',
        'Hewson  text.',
        '47.    TO  JOHN  JAY ',
        'Jay  text.',
      ].join('\n'),
      8,
    );
    expect(docs.find((d) => d.number === 46)?.text).toBe('Hewson text.');
  });

  it("flags the last document when it runs into Smyth's Life of Franklin", () => {
    const [doc] = splitVolume(
      volume(
        ['46.    TO  WILLIAM  STRAHAN ', '', 'Text.', '', 'CHAPTER  I ', '', 'Origin.'],
        contents.slice(0, 1),
      ),
      10,
    );
    expect(doc.flags).toContain('unknown-end');
    expect(doc.text).toBe('Text.');
  });

  it('ends the last listed document at a heading past the end of the contents', () => {
    const docs = splitVolume(
      volume(
        ['46.    TO  WILLIAM  STRAHAN ', '', 'Letter.', '', '47.    THE  LEVEE ', '', 'Essay.'],
        contents.slice(0, 1),
      ),
      7,
    );
    expect(docs.map((d) => d.number)).toEqual([46, 47]);
    expect(docs[0].text).toBe('Letter.');
  });

  it('does not treat a far higher number past the contents as a heading', () => {
    const docs = splitVolume(
      volume(
        ['46.    TO  WILLIAM  STRAHAN ', '', 'Letter.', '', '9000.    A  P.  S. '],
        contents.slice(0, 1),
      ),
      7,
    );
    expect(docs.map((d) => d.number)).toEqual([46]);
  });

  it('drops the source mark left by a wrapped heading, keeping the salutation', () => {
    const [doc] = splitVolume(
      volume(
        [
          '46.    TO  WILLIAM  STRAHAN ',
          '',
          'SOUTH  CAROLINA  (A.  P.  S.) ',
          '',
          'DEAR  SIR,',
          '',
          'Text.',
        ],
        contents.slice(0, 1),
      ),
      2,
    );
    expect(doc.text).toBe('DEAR SIR,\n\nText.');
  });

  it('is deterministic', () => {
    const raw = volume(['46.    TO  WILLIAM  STRAHAN ', '', 'Text.'], contents.slice(0, 1));
    expect(splitVolume(raw, 2)).toEqual(splitVolume(raw, 2));
  });
});
