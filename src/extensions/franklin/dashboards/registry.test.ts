import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dashboards } from './index';
import { dashboardFor } from '$lib/dashboards/registry';

const seedUsernames = [
  ...readFileSync('prisma/seed/data/user.yaml', 'utf8').matchAll(/^- username: (\S+)/gm),
].map((m) => m[1]);

describe('franklin dashboards', () => {
  it('cover every seeded user', () => {
    expect(seedUsernames.length).toBeGreaterThan(0);
    expect(Object.keys(dashboards).sort()).toEqual([...seedUsernames].sort());
  });

  it('are the ones the core registry serves', () => {
    expect(dashboardFor('bfranklin')).toBe(dashboards.bfranklin);
  });
});
