import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dashboards } from './index';
import { dashboardFor } from '$lib/dashboards/registry';

// The seed users live in lit-crm-seeds, not in the installed extension: point
// SEEDS_DIR at a checkout (default ../lit-crm-seeds) to run the coverage check.
const usersFile = resolve(process.env.SEEDS_DIR ?? '../lit-crm-seeds', 'seed/data/user.yaml');
const seedUsernames = existsSync(usersFile)
  ? [...readFileSync(usersFile, 'utf8').matchAll(/^- username: (\S+)/gm)].map((m) => m[1])
  : [];

describe('franklin dashboards', () => {
  it.skipIf(!existsSync(usersFile))('cover every seeded user', () => {
    expect(seedUsernames.length).toBeGreaterThan(0);
    expect(Object.keys(dashboards).sort()).toEqual([...seedUsernames].sort());
  });

  it('are the ones the core registry serves', () => {
    expect(dashboardFor('bfranklin')).toBe(dashboards.bfranklin);
  });
});
