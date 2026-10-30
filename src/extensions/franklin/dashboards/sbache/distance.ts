import type { GeoRoute } from '$lib/dashboards/types';

const EARTH_RADIUS_MILES = 3958.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in miles between two lat/lng points (haversine). */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/** The longest letter route that has both ends located, with its rounded mileage. */
export function longestRoute(routes: GeoRoute[]): { route: GeoRoute; miles: number } | null {
  let best: { route: GeoRoute; miles: number } | null = null;
  for (const route of routes) {
    if (!route.fromGeo || !route.toGeo) continue;
    const miles = Math.round(haversineMiles(route.fromGeo, route.toGeo));
    if (!best || miles > best.miles) best = { route, miles };
  }
  return best;
}
