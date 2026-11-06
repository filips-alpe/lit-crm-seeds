import { describe, expect, it } from 'vitest';
import { buildHyphenLexicon, cleanSpan, isNoise, joinHyphenated } from './clean';
import { buildPageMap } from './pages';

function clean(lines: string[], lexiconLines: string[] = lines) {
  const pm = buildPageMap(lines, lines.length);
  return cleanSpan(lines, 0, lines.length, pm.furniture, buildHyphenLexicon(lexiconLines));
}

describe('cleanSpan', () => {
  it('reflows a paragraph and keeps paragraph breaks', () => {
    const r = clean([
      'My father’s education had',
      'been quite neglected;',
      '',
      'He placed me at school.',
    ]);
    expect(r.text).toBe(
      'My father’s education had been quite neglected;\n\nHe placed me at school.',
    );
  });

  it('removes running heads and joins the paragraph across the page break', () => {
    const r = clean([
      'the lands I still own, called',
      '',
      '',
      '2 Jefferson’s Works',
      '',
      '',
      'Shadwell, adjoining my residence.',
    ]);
    expect(r.text).toBe('the lands I still own, called Shadwell, adjoining my residence.');
    expect(r.corrections.map((c) => c.kind)).toEqual(['furniture', 'page-join']);
    expect(r.corrections[0]).toMatchObject({ line: 4, raw: '2 Jefferson’s Works' });
  });

  it('keeps a new paragraph after a page break when the page ended a sentence', () => {
    const r = clean(['That was all.', '', 'Autobiography 3', '', 'He placed me at school.']);
    expect(r.text).toBe('That was all.\n\nHe placed me at school.');
  });

  it('moves a page-foot note after the paragraph it interrupts', () => {
    const r = clean([
      'after the lapse of twenty-five',
      '',
      '1 The opinions here alluded to will be found elsewhere.',
      '',
      '(265)',
      '266 Jefferson’s Works',
      'years, or more, from their dates.',
    ]);
    expect(r.text).toBe(
      'after the lapse of twenty-five years, or more, from their dates.\n\n1 The opinions here alluded to will be found elsewhere.',
    );
    expect(r.corrections.some((c) => c.kind === 'footnote' && c.line === 3)).toBe(true);
  });

  it('rejoins line-end hyphenation and logs it against the raw line', () => {
    const r = clean(['An impeachment is not discon-', 'tinued by the dissolution.']);
    expect(r.text).toBe('An impeachment is not discontinued by the dissolution.');
    expect(r.corrections).toEqual([
      { line: 1, kind: 'hyphenation', raw: 'discon-|tinued', result: 'discontinued' },
    ]);
  });

  it('keeps the hyphen of a compound the book prints hyphenated mid-line', () => {
    const r = clean(['after the lapse of twenty-', 'five years'], ['a twenty-five year term', 'x']);
    expect(r.text).toBe('after the lapse of twenty-five years');
  });

  it('never changes a word: every output word is in the raw lines', () => {
    const raw = [
      'Th: Jefferson mentioned to him a letter received',
      'from John Adams, disavowing Publicola.',
    ];
    const out = clean(raw).text.split(/\s+/);
    const words = raw.join(' ').split(/\s+/);
    expect(out).toEqual(words);
  });

  it('records where each paragraph starts', () => {
    const r = clean(['One.', '', 'Two.']);
    expect(r.paragraphs).toEqual([
      { offset: 0, line: 1 },
      { offset: 6, line: 3 },
    ]);
  });
});

describe('joinHyphenated', () => {
  const lexicon = buildHyphenLexicon(['the twenty-five men and the commenced work', 'x']);
  it('drops the hyphen of a broken word', () => {
    expect(joinHyphenated('com-', 'menced', lexicon)).toEqual({
      text: 'commenced',
      keptHyphen: false,
    });
  });
  it('keeps a printed compound', () => {
    expect(joinHyphenated('twenty-', 'five', lexicon)).toEqual({
      text: 'twenty-five',
      keptHyphen: true,
    });
  });
});

describe('isNoise', () => {
  const lexicon = buildHyphenLexicon(Array(6).fill('the may monticello of and walnut black'));
  const lines = (...t: string[]) => t.map((text, i) => ({ n: i + 1, text }));
  it('drops garbled plate OCR', () => {
    expect(isNoise(lines('1axoodpooA dS "19x 99dpooA.ÁA11€ [T'), lexicon)).toBe(true);
  });
  it('keeps rare but real words (plant lists, Latin)', () => {
    expect(isNoise(lines('Black walnut. Juglans nigra.'), lexicon)).toBe(false);
  });
  it('keeps a garbled dateline made of common words', () => {
    expect(isNoise(lines('MoNTICELLO, May r2, 1819.'), lexicon)).toBe(false);
  });
});
