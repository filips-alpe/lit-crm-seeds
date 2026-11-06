/** Checks the committed generated dataset (prisma/seed/generated/jefferson.generated.json). */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import type { JeffersonDataset } from './dataset';
import type { SeedType } from '../../types-defs';

const here = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(resolve(here, '../../generated/jefferson.generated.json'), 'utf8'),
) as JeffersonDataset;
const types = YAML.parse(
  readFileSync(resolve(here, '../../data/types-jefferson.yaml'), 'utf8'),
) as SeedType[];
const byKey = new Map(dataset.records.map((r) => [r.key, r]));

describe('committed Jefferson dataset', () => {
  it('has unique keys and only known types', () => {
    expect(byKey.size).toBe(dataset.records.length);
    const codes = new Set(types.map((t) => t.code));
    expect(dataset.records.filter((r) => !codes.has(r.type))).toEqual([]);
  });

  it('cites the Internet Archive item on every record and entity', () => {
    const bad = dataset.records.filter(
      (r) =>
        !r.references.some((u) =>
          u.startsWith('https://archive.org/details/writingsofthomas0000vari_v5r4'),
        ),
    );
    expect(bad).toEqual([]);
    expect(dataset.records.filter((r) => !/vol\. I|front matter/.test(r.note ?? ''))).toEqual([]);
  });

  it('splits the volumes into the expected records', () => {
    const count = (p: string) => dataset.records.filter((r) => r.key.startsWith(p)).length;
    expect(count('notes-query-')).toBe(23);
    expect(count('manual-section-')).toBe(53);
    expect(count('anas-')).toBeGreaterThan(100);
  });

  it('has mentions that point at entity records and fit inside the source text', () => {
    expect(dataset.mentions.length).toBeGreaterThan(1000);
    for (const m of dataset.mentions) {
      const source = byKey.get(m.record);
      const entity = byKey.get(m.entity);
      expect(source?.text, m.record).toBeTruthy();
      expect(['person', 'place', 'organization', 'work']).toContain(entity?.type);
      expect(m.end).toBeLessThanOrEqual(source!.text!.length);
      expect(m.start).toBeLessThan(m.end);
    }
  });

  it('has no overlapping mentions within a record', () => {
    const bySource = new Map<string, { start: number; end: number }[]>();
    for (const m of dataset.mentions)
      bySource.set(m.record, [...(bySource.get(m.record) ?? []), m]);
    for (const spans of bySource.values()) {
      spans.sort((a, b) => a.start - b.start);
      for (let i = 1; i < spans.length; i++)
        expect(spans[i].start).toBeGreaterThanOrEqual(spans[i - 1].end);
    }
  });

  it('only creates entities the text mentions', () => {
    const mentioned = new Set(dataset.mentions.map((m) => m.entity));
    const entities = dataset.records.filter((r) =>
      ['person', 'place', 'organization', 'work'].includes(r.type),
    );
    expect(entities.filter((e) => !mentioned.has(e.key))).toEqual([]);
  });
});
