import { describe, expect, it } from 'vitest';
import { classifyDoc, SKIP, type ClassifiableDoc } from './classifier';

function c(title: string, extra: Partial<ClassifiableDoc> = {}) {
  return classifyDoc({ title, authors: ['A'], recipients: ['B'], ...extra });
}

describe('classifyDoc', () => {
  it('skips editorial notes and introductions', () => {
    expect(c('Editorial Note on the Pennsylvania Gazette').type).toBe(SKIP);
    expect(c('Editorial Introduction to X').rule).toBe('editorial');
  });

  describe('diary', () => {
    it('classifies a bare date heading without recipient', () => {
      const r = c('1776 Jany. 3d. Wednesday.', { recipients: [], project: 'Adams Papers' });
      expect(r).toMatchObject({ type: 'diary', rule: 'date-heading title, no recipient' });
      expect(c('[November 24 1779.]', { recipients: [] }).type).toBe('diary');
    });

    it('classifies date-led Adams Papers titles without recipient', () => {
      expect(c('24 Nov. 1779 at Ferrol', { recipients: [], project: 'Adams Papers' }).type).toBe(
        'diary',
      );
    });

    it('does not make a diary of a dated title that has a recipient', () => {
      expect(c('1776 Jany. 3d. Wednesday.', { project: 'Adams Papers' }).type).not.toBe('diary');
    });
  });

  describe('letter', () => {
    it('classifies "X to Y, date" and "From X to Y"', () => {
      expect(c('Benjamin Franklin to Deborah Franklin, 12 January 1766')).toMatchObject({
        type: 'letter',
        rule: 'letter-shape',
      });
      expect(c('To George Washington from Lafayette, 1 May 1780').type).toBe('letter');
      expect(c('From John Adams to Thomas Jefferson, 5 May 1785').type).toBe('letter');
    });

    it('merges institutional correspondence (dispatch) into letter, keeping the rule id', () => {
      const r = c('C. W. F. Dumas to the American Commissioners, 8 December 1778', {
        recipients: ['American Commissioners'],
      });
      expect(r).toMatchObject({ type: 'letter', kind: 'letter', rule: 'letter-shape+institution' });
    });

    it('prefers a recognised genre after the colon over letter shape', () => {
      expect(c('Pennsylvania Assembly: Reply to the Governor, 17 May 1755').type).toBe(
        'proceedings',
      );
    });
  });

  describe('genre families at the start of the title', () => {
    it.each([
      ['Last Will and Testament, 22 June 1750', 'instrument'],
      ['Articles of Agreement with David Hall, 1 February 1748', 'instrument'],
      ['Treaty of Amity and Commerce, 6 February 1778', 'instrument'],
      ['Passport for Jan Ingenhousz, 17 October 1777', 'instrument'],
      ['Record of Baptism, 6 January 1706', 'instrument'],
      ['Petition to the Assembly, 1 May 1750', 'petition'],
      ['Memorial to the King, 3 June 1774', 'petition'],
      ['Receipt from Thomas Penn, 25 June 1733', 'account'],
      ['Subscriptions to the Academy, 14 November 1749', 'account'],
      ['Account with David Hall, 1 July 1760', 'account'],
      ['Minutes of the Library Company, 7 March 1731', 'proceedings'],
      ['Report of the Committee, 10 June 1776', 'proceedings'],
      ['Memorandum, [18 April 1746]', 'note'],
      ['Extracts from the Gazette, 1730', 'note'],
      ['Notes on Assembly Debates, 26-28 February 1745', 'note'],
      ['Poor Richard, 1733', 'essay'],
      ['Silence Dogood, No. 1, 2 April 1722', 'essay'],
      ['Epitaph on Himself, [1728]', 'essay'],
    ])('%s -> %s', (title, type) => {
      expect(c(title, { recipients: [] }).type).toBe(type);
    });
  });

  it('classifies "Actor: Genre" by the genre after the colon', () => {
    expect(c('Pennsylvania Assembly: Petition to the Governor, 1 May 1751').type).toBe('petition');
    expect(c('Library Company: Minutes, 7 March 1731').rule).toBe('genre@after-colon');
  });

  it('falls back to a genre keyword anywhere in a non-letter title', () => {
    expect(c('The Hutchinson Treaty Draft, 1770', { recipients: [] })).toMatchObject({
      type: 'instrument',
      rule: 'genre@anywhere',
    });
  });

  it('classifies an authored piece with no recipient and no genre as an essay', () => {
    expect(c('Silly Pleasantries', { recipients: [] })).toMatchObject({
      type: 'essay',
      rule: 'authored piece, no recipient',
    });
  });

  it('falls through to document', () => {
    expect(c('Calculations Respecting a Loan')).toMatchObject({
      type: 'document',
      rule: 'fallthrough',
    });
  });
});
