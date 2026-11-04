import { describe, expect, it } from 'vitest';
import type { RendererFieldValue } from '$lib/render/props';
import { coreData, geoLabel, personOf, textOf, whenLabel, yearOf, yearsLabel } from './fields';

const f = (over: Partial<RendererFieldValue> & { writeTo: string }): RendererFieldValue => ({
  label: over.writeTo,
  kind: 'text',
  value: over.writeTo,
  raw: over.writeTo,
  ...over,
});

describe('whenLabel', () => {
  it('formats a single date as a calendar day regardless of time zone', () => {
    expect(whenLabel('1747-05-25T00:00:00Z')).toBe('25 May 1747');
    expect(whenLabel(new Date('1747-05-25T00:00:00Z'))).toBe('25 May 1747');
  });
  it('collapses a span within one year', () => {
    expect(whenLabel(null, '1747-06-03', '1747-08-05')).toBe('3 Jun – 5 Aug 1747');
  });
  it('shows both years across a span', () => {
    expect(whenLabel(null, '1747-12-30', '1748-01-02')).toBe('30 Dec 1747 – 2 Jan 1748');
  });
  it('treats equal start/end and a lone start or end as a single date', () => {
    expect(whenLabel(null, '1747-06-03', '1747-06-03')).toBe('3 Jun 1747');
    expect(whenLabel(null, '1747-06-03', null)).toBe('3 Jun 1747');
    expect(whenLabel(null, null, '1747-06-03')).toBe('3 Jun 1747');
  });
  it('is null when nothing parses', () => {
    expect(whenLabel(null, null, null)).toBeNull();
    expect(whenLabel('', undefined, 'nonsense')).toBeNull();
  });
});

describe('yearsLabel / yearOf', () => {
  it('renders tenure ranges with open ends', () => {
    expect(yearsLabel('1790-01-01', '1797-03-04')).toBe('1790–1797');
    expect(yearsLabel('1790-01-01', '1790-12-31')).toBe('1790');
    expect(yearsLabel('1790-01-01', null)).toBe('1790–');
    expect(yearsLabel(null, '1797-03-04')).toBe('–1797');
    expect(yearsLabel(null, null)).toBeNull();
  });
  it('extracts a year', () => {
    expect(yearOf('1776-07-04')).toBe('1776');
    expect(yearOf(null)).toBeNull();
  });
});

describe('geoLabel', () => {
  it('formats hemispheres', () => {
    expect(geoLabel('51.51,-0.13')).toBe('51.51° N, 0.13° W');
    expect(geoLabel('-33.87,151.21')).toBe('33.87° S, 151.21° E');
  });
  it('is null for junk', () => {
    expect(geoLabel('')).toBeNull();
    expect(geoLabel(null)).toBeNull();
    expect(geoLabel('abc')).toBeNull();
  });
});

describe('field readers', () => {
  it('reads text and person by column and tolerates absence', () => {
    const fields = {
      a: f({ writeTo: 'from', value: 'Philadelphia' }),
      b: f({ writeTo: 'creatorId', kind: 'user', value: null, relation: null }),
      c: f({
        writeTo: 'assigneeId',
        kind: 'user',
        value: 'Ann',
        relation: { id: '1', label: 'Ann' },
      }),
    };
    expect(textOf(fields, 'from')).toBe('Philadelphia');
    expect(textOf(fields, 'to')).toBeNull();
    expect(personOf(fields, 'creatorId')).toBeNull();
    expect(personOf(fields, 'assigneeId')).toBe('Ann');
  });
  it('coreData on an empty layout is all null', () => {
    const d = coreData({});
    expect(d.title).toBeNull();
    expect(d.when).toBeNull();
    expect(d.text).toBeNull();
  });
});
