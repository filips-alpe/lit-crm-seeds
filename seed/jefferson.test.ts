import { describe, expect, it } from 'vitest';
import { firstEnteredByType, jeffersonRows } from './jefferson';
import type { JeffersonDataset } from './sources/jefferson/dataset';

const dataset: JeffersonDataset = {
  source: { item: 'x', url: 'u', edition: 'e' },
  records: [
    {
      key: 'doc',
      type: 'memoir',
      title: 'Autobiography',
      text: 'I met Hamilton.',
      references: ['r'],
      entered: '1821-01-06',
      date: '1821-01-06',
      from: 'Thomas Jefferson',
    },
    {
      key: 'entity-hamilton',
      type: 'person',
      title: 'Alexander Hamilton',
      references: ['r'],
      entered: '1791-08-13',
    },
  ],
  mentions: [{ record: 'doc', entity: 'entity-hamilton', start: 6, end: 14 }],
};
const typeIds = new Map([
  ['memoir', 't-memoir'],
  ['person', 't-person'],
]);

describe('jeffersonRows', () => {
  let n = 0;
  const { records, mentions } = jeffersonRows(dataset, typeIds, () => `id-${++n}`);

  it('maps records with types and no creator', () => {
    expect(records.map((r) => [r.id, r.typeId, r.title])).toEqual([
      ['id-1', 't-memoir', 'Autobiography'],
      ['id-2', 't-person', 'Alexander Hamilton'],
    ]);
    expect(records[0]).not.toHaveProperty('creatorId');
    expect(records[0].createdAt.toISOString()).toBe('1821-01-06T00:00:00.000Z');
  });

  it('resolves mention keys to the new record ids', () => {
    expect(mentions).toEqual([{ sourceId: 'id-1', entityId: 'id-2', start: 6, end: 14 }]);
  });

  it('fails on unknown types and dangling mentions', () => {
    expect(() => jeffersonRows(dataset, new Map(), () => 'x')).toThrow(/Unknown type/);
    const bad = { ...dataset, mentions: [{ record: 'doc', entity: 'nope', start: 0, end: 1 }] };
    expect(() => jeffersonRows(bad, typeIds, () => String(Math.random()))).toThrow(
      /unknown record/,
    );
  });
});

describe('firstEnteredByType', () => {
  it('takes the earliest entry per type', () => {
    expect(firstEnteredByType(dataset).get('person')?.toISOString().slice(0, 10)).toBe(
      '1791-08-13',
    );
  });
});
