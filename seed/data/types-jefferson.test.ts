import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import { typeSchema } from '../../../src/lib/schemas/types';
import type { SeedType } from '../types-defs';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => YAML.parse(readFileSync(resolve(here, f), 'utf8')) as SeedType[];
const jefferson = read('types-jefferson.yaml');

describe('seed types-jefferson.yaml', () => {
  it.each(jefferson.map((t) => t.code))('%s parses with typeSchema', (code) => {
    const parsed = typeSchema.safeParse(jefferson.find((t) => t.code === code));
    expect(parsed.error?.issues ?? []).toEqual([]);
  });

  it('shares no code with the Franklin types', () => {
    const franklin = new Set(read('types.yaml').map((t) => t.code));
    expect(jefferson.filter((t) => franklin.has(t.code))).toEqual([]);
  });

  it('selects no bespoke renderer', () => {
    expect(jefferson.filter((t) => t.rendererId)).toEqual([]);
  });
});
