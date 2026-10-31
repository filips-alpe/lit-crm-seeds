import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { GeneratedRecord } from './pipeline/record-mapper';

const generatedDir = resolve(dirname(fileURLToPath(import.meta.url)), 'generated');
const records = readdirSync(generatedDir)
  .filter((f) => f.startsWith('records.generated.'))
  .flatMap((f) => JSON.parse(readFileSync(resolve(generatedDir, f), 'utf8')) as GeneratedRecord[]);
const founders = records.filter((r) => r.permalink.includes('founders.archives.gov'));

describe('committed generated seed', () => {
  it('keeps the Founders Online reference on every Founders Online record', () => {
    expect(founders.length).toBeGreaterThan(0);
    expect(founders.filter((r) => !r.references.includes(r.permalink))).toEqual([]);
  });

  it('has no duplicate permalinks', () => {
    const permalinks = founders.map((r) => r.permalink);
    expect(new Set(permalinks).size).toBe(permalinks.length);
  });

  it('cites an Internet Archive volume on every record with Smyth text', () => {
    const smyth = founders.filter((r) => r.references.some((u) => u.includes('archive.org/')));
    expect(smyth.length).toBeGreaterThan(0);
    expect(smyth.filter((r) => !r.text)).toEqual([]);
  });
});
