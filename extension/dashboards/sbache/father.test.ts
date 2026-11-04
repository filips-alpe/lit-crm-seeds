import { describe, expect, it } from 'vitest';
import { dataFor, makeRecord, makeUser } from '../_kit/fixtures';
import { lettersFromFather } from './father';

const user = makeUser('sbache', 'Sarah Bache');

describe('lettersFromFather', () => {
  it('keeps only letters written by Franklin', () => {
    const { records } = dataFor(user, [
      makeRecord(user, 'letter', { from: 'Benjamin Franklin', mine: 'assignee' }),
      makeRecord(user, 'letter', { from: 'Sarah Bache', to: 'Benjamin Franklin' }),
      makeRecord(user, 'life', { from: 'Benjamin Franklin' }),
    ]);
    expect(lettersFromFather(records)).toHaveLength(1);
  });

  it('is empty without records', () => {
    expect(lettersFromFather([])).toEqual([]);
  });
});
