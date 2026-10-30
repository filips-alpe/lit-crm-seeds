import { describe, expect, it } from 'vitest';
import { mapWikidata, parseCoord, parseTime } from './map';
import type { WikidataSnapshot } from './fetch';

const E = 'http://www.wikidata.org/entity/';

function snapshot(results: Partial<WikidataSnapshot['results']>): WikidataSnapshot {
  return {
    source: 'Wikidata (CC0)',
    endpoint: 'https://query.wikidata.org/sparql',
    fetchedAt: '2026-10-30',
    people: [
      {
        qid: 'Q34969',
        label: 'Benjamin Franklin',
        username: 'bfranklin',
        foNames: ['Franklin, Benjamin'],
      },
      {
        qid: 'Q3020859',
        label: 'Deborah Read',
        username: 'dfranklin',
        foNames: ['Franklin, Deborah'],
      },
      { qid: 'Q11806', label: 'John Adams', username: 'jadams', foNames: ['Adams, John'] },
      { qid: 'Q1', label: 'Some Body', foNames: ['Body, Some'] },
    ],
    unresolved: { ambiguous: [], unmatched: [] },
    results: {
      labels: [],
      births: [],
      deaths: [],
      baptisms: [],
      marriages: [],
      children: [],
      offices: [],
      memberships: [],
      awards: [],
      ...results,
    },
  };
}

describe('parseTime', () => {
  it('reads a day-precision timestamp', () => {
    expect(parseTime('1706-01-17T00:00:00Z', '11')).toEqual({ date: '1706-01-17', approx: false });
  });
  it('flags and floors year and month precision', () => {
    expect(parseTime('1745-01-01T00:00:00Z', '9')).toEqual({ date: '1745-01-01', approx: true });
    expect(parseTime('1745-06-01T00:00:00Z', '10')).toEqual({ date: '1745-06-01', approx: true });
  });
  it('rejects missing or unknown-value times', () => {
    expect(parseTime(undefined)).toBeUndefined();
    expect(parseTime('http://www.wikidata.org/.well-known/genid/abc')).toBeUndefined();
  });
});

describe('parseCoord', () => {
  it('turns WKT "Point(lng lat)" into "lat,lng"', () => {
    expect(parseCoord('Point(-71.057777777 42.360277777)')).toBe('42.36028,-71.05778');
  });
  it('ignores anything else', () => {
    expect(parseCoord('POINT EMPTY')).toBeUndefined();
    expect(parseCoord(undefined)).toBeUndefined();
  });
});

describe('mapWikidata ownership and confidence', () => {
  it('leaves non-demo subjects and child births without a creator', () => {
    const records = mapWikidata(
      snapshot({
        births: [{ p: `${E}Q1`, date: '1700-01-01T00:00:00Z', prec: '11' }],
        children: [
          {
            p: `${E}Q34969`,
            child: `${E}Q50`,
            childLabel: 'Francis',
            date: '1732-10-20T00:00:00Z',
            prec: '11',
          },
        ],
      }),
    );
    expect(records.find((r) => r.title === 'Birth of Some Body')?.creatorUsername).toBeUndefined();
    const child = records.find((r) => r.title.startsWith('Birth of Francis'));
    expect(child?.creatorUsername).toBeUndefined();
  });

  it('drops people that fail the confidence check when a roster is given', () => {
    const roster = {
      demo: [],
      top: [],
      people: [{ name: 'Body, Some', count: 1, from: 1700, to: 1701 }],
    };
    const births = [
      { p: `${E}Q1`, date: '1650-01-01T00:00:00Z', prec: '11' },
      { p: `${E}Q34969`, date: '1706-01-17T00:00:00Z', prec: '11' },
    ];
    expect(mapWikidata(snapshot({ births })).map((r) => r.title)).toEqual([
      'Birth of Some Body',
      'Birth of Benjamin Franklin',
    ]);
    expect(mapWikidata(snapshot({ births }), roster).map((r) => r.title)).toEqual([
      'Birth of Benjamin Franklin',
    ]);
  });
});

describe('mapWikidata posthumous honours', () => {
  it('drops awards and memberships dated after the person died', () => {
    const records = mapWikidata(
      snapshot({
        deaths: [{ p: `${E}Q34969`, date: '1790-04-17T00:00:00Z', prec: '11' }],
        awards: [
          {
            p: `${E}Q34969`,
            award: `${E}Q1`,
            awardLabel: 'Hall of Fame',
            at: '1999-01-01T00:00:00Z',
            atPrec: '9',
          },
        ],
      }),
    );
    expect(records.map((r) => r.title)).toEqual(['Death of Benjamin Franklin']);
  });
});

describe('mapWikidata', () => {
  it('maps a birth to a life record with place, coordinates and creator', () => {
    const [r] = mapWikidata(
      snapshot({
        births: [
          {
            p: `${E}Q34969`,
            pLabel: 'Benjamin Franklin',
            date: '1706-01-17T00:00:00Z',
            prec: '11',
            place: `${E}Q100`,
            placeLabel: 'Boston',
            coord: 'Point(-71.057777777 42.360277777)',
          },
        ],
      }),
    );
    expect(r).toMatchObject({
      type: 'life',
      title: 'Birth of Benjamin Franklin',
      entered: '1706-01-17',
      date: '1706-01-17',
      from: 'Benjamin Franklin',
      to: 'Boston',
      toGeo: '42.36028,-71.05778',
      creatorUsername: 'bfranklin',
      references: ['https://www.wikidata.org/entity/Q34969'],
      description: 'Born in Boston.',
      projects: ['periode-boston-1706-1723'],
    });
    expect(r.note).toBeUndefined();
  });

  it('keeps one birth per person, preferring a row that has a place', () => {
    const records = mapWikidata(
      snapshot({
        births: [
          { p: `${E}Q1`, date: '1700-01-01T00:00:00Z', prec: '11' },
          {
            p: `${E}Q1`,
            date: '1700-01-01T00:00:00Z',
            prec: '11',
            place: `${E}Q9`,
            placeLabel: 'Lyon',
          },
        ],
      }),
    );
    expect(records).toHaveLength(1);
    expect(records[0].to).toBe('Lyon');
  });

  it('notes dates given below day precision', () => {
    const [r] = mapWikidata(
      snapshot({ deaths: [{ p: `${E}Q1`, date: '1760-01-01T00:00:00Z', prec: '9' }] }),
    );
    expect(r.title).toBe('Death of Some Body');
    expect(r.note).toMatch(/less than day precision/);
  });

  it('emits a marriage between two circle members once, led by the demo user', () => {
    const records = mapWikidata(
      snapshot({
        marriages: [
          {
            p: `${E}Q3020859`,
            spouse: `${E}Q34969`,
            spouseLabel: 'Benjamin Franklin',
            start: '1730-09-01T00:00:00Z',
            startPrec: '11',
          },
          {
            p: `${E}Q34969`,
            spouse: `${E}Q3020859`,
            spouseLabel: 'Deborah Read',
            start: '1730-09-01T00:00:00Z',
            startPrec: '11',
            place: `${E}Q5`,
            placeLabel: 'Philadelphia',
          },
        ],
      }),
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ type: 'life', creatorUsername: 'bfranklin' });
    expect(records[0].title).toBe('Marriage of Benjamin Franklin and Deborah Read');
  });

  it('skips marriages and offices that have no start date', () => {
    const records = mapWikidata(
      snapshot({
        marriages: [{ p: `${E}Q34969`, spouse: `${E}Q7`, spouseLabel: 'X' }],
        offices: [{ p: `${E}Q11806`, pos: `${E}Q8`, posLabel: 'Delegate' }],
      }),
    );
    expect(records).toEqual([]);
  });

  it('maps an office to a span with the jurisdiction as place', () => {
    const [r] = mapWikidata(
      snapshot({
        offices: [
          {
            p: `${E}Q11806`,
            pos: `${E}Q11696`,
            posLabel: 'President of the United States',
            start: '1797-03-04T00:00:00Z',
            startPrec: '11',
            end: '1801-03-04T00:00:00Z',
            endPrec: '11',
            j: `${E}Q30`,
            jLabel: 'United States',
            jCoord: 'Point(-98.5 39.8)',
          },
        ],
      }),
    );
    expect(r).toMatchObject({
      type: 'office',
      title: 'John Adams — President of the United States',
      entered: '1797-03-04',
      start: '1797-03-04',
      end: '1801-03-04',
      allDay: true,
      to: 'United States',
      toGeo: '39.8,-98.5',
      creatorUsername: 'jadams',
      projects: [],
    });
    expect(r.date).toBeUndefined();
  });

  it('maps memberships and awards to membership records', () => {
    const records = mapWikidata(
      snapshot({
        memberships: [
          {
            p: `${E}Q34969`,
            body: `${E}Q123885`,
            bodyLabel: 'Royal Society',
            start: '1756-12-02T00:00:00Z',
            startPrec: '11',
          },
          { p: `${E}Q34969`, body: `${E}Q2`, bodyLabel: 'Undated Club' },
        ],
        awards: [
          {
            p: `${E}Q34969`,
            award: `${E}Q28003`,
            awardLabel: 'Copley Medal',
            at: '1753-01-01T00:00:00Z',
            atPrec: '9',
          },
        ],
      }),
    );
    expect(records.map((r) => [r.type, r.title, r.entered])).toEqual([
      ['membership', 'Award: Copley Medal (Benjamin Franklin)', '1753-01-01'],
      ['membership', 'Benjamin Franklin — member of Royal Society', '1756-12-02'],
    ]);
    expect(records[1].to).toBe('Royal Society');
    expect(records[1].date).toBe('1756-12-02');
  });

  it('skips a child who is already a circle member and labels the rest', () => {
    const records = mapWikidata(
      snapshot({
        children: [
          {
            p: `${E}Q34969`,
            child: `${E}Q11806`,
            childLabel: 'John Adams',
            date: '1735-10-30T00:00:00Z',
            prec: '11',
          },
          {
            p: `${E}Q34969`,
            child: `${E}Q50`,
            childLabel: 'Francis Folger Franklin',
            date: '1732-10-20T00:00:00Z',
            prec: '11',
          },
        ],
      }),
    );
    expect(records.map((r) => r.title)).toEqual([
      'Birth of Francis Folger Franklin (child of Benjamin Franklin)',
    ]);
  });

  it('is deterministic regardless of input row order', () => {
    const births = [
      { p: `${E}Q34969`, date: '1706-01-17T00:00:00Z', prec: '11' },
      { p: `${E}Q11806`, date: '1735-10-30T00:00:00Z', prec: '11' },
    ];
    expect(mapWikidata(snapshot({ births }))).toEqual(
      mapWikidata(snapshot({ births: [...births].reverse() })),
    );
  });
});
