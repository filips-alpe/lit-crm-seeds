import { describe, expect, it } from 'vitest';
import { assessPerson, labelMatchesSurname, type PersonFacts } from './confidence';

const base: PersonFacts = {
  foName: 'Lee, Arthur',
  label: 'Arthur Lee',
  isDemo: false,
  isTop: false,
  born: 1740,
  died: 1792,
};
const act = { name: 'Lee, Arthur', count: 20, from: 1770, to: 1785 };

describe('labelMatchesSurname', () => {
  it('ignores accents, hyphens and case', () => {
    expect(labelMatchesSurname('Caffiéri, Jean-Jacques', 'Jean-Jacques Caffieri')).toBe(true);
    expect(labelMatchesSurname('Barbeu-Dubourg, Jacques', 'Jacques Barbeu-Dubourg')).toBe(true);
  });
  it('rejects a different surname', () => {
    expect(labelMatchesSurname('Dumas, Charles', 'Charles Dupont')).toBe(false);
  });
});

describe('assessPerson', () => {
  it('keeps a plausible match', () => {
    expect(assessPerson(base, act)).toEqual({ keep: true, reasons: [] });
  });
  it('always keeps demo users', () => {
    expect(assessPerson({ ...base, isDemo: true, born: 1900 }, undefined).keep).toBe(true);
  });
  it('drops thinly evidenced people unless they are top correspondents', () => {
    expect(assessPerson(base, { ...act, count: 2 }).reasons).toContain('thin-evidence');
    expect(assessPerson({ ...base, isTop: true }, { ...act, count: 2 }).keep).toBe(true);
  });
  it('drops namesakes of another era', () => {
    expect(
      assessPerson({ ...base, born: 1790, died: 1850 }, { ...act, count: 5 }).reasons,
    ).toContain('born-too-late');
    expect(assessPerson({ ...base, died: 1760 }, { ...act, count: 5 }).reasons).toContain(
      'dead-before-documents',
    );
    expect(
      assessPerson({ ...base, born: 1700, died: 1810 }, { ...act, count: 5 }).reasons,
    ).toContain('implausible-age');
    expect(assessPerson({ ...base, born: undefined }, { ...act, count: 5 }).reasons).toContain(
      'no-birth-date',
    );
  });
  it('excuses a young person with strong presence in the documents', () => {
    const young = { ...base, born: 1767, died: 1848 };
    expect(assessPerson(young, { ...act, from: 1776, count: 87 }).keep).toBe(true);
    expect(assessPerson(young, { ...act, from: 1776, count: 6 }).keep).toBe(false);
  });
  it('drops a weak name match with little evidence', () => {
    expect(
      assessPerson({ ...base, label: 'Arthur Smith' }, { ...act, count: 6 }).reasons,
    ).toContain('weak-name');
  });
});
