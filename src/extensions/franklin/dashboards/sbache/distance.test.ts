import { describe, expect, it } from 'vitest';
import { haversineMiles, longestRoute } from './distance';
import type { GeoRoute } from '$lib/dashboards/types';

const route = (id: string, fromGeo: GeoRoute['fromGeo'], toGeo: GeoRoute['toGeo']): GeoRoute => ({
  id,
  title: id,
  from: null,
  to: null,
  fromGeo,
  toGeo,
  date: null,
});

describe('distance', () => {
  it('measures Passy to Philadelphia at roughly 3,700 miles', () => {
    const miles = haversineMiles({ lat: 48.86, lng: 2.29 }, { lat: 39.95, lng: -75.16 });
    expect(miles).toBeGreaterThan(3600);
    expect(miles).toBeLessThan(3800);
  });

  it('picks the longest fully located route, or null', () => {
    expect(longestRoute([])).toBeNull();
    expect(longestRoute([route('a', null, { lat: 1, lng: 1 })])).toBeNull();
    const best = longestRoute([
      route('short', { lat: 48.86, lng: 2.29 }, { lat: 48.85, lng: 2.27 }),
      route('far', { lat: 48.86, lng: 2.29 }, { lat: 39.95, lng: -75.16 }),
    ]);
    expect(best?.route.id).toBe('far');
    expect(best?.miles).toBeGreaterThan(3600);
  });
});
