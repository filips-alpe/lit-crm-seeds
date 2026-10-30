import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as YAML from 'yaml';
import type { SeedProjectMeta, SeedRecordFlat, SeedType } from './types-defs';
import type { GeneratedRecord } from './pipeline/record-mapper';

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), 'data');
const generatedDir = resolve(dirname(fileURLToPath(import.meta.url)), 'generated');

function load<T>(name: string): T {
  return YAML.parse(readFileSync(resolve(dataDir, name), 'utf8')) as T;
}

export type SeedUser = {
  username: string;
  name: string;
  bio?: string;
  color: string;
  avatarSeed?: string;
};

export const users = load<SeedUser[]>('user.yaml');

export const types = load<SeedType[]>('types.yaml');
export const projects = load<SeedProjectMeta[]>('projects.yaml');

/**
 * Records come entirely from the generated import (prisma/seed/generate.ts):
 * Founders Online documents plus Wikidata life/office/membership records.
 * Chunk files are read in filename order and concatenated; the generator
 * writes records.generated.0.json, .1.json, ... so lexical sort matches
 * generation order for single-digit chunk counts.
 */
function loadGeneratedRecords(): SeedRecordFlat[] {
  let files: string[];
  try {
    files = readdirSync(generatedDir)
      .filter((f) => f.startsWith('records.generated.') && f.endsWith('.json'))
      .sort();
  } catch {
    return [];
  }
  const generated: GeneratedRecord[] = files.flatMap(
    (f) => JSON.parse(readFileSync(resolve(generatedDir, f), 'utf8')) as GeneratedRecord[],
  );
  return generated.map((r) => ({
    type: r.type,
    title: r.title,
    description: r.description,
    text: r.text,
    note: r.note,
    references: r.references,
    entered: r.entered,
    date: r.date,
    start: r.start,
    end: r.end,
    allDay: r.allDay,
    from: r.from,
    to: r.to,
    fromGeo: r.fromGeo,
    toGeo: r.toGeo,
    user: r.creatorUsername,
    assignee: r.assigneeUsername,
    projects: r.projects,
  }));
}

export const records: SeedRecordFlat[] = loadGeneratedRecords();
