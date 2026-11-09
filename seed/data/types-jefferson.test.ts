import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import type { SeedType } from '../types-defs';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => YAML.parse(readFileSync(resolve(here, f), 'utf8')) as SeedType[];
const jefferson = read('types-jefferson.yaml');

describe('seed types-jefferson.yaml', () => {
  // That these parse with lit-crm's own typeSchema is checked in
  // extension/seed-types.test.ts, which runs inside lit-crm.
  it('defines types', () => {
    expect(jefferson.length).toBeGreaterThan(0);
  });

  it('shares no code with the Franklin types', () => {
    const franklin = new Set(read('types.yaml').map((t) => t.code));
    expect(jefferson.filter((t) => franklin.has(t.code))).toEqual([]);
  });

  it('selects no bespoke renderer', () => {
    expect(jefferson.filter((t) => t.rendererId)).toEqual([]);
  });
});
