import type { Point } from '$lib/maps/projection';

const EARTH_RADIUS_MI = 3958.8;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in statute miles. */
export function distanceMiles(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Mid-Atlantic meridian: letters with one end west of it and the other east
// crossed the ocean.
const MID_ATLANTIC_LNG = -30;

export function crossesAtlantic(a: Point | null, b: Point | null): boolean {
  if (!a || !b) return false;
  return a.lng < MID_ATLANTIC_LNG !== b.lng < MID_ATLANTIC_LNG && Math.abs(a.lng - b.lng) < 180;
}

const SALUTATION_MAX = 48;
// Only the head of a (possibly very long) text is scanned for an excerpt.
const EXCERPT_SCAN = 3000;

const paragraphs = (markdown: string): string[] =>
  markdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** The opening line ("Dear Sir,") when the first paragraph is short enough to be one. */
export function salutation(markdown: string | null | undefined): string | null {
  const first = paragraphs(markdown ?? '')[0];
  if (!first || first.includes('\n') || first.length > SALUTATION_MAX) return null;
  return plain(first);
}

/** Strip the markdown marks that would read as noise in a one-line excerpt. */
function plain(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First prose paragraph (after any salutation), de-marked and cut at a word boundary. */
export function excerpt(markdown: string | null | undefined, max: number): string {
  const ps = paragraphs((markdown ?? '').slice(0, EXCERPT_SCAN));
  if (!ps.length) return '';
  const start = salutation(markdown) !== null && ps.length > 1 ? 1 : 0;
  const text = plain(ps[start]);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '') + '…';
}

export interface Endpoint {
  name: string | null;
  place: string | null;
}

/**
 * Split a from/to text into a person and a place. An explicit person label (the
 * linked user) wins as the name; otherwise "Name, Place" splits on the first comma;
 * a lone word is a place.
 */
export function splitEndpoint(
  text: string,
  personLabel: string | null,
  bare: 'name' | 'place' = 'place',
): Endpoint {
  const t = text.trim();
  if (personLabel) {
    const rest = t.startsWith(personLabel) ? t.slice(personLabel.length).replace(/^[\s,]+/, '') : t;
    return { name: personLabel, place: rest || null };
  }
  const comma = t.indexOf(',');
  if (comma > 0) {
    return { name: t.slice(0, comma).trim(), place: t.slice(comma + 1).trim() || null };
  }
  if (bare === 'name') return { name: t || null, place: null };
  return { name: null, place: t || null };
}
