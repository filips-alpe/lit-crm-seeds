import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import { layoutSchema, typeSchema } from '../../../src/lib/schemas/types';
import type { SeedType } from '../types-defs';

const here = dirname(fileURLToPath(import.meta.url));
const types = YAML.parse(readFileSync(resolve(here, 'types.yaml'), 'utf8')) as SeedType[];

// Record columns each field kind may write to (src/lib/fields/registry.ts FIELD_TYPES).
const STRING_COLUMNS = [
  'note',
  'title',
  'description',
  'text',
  'unit',
  'from',
  'to',
  'fromGeo',
  'toGeo',
];
const COLUMNS: Record<string, string[]> = {
  text: ['note', 'title', 'description', 'text', 'unit', 'from', 'to'],
  markdown: ['text', 'description', 'note'],
  number: ['sum', 'hours', 'total'],
  date: ['date', 'start', 'end'],
  datetime: ['date', 'start', 'end'],
  list: ['references'],
  location: STRING_COLUMNS,
  user: ['creatorId', 'assigneeId'],
  record: ['recordId'],
};

const EXPECTED = [
  'letter',
  'diary',
  'essay',
  'note',
  'instrument',
  'proceedings',
  'account',
  'petition',
  'document',
  'life',
  'office',
  'membership',
];

describe('seed types.yaml', () => {
  it('defines exactly the regenerated type set', () => {
    expect(types.map((t) => t.code)).toEqual(EXPECTED);
  });

  it.each(EXPECTED)('%s parses with typeSchema and layoutSchema', (code) => {
    const t = types.find((x) => x.code === code);
    expect(typeSchema.safeParse(t).success).toBe(true);
    expect(layoutSchema.safeParse(t?.layout).success).toBe(true);
  });

  it.each(EXPECTED)('%s writes every field to a column its kind allows', (code) => {
    for (const f of types.find((x) => x.code === code)?.layout?.fields ?? []) {
      expect(COLUMNS[f.kind], `${code}.${f.id}`).toContain(f.writeTo);
    }
  });

  it('starts every layout with the title and gives each type a distinct color and icon', () => {
    for (const t of types) expect(t.layout?.fields[0].writeTo).toBe('title');
    expect(new Set(types.map((t) => t.color)).size).toBe(types.length);
    expect(new Set(types.map((t) => t.iconSeed)).size).toBe(types.length);
  });

  it('gives every type but the generic document a renderer named after it', () => {
    for (const t of types) {
      expect(t.rendererId).toBe(t.code === 'document' ? undefined : t.code);
    }
  });
});
