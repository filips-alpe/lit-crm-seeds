import { describe, expect, it } from 'vitest';
import { fillMissingDates } from './undated';

describe('fillMissingDates', () => {
  it('fills an undated doc from its nearest preceding dated neighbour in permalink order', () => {
    const docs = [
      { permalink: 'Franklin/01-01-02-0001', dateFrom: '1710-01-01' },
      { permalink: 'Franklin/01-01-02-0002', dateFrom: undefined },
      { permalink: 'Franklin/01-01-02-0003', dateFrom: '1712-01-01' },
    ];
    const filled = fillMissingDates(docs);
    expect(filled.get('Franklin/01-01-02-0002')).toEqual({
      dateFrom: '1710-01-01',
      inferred: true,
    });
  });

  it('falls back to the nearest following neighbour when there is no preceding dated doc', () => {
    const docs = [
      { permalink: 'Franklin/01-01-02-0001', dateFrom: undefined },
      { permalink: 'Franklin/01-01-02-0002', dateFrom: '1710-01-01' },
    ];
    const filled = fillMissingDates(docs);
    expect(filled.get('Franklin/01-01-02-0001')).toEqual({
      dateFrom: '1710-01-01',
      inferred: true,
    });
  });

  it('does not touch docs that already have a date', () => {
    const docs = [{ permalink: 'Franklin/01-01-02-0001', dateFrom: '1710-01-01' }];
    expect(fillMissingDates(docs).size).toBe(0);
  });

  it('handles consecutive undated docs by chaining to the same preceding date', () => {
    const docs = [
      { permalink: 'Franklin/01-01-02-0001', dateFrom: '1710-01-01' },
      { permalink: 'Franklin/01-01-02-0002', dateFrom: undefined },
      { permalink: 'Franklin/01-01-02-0003', dateFrom: undefined },
    ];
    const filled = fillMissingDates(docs);
    expect(filled.get('Franklin/01-01-02-0002')?.dateFrom).toBe('1710-01-01');
    expect(filled.get('Franklin/01-01-02-0003')?.dateFrom).toBe('1710-01-01');
  });

  it('sorts input by permalink before walking (order-independent)', () => {
    const docs = [
      { permalink: 'Franklin/01-01-02-0003', dateFrom: '1712-01-01' },
      { permalink: 'Franklin/01-01-02-0002', dateFrom: undefined },
      { permalink: 'Franklin/01-01-02-0001', dateFrom: '1710-01-01' },
    ];
    const filled = fillMissingDates(docs);
    expect(filled.get('Franklin/01-01-02-0002')?.dateFrom).toBe('1710-01-01');
  });
});
