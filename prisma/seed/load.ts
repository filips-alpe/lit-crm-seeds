import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as YAML from 'yaml';
import type { SeedProjectMeta, SeedRecordFlat, SeedType } from './types-defs';

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), 'data');

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

type RawSeedRecord = Omit<SeedRecordFlat, 'alternateIds'> & { alternateIds?: string[] };
export const records: SeedRecordFlat[] = load<RawSeedRecord[]>('records.yaml').map((r) => ({
  ...r,
  alternateIds: r.alternateIds ?? [],
}));
