import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import { layoutSchema, typeSchema } from '$lib/schemas/types';

// Needs the seed data, which is not part of the installed extension: point
// SEEDS_DIR at a lit-crm-seeds checkout (default ../lit-crm-seeds) to run it.
const seedsDir = resolve(process.env.SEEDS_DIR ?? '../lit-crm-seeds');
const typesFile = resolve(seedsDir, 'seed/data/types.yaml');

const typeFiles = ['types.yaml', 'types-jefferson.yaml'].map((f) => resolve(seedsDir, 'seed/data', f));

describe.skipIf(!existsSync(typesFile))('lit-crm-seeds type files against the app schemas', () => {
  const types = typeFiles.flatMap(
    (f) => YAML.parse(readFileSync(f, 'utf8')) as { code: string; layout?: unknown }[],
  );

  it('has types to check', () => {
    expect(types.length).toBeGreaterThan(0);
  });

  it('parses every type with typeSchema and layoutSchema', () => {
    for (const t of types) {
      expect(typeSchema.safeParse(t).success, t.code).toBe(true);
      expect(layoutSchema.safeParse(t.layout).success, t.code).toBe(true);
    }
  });
});
