import { describe, expect, it } from 'vitest';
import { crossesAtlantic, distanceMiles, excerpt, salutation, splitEndpoint } from './letters';

describe('distanceMiles', () => {
  it('measures Philadelphia to London at roughly 3,650 miles', () => {
    const d = distanceMiles({ lat: 39.95, lng: -75.16 }, { lat: 51.51, lng: -0.13 });
    expect(d).toBeGreaterThan(3500);
    expect(d).toBeLessThan(3800);
  });
  it('is zero for the same point', () => {
    expect(distanceMiles({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
  });
});

describe('crossesAtlantic', () => {
  it('is true between the Americas and Europe, either direction', () => {
    const phl = { lat: 39.95, lng: -75.16 };
    const lon = { lat: 51.51, lng: -0.13 };
    expect(crossesAtlantic(phl, lon)).toBe(true);
    expect(crossesAtlantic(lon, phl)).toBe(true);
  });
  it('is false within one continent or when an end is unknown', () => {
    expect(crossesAtlantic({ lat: 39.95, lng: -75.16 }, { lat: 42.36, lng: -71.06 })).toBe(false);
    expect(crossesAtlantic(null, { lat: 51.5, lng: 0 })).toBe(false);
  });
});

describe('salutation / excerpt', () => {
  const body =
    'Dear Mr Collinson,\n\nI never was **before** engaged in any study that so engrossed me.\n\n- a list';
  it('takes a short first paragraph as the salutation', () => {
    expect(salutation(body)).toBe('Dear Mr Collinson,');
  });
  it('returns null when the first paragraph is prose', () => {
    expect(
      salutation(
        'I never was before engaged in any study that so totally engrossed my attention and my time.',
      ),
    ).toBeNull();
  });
  it('excerpts the first prose paragraph without markdown or salutation', () => {
    expect(excerpt(body, 200)).toBe(
      'I never was before engaged in any study that so engrossed me.',
    );
  });
  it('truncates at a word boundary with an ellipsis', () => {
    const e = excerpt('alpha beta gamma delta epsilon', 14);
    expect(e).toBe('alpha beta…');
  });
  it('is empty for empty input', () => {
    expect(excerpt('', 50)).toBe('');
    expect(excerpt(null, 50)).toBe('');
  });
});

describe('splitEndpoint', () => {
  it('uses a person label and strips it from the place text', () => {
    expect(splitEndpoint('Peter Collinson, London', 'Peter Collinson')).toEqual({
      name: 'Peter Collinson',
      place: 'London',
    });
  });
  it('splits "Name, Place" text on the first comma', () => {
    expect(splitEndpoint('Peter Collinson, London', null)).toEqual({
      name: 'Peter Collinson',
      place: 'London',
    });
  });
  it('treats a bare word as a place', () => {
    expect(splitEndpoint('Philadelphia', null)).toEqual({ name: null, place: 'Philadelphia' });
  });
  it('keeps a person label with the whole text as place when unrelated', () => {
    expect(splitEndpoint('Philadelphia', 'B. Franklin')).toEqual({
      name: 'B. Franklin',
      place: 'Philadelphia',
    });
  });
  it('handles nothing', () => {
    expect(splitEndpoint('', null)).toEqual({ name: null, place: null });
  });
});

describe('splitEndpoint bare names', () => {
  it('reads a bare recipient as a name when asked', () => {
    expect(splitEndpoint('Sir Hans Sloane', null, 'name')).toEqual({
      name: 'Sir Hans Sloane',
      place: null,
    });
  });
});
