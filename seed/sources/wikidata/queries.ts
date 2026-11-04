/**
 * SPARQL for the Wikidata importer (https://query.wikidata.org/sparql, CC0 data).
 * Pure string builders: no network here. Every query takes a batch of person
 * QIDs and returns flat rows; fetch.ts runs them and caches the responses,
 * map.ts turns the cached rows into seed records.
 */

export const ENDPOINT = 'https://query.wikidata.org/sparql';
export const USER_AGENT = 'lit-crm-seed/0.1 (filips.alpe@gmail.com)';

export type Row = Record<string, string>;

/** Demo users whose Wikidata item is known up front (see .workflow types-regen sources). */
export const DEMO_QIDS: Record<string, string> = {
  bfranklin: 'Q34969',
  dfranklin: 'Q3020859',
  phewson: 'Q135103426',
  wtfranklin: 'Q15487954',
  wfranklin: 'Q4020008',
  sbache: 'Q7422311',
  pcollinson: 'Q1350818',
  ahelvetius: 'Q461961',
  jadams: 'Q11806',
  tjefferson: 'Q11812',
  lafayette: 'Q186652',
  gsharp: 'Q726029',
  estiles: 'Q547352',
};

const values = (qids: string[]) => qids.map((q) => `wd:${q}`).join(' ');
const LABEL = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }';

const timeOf = (stmt: string, prop: string, dateVar: string, precVar: string) =>
  `?${stmt} psv:${prop} ?${dateVar}_v . ?${dateVar}_v wikibase:timeValue ?${dateVar} ; wikibase:timePrecision ?${precVar} .`;

/** Qualifier time with its precision, as an OPTIONAL block. */
const qualifierTime = (stmt: string, prop: string, dateVar: string, precVar: string) =>
  `OPTIONAL { ?${stmt} pqv:${prop} ?${dateVar}_v . ?${dateVar}_v wikibase:timeValue ?${dateVar} ; wikibase:timePrecision ?${precVar} . }`;

const notDeprecated = (stmt: string) =>
  `?${stmt} wikibase:rank ?${stmt}_rank . FILTER(?${stmt}_rank != wikibase:DeprecatedRank)`;

/** Resolves exact English labels / aliases to humans born 1650-1790. */
export function resolveQuery(labels: string[]): string {
  const lits = labels.map((l) => `"${l.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"@en`).join(' ');
  return `SELECT ?lbl ?p ?born ?died ?sl WHERE {
  VALUES ?lbl { ${lits} }
  ?p (rdfs:label|skos:altLabel) ?lbl ; wdt:P31 wd:Q5 ; wdt:P569 ?born .
  ?p wikibase:sitelinks ?sl .
  OPTIONAL { ?p wdt:P570 ?died }
  FILTER(YEAR(?born) >= 1650 && YEAR(?born) <= 1790)
}`;
}

export const QUERIES = {
  labels: (qids: string[]) => `SELECT ?p ?pLabel WHERE { VALUES ?p { ${values(qids)} } ${LABEL} }`,

  births: (qids: string[]) => `SELECT ?p ?pLabel ?date ?prec ?place ?placeLabel ?coord WHERE {
  VALUES ?p { ${values(qids)} }
  ?p p:P569 ?s . ${notDeprecated('s')} ${timeOf('s', 'P569', 'date', 'prec')}
  OPTIONAL { ?p wdt:P19 ?place . OPTIONAL { ?place wdt:P625 ?coord } }
  ${LABEL}
}`,

  deaths: (qids: string[]) => `SELECT ?p ?pLabel ?date ?prec ?place ?placeLabel ?coord WHERE {
  VALUES ?p { ${values(qids)} }
  ?p p:P570 ?s . ${notDeprecated('s')} ${timeOf('s', 'P570', 'date', 'prec')}
  OPTIONAL { ?p wdt:P20 ?place . OPTIONAL { ?place wdt:P625 ?coord } }
  ${LABEL}
}`,

  baptisms: (qids: string[]) => `SELECT ?p ?pLabel ?date ?prec WHERE {
  VALUES ?p { ${values(qids)} }
  ?p p:P1636 ?s . ${notDeprecated('s')} ${timeOf('s', 'P1636', 'date', 'prec')}
  ${LABEL}
}`,

  marriages: (
    qids: string[],
  ) => `SELECT ?p ?pLabel ?spouse ?spouseLabel ?start ?startPrec ?end ?endPrec ?place ?placeLabel ?coord WHERE {
  VALUES ?p { ${values(qids)} }
  ?p p:P26 ?s . ?s ps:P26 ?spouse . ${notDeprecated('s')}
  ${qualifierTime('s', 'P580', 'start', 'startPrec')}
  ${qualifierTime('s', 'P582', 'end', 'endPrec')}
  OPTIONAL { ?s pq:P2842 ?place . OPTIONAL { ?place wdt:P625 ?coord } }
  ${LABEL}
}`,

  children: (
    qids: string[],
  ) => `SELECT ?p ?pLabel ?child ?childLabel ?date ?prec ?place ?placeLabel ?coord WHERE {
  VALUES ?p { ${values(qids)} }
  ?p wdt:P40 ?child .
  ?child p:P569 ?s . ${notDeprecated('s')} ${timeOf('s', 'P569', 'date', 'prec')}
  OPTIONAL { ?child wdt:P19 ?place . OPTIONAL { ?place wdt:P625 ?coord } }
  ${LABEL}
}`,

  offices: (
    qids: string[],
  ) => `SELECT ?p ?pLabel ?pos ?posLabel ?start ?startPrec ?end ?endPrec ?of ?ofLabel ?ofCoord ?j ?jLabel ?jCoord WHERE {
  VALUES ?p { ${values(qids)} }
  ?p p:P39 ?s . ?s ps:P39 ?pos . ${notDeprecated('s')}
  ${qualifierTime('s', 'P580', 'start', 'startPrec')}
  ${qualifierTime('s', 'P582', 'end', 'endPrec')}
  OPTIONAL { ?s pq:P642 ?of . OPTIONAL { ?of wdt:P625 ?ofCoord } }
  OPTIONAL { ?pos wdt:P1001 ?j . OPTIONAL { ?j wdt:P625 ?jCoord } }
  ${LABEL}
}`,

  memberships: (
    qids: string[],
  ) => `SELECT ?p ?pLabel ?body ?bodyLabel ?start ?startPrec ?end ?endPrec ?at ?atPrec WHERE {
  VALUES ?p { ${values(qids)} }
  ?p p:P463 ?s . ?s ps:P463 ?body . ${notDeprecated('s')}
  ${qualifierTime('s', 'P580', 'start', 'startPrec')}
  ${qualifierTime('s', 'P582', 'end', 'endPrec')}
  ${qualifierTime('s', 'P585', 'at', 'atPrec')}
  ${LABEL}
}`,

  awards: (
    qids: string[],
  ) => `SELECT ?p ?pLabel ?award ?awardLabel ?at ?atPrec ?start ?startPrec WHERE {
  VALUES ?p { ${values(qids)} }
  ?p p:P166 ?s . ?s ps:P166 ?award . ${notDeprecated('s')}
  ${qualifierTime('s', 'P585', 'at', 'atPrec')}
  ${qualifierTime('s', 'P580', 'start', 'startPrec')}
  ${LABEL}
}`,
} as const;

export type QueryName = keyof typeof QUERIES;
export const QUERY_NAMES = Object.keys(QUERIES) as QueryName[];

const PARTICLES = new Set(['de', 'du', 'von', 'van', 'le', 'la', 'des', 'der']);

/**
 * Candidate English labels for an FO catalog name ("Last, First Middle[, Suffix]"),
 * most specific first: the full "First Middle Last", "First, Suffix Last" for
 * titled names, then the first given name alone with the surname (and particle).
 */
export function labelVariants(foName: string): string[] {
  const parts = foName.split(',').map((p) => p.trim());
  if (parts.length < 2) return [foName.trim()];
  const [last, firstRaw, ...suffix] = parts;
  const first = firstRaw
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const out: string[] = [];
  const isGeneration = (s: string) => /^(Jr\.?|Sr\.?|II|III)$/.test(s);
  const titles = suffix.filter((s) => !isGeneration(s));
  if (titles.length) out.push(`${first}, ${titles.join(' ')} ${last}`);
  out.push(`${first} ${last}`);
  const tokens = first.split(/[\s]/).filter(Boolean);
  const givenParts = first.split(/[\s-]/).filter(Boolean);
  const given = givenParts[0];
  const particle =
    tokens.length > 1 && PARTICLES.has(tokens[tokens.length - 1]) ? tokens[tokens.length - 1] : '';
  if (given && `${given} ${last}` !== `${first} ${last}`) {
    out.push(particle ? `${given} ${particle} ${last}` : `${given} ${last}`);
  }
  return [...new Set(out)];
}

/** A namesake wins only when clearly the better known: most sitelinks, at least 10 and 2x the runner-up. */
const DOMINANCE_MIN = 10;
const DOMINANCE_FACTOR = 2;
/** A candidate must be at least this old when the person's first document is dated. */
const ADULT_AGE = 8;

export type Activity = { from?: number; to?: number };

/**
 * Picks at most one QID per FO name from the resolve-query rows. Candidates
 * whose lifespan cannot cover the years the person's documents span are
 * discarded (namesakes of another era). The first (most specific) label
 * variant with any candidate decides; several distinct items behind it are
 * disambiguated by notability (sitelinks) and otherwise left unresolved
 * rather than guessed.
 */
export function pickMatches(
  foNames: string[],
  rows: Row[],
  activity: Map<string, Activity> = new Map(),
): { matched: Map<string, string>; ambiguous: string[]; unmatched: string[] } {
  const byLabel = new Map<string, Row[]>();
  for (const r of rows) byLabel.set(r.lbl, [...(byLabel.get(r.lbl) ?? []), r]);

  const fits = (name: string, r: Row) => {
    const a = activity.get(name);
    if (!a) return true;
    const born = Number(r.born.slice(0, 4));
    const died = r.died ? Number(r.died.slice(0, 4)) : undefined;
    return (
      (a.from === undefined || born <= a.from - ADULT_AGE) &&
      (a.to === undefined || died === undefined || died >= a.to - 1)
    );
  };

  const matched = new Map<string, string>();
  const ambiguous: string[] = [];
  const unmatched: string[] = [];
  for (const name of foNames) {
    let candidates: Map<string, number> | undefined;
    for (const v of labelVariants(name)) {
      const hits = new Map<string, number>();
      for (const r of byLabel.get(v) ?? []) {
        if (fits(name, r)) hits.set(r.p.split('/').pop() as string, Number(r.sl) || 0);
      }
      if (hits.size > 0) {
        candidates = hits;
        break;
      }
    }
    if (!candidates) {
      unmatched.push(name);
      continue;
    }
    const ranked = [...candidates].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
    const [top, runnerUp] = ranked;
    if (!runnerUp || (top[1] >= DOMINANCE_MIN && top[1] >= DOMINANCE_FACTOR * runnerUp[1])) {
      matched.set(name, top[0]);
    } else {
      ambiguous.push(name);
    }
  }
  return { matched, ambiguous, unmatched };
}
