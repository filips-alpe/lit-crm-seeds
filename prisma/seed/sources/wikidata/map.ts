/**
 * Pure mapper: cached Wikidata snapshot (fetch.ts) -> life / office /
 * membership records. No network, no clock, no randomness.
 *
 * Titles follow the spec: "Birth of Benjamin Franklin", "Marriage of A and B",
 * "John Adams — President of the United States", "X — member of Royal
 * Society", "Award: Copley Medal (X)". References are the person's Wikidata
 * entity URL; places with coordinates (P625) become `toGeo` "lat,lng".
 */
import { assignPeriod, assignThematic } from '../../pipeline/projects';
import type { GeneratedRecord } from '../../pipeline/record-mapper';
import type { Row } from './queries';
import type { WikidataSnapshot, SnapshotPerson } from './fetch';
import type { CircleRoster } from '../extract-fo';
import { assessPerson } from './confidence';

const FRANKLIN_BORN = '1706-01-17';
const FRANKLIN_DIED = '1790-04-17';

const qidOf = (uri: string | undefined): string | undefined => uri?.split('/').pop();
export const entityUrl = (qid: string) => `https://www.wikidata.org/entity/${qid}`;

/** A label, unless the service fell back to the bare QID. */
function label(value: string | undefined): string | undefined {
  return value && !/^Q\d+$/.test(value) ? value : undefined;
}

type When = { date: string; approx: boolean };

/** "1706-01-17T00:00:00Z" (+ Wikidata precision: 9 year, 10 month, 11 day) -> ISO day. */
export function parseTime(value: string | undefined, precision?: string): When | undefined {
  const m = value?.match(/^\+?(\d{4})-(\d{2})-(\d{2})/);
  if (!m || Number(m[1]) < 1000) return undefined;
  const prec = precision === undefined ? 11 : Number(precision);
  const month = prec >= 10 && m[2] !== '00' ? m[2] : '01';
  const day = prec >= 11 && m[3] !== '00' ? m[3] : '01';
  return { date: `${m[1]}-${month}-${day}`, approx: prec < 11 };
}

/** "Point(-71.0578 42.3603)" (lng lat) -> "42.3603,-71.0578" (lat,lng). */
export function parseCoord(wkt: string | undefined): string | undefined {
  const m = wkt?.match(/^Point\((-?[\d.]+) (-?[\d.]+)\)$/);
  if (!m) return undefined;
  const round = (n: string) => String(Math.round(Number(n) * 1e5) / 1e5);
  return `${round(m[2])},${round(m[1])}`;
}

const APPROX_NOTE =
  'Date given by Wikidata with less than day precision; shown as the first day of the period.';

const byKey = (a: Row, b: Row) => JSON.stringify(a).localeCompare(JSON.stringify(b));

function projectsFor(entered: string, title: string, extra = ''): string[] {
  const inLife = entered >= FRANKLIN_BORN && entered <= FRANKLIN_DIED;
  return [...(inLife ? [assignPeriod(entered)] : []), ...assignThematic(title, extra)];
}

type Draft = {
  type: 'life' | 'office' | 'membership';
  key: string;
  title: string;
  person: SnapshotPerson;
  when: When;
  end?: When;
  place?: string;
  geo?: string;
  to?: string;
  description?: string;
  /** The event is about someone else (a child): never attribute it to the person. */
  noCreator?: boolean;
};

function toRecord(d: Draft): GeneratedRecord {
  const span = d.end !== undefined && d.end.date > d.when.date;
  const entered = d.when.date;
  const approx = d.when.approx || (span && d.end?.approx);
  return {
    type: d.type,
    title: d.title,
    description: d.description,
    note: approx ? APPROX_NOTE : undefined,
    references: [entityUrl(d.person.qid)],
    entered,
    ...(d.type === 'office' || span
      ? { start: d.when.date, ...(span ? { end: d.end?.date } : {}), allDay: true }
      : { date: d.when.date }),
    from: d.person.label,
    to: d.to ?? d.place,
    toGeo: d.geo,
    creatorUsername: d.noCreator ? undefined : d.person.username,
    projects: projectsFor(entered, d.title, d.to ?? d.place ?? ''),
    permalink: `wikidata:${d.key}`,
  };
}

const yearOf = (v: string | undefined) => (v ? Number(v.slice(0, 4)) : undefined);

/** Earliest birth / death year per person QID from the cached rows. */
function lifespans(results: WikidataSnapshot['results']) {
  const earliest = (rows: Row[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const y = yearOf(r.date);
      const q = qidOf(r.p) as string;
      if (y !== undefined && (m.get(q) ?? Infinity) > y) m.set(q, y);
    }
    return m;
  };
  return { born: earliest(results.births), died: earliest(results.deaths) };
}

/**
 * Maps the snapshot to records. With a roster, only people whose match passes
 * `assessPerson` are kept (see confidence.ts); without one every cached person is.
 */
export function mapWikidata(snapshot: WikidataSnapshot, roster?: CircleRoster): GeneratedRecord[] {
  const { results } = snapshot;
  const { born, died } = lifespans(results);
  const activity = new Map(roster?.people.map((p) => [p.name, p]));
  const top = new Set(roster?.top.map((t) => t.name));
  const people = new Map(
    snapshot.people
      .filter(
        (p) =>
          !roster ||
          assessPerson(
            {
              foName: p.foNames[0],
              label: p.label,
              isDemo: p.username !== undefined,
              isTop: p.foNames.some((n) => top.has(n)),
              born: born.get(p.qid),
              died: died.get(p.qid),
            },
            p.foNames.map((n) => activity.get(n)).find(Boolean),
          ).keep,
      )
      .map((p) => [p.qid, p]),
  );
  const drafts: Draft[] = [];
  const seen = new Set<string>();
  const push = (d: Draft | undefined) => {
    if (!d || seen.has(d.key)) return;
    // Posthumous honours (halls of fame, citizenships) are not events in the person's life.
    const death = died.get(d.person.qid);
    if (d.type !== 'life' && death !== undefined && Number(d.when.date.slice(0, 4)) > death + 1)
      return;
    seen.add(d.key);
    drafts.push(d);
  };

  const place = (r: Row) => ({
    place: label(r.placeLabel),
    geo: parseCoord(r.coord),
  });

  // Births, deaths: the earliest dated statement per person, preferring a row that carries a place.
  const lifeEvent = (
    rows: Row[],
    kind: 'birth' | 'death',
    title: (n: string) => string,
    verb: string,
  ) => {
    const best = new Map<string, Row>();
    for (const r of [...rows].sort(byKey)) {
      const qid = qidOf(r.p) as string;
      const prior = best.get(qid);
      if (
        !prior ||
        (!prior.place && r.place) ||
        (r.date < prior.date && (!prior.place || r.place))
      ) {
        best.set(qid, r);
      }
    }
    for (const [qid, r] of best) {
      const person = people.get(qid);
      const when = parseTime(r.date, r.prec);
      if (!person || !when) continue;
      const pl = place(r);
      push({
        type: 'life',
        key: `${qid}:${kind}`,
        title: title(person.label),
        person,
        when,
        ...pl,
        description: pl.place ? `${verb} in ${pl.place}.` : undefined,
      });
    }
  };
  lifeEvent(results.births, 'birth', (n) => `Birth of ${n}`, 'Born');
  lifeEvent(results.deaths, 'death', (n) => `Death of ${n}`, 'Died');

  for (const r of [...results.baptisms].sort(byKey)) {
    const qid = qidOf(r.p) as string;
    const person = people.get(qid);
    const when = parseTime(r.date, r.prec);
    if (person && when) {
      push({
        type: 'life',
        key: `${qid}:baptism`,
        title: `Baptism of ${person.label}`,
        person,
        when,
      });
    }
  }

  for (const r of [...results.marriages].sort(byKey)) {
    const a = qidOf(r.p) as string;
    const b = qidOf(r.spouse) as string;
    const when = parseTime(r.start, r.startPrec);
    const spouseName = label(r.spouseLabel);
    let person = people.get(a);
    if (!person || !when || !spouseName) continue;
    // Emit a marriage between two circle members once, led by the demo user if there is one.
    const other = people.get(b);
    let name = spouseName;
    if (other && (other.username || (!person.username && b < a))) {
      [person, name] = [other, person.label];
    }
    const key = `marriage:${[a, b].sort().join('+')}`;
    push({
      type: 'life',
      key,
      title: `Marriage of ${person.label} and ${name}`,
      person,
      when,
      end: parseTime(r.end, r.endPrec),
      ...place(r),
      description: r.end ? 'The marriage ended.' : undefined,
    });
  }

  for (const r of [...results.children].sort(byKey)) {
    const parentQid = qidOf(r.p) as string;
    const childQid = qidOf(r.child) as string;
    const person = people.get(parentQid);
    const childName = label(r.childLabel);
    const when = parseTime(r.date, r.prec);
    if (!person || !childName || !when || people.has(childQid)) continue;
    push({
      type: 'life',
      key: `${childQid}:birth`,
      title: `Birth of ${childName} (child of ${person.label})`,
      person,
      noCreator: true,
      when,
      ...place(r),
    });
  }

  for (const r of [...results.offices].sort(byKey)) {
    const qid = qidOf(r.p) as string;
    const person = people.get(qid);
    const pos = label(r.posLabel);
    const when = parseTime(r.start, r.startPrec);
    if (!person || !pos || !when) continue;
    const of = label(r.ofLabel);
    const jurisdiction = label(r.jLabel);
    push({
      type: 'office',
      key: `${qid}:office:${qidOf(r.pos)}:${when.date}`,
      title: `${person.label} — ${pos}`,
      person,
      when,
      end: parseTime(r.end, r.endPrec),
      to: of ?? jurisdiction,
      geo: parseCoord(r.ofCoord) ?? parseCoord(r.jCoord),
    });
  }

  for (const r of [...results.memberships].sort(byKey)) {
    const qid = qidOf(r.p) as string;
    const person = people.get(qid);
    const body = label(r.bodyLabel);
    const start = parseTime(r.start, r.startPrec) ?? parseTime(r.at, r.atPrec);
    if (!person || !body || !start) continue;
    push({
      type: 'membership',
      key: `${qid}:member:${qidOf(r.body)}:${start.date}`,
      title: `${person.label} — member of ${body}`,
      person,
      when: start,
      end: parseTime(r.end, r.endPrec),
      to: body,
    });
  }

  for (const r of [...results.awards].sort(byKey)) {
    const qid = qidOf(r.p) as string;
    const person = people.get(qid);
    const award = label(r.awardLabel);
    const when = parseTime(r.at, r.atPrec) ?? parseTime(r.start, r.startPrec);
    if (!person || !award || !when) continue;
    push({
      type: 'membership',
      key: `${qid}:award:${qidOf(r.award)}:${when.date}`,
      title: `Award: ${award} (${person.label})`,
      person,
      when,
      to: award,
    });
  }

  return drafts
    .map(toRecord)
    .sort((a, b) => a.entered.localeCompare(b.entered) || a.permalink.localeCompare(b.permalink));
}
