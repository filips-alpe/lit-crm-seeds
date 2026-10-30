/**
 * Fetches Wikidata (CC0) facts about Franklin's circle and caches the raw
 * query results as a committed snapshot (../wikidata-snapshot.json). This is
 * the only place that touches the network; seed generation reads the snapshot.
 *
 * Run with: `tsx prisma/seed/sources/wikidata/fetch.ts`
 * Reads:  ../circle.json (written by ../extract-fo.ts)
 * Writes: ../wikidata-snapshot.json
 *
 * Polite client: honest User-Agent, one request at a time, at least one
 * second between requests, back-off on 429/5xx.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { CircleRoster } from '../extract-fo';
import { demoUsernameFor } from '../../pipeline/demo-users';
import { formatName } from '../../pipeline/names';
import {
  DEMO_QIDS,
  ENDPOINT,
  QUERIES,
  QUERY_NAMES,
  USER_AGENT,
  pickMatches,
  resolveQuery,
  labelVariants,
  type QueryName,
  type Row,
} from './queries';

export type SnapshotPerson = {
  qid: string;
  label: string;
  username?: string;
  foNames: string[];
};

export type WikidataSnapshot = {
  source: string;
  endpoint: string;
  fetchedAt: string;
  people: SnapshotPerson[];
  unresolved: { ambiguous: string[]; unmatched: string[] };
  results: Record<QueryName, Row[]>;
};

const MIN_GAP_MS = 1100;
const BATCH = 40;
let lastRequest = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Binding = Record<string, { value: string }>;

async function sparql(query: string): Promise<Row[]> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastRequest + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({ query }),
    });
    if (res.ok) {
      const json = (await res.json()) as { results: { bindings: Binding[] } };
      return json.results.bindings.map((b) =>
        Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])),
      );
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || 5 * (attempt + 1);
      console.warn(`HTTP ${res.status}, retrying in ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    throw new Error(`Wikidata query failed: HTTP ${res.status} ${await res.text()}`);
  }
  throw new Error('Wikidata query failed after retries');
}

const chunks = <T>(xs: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));

const qidOf = (uri: string) => uri.split('/').pop() as string;

async function resolvePeople(
  circle: CircleRoster,
): Promise<{ people: SnapshotPerson[]; ambiguous: string[]; unmatched: string[] }> {
  const foNames = [...new Set([...circle.demo, ...circle.people.map((p) => p.name)])].sort();
  const activity = new Map(circle.people.map((p) => [p.name, { from: p.from, to: p.to }]));
  const qidByName = new Map<string, string>();
  // Demo users with a known item: bind by username, no lookup needed.
  const toResolve: string[] = [];
  for (const name of foNames) {
    const username = demoUsernameFor(name);
    const known = username ? DEMO_QIDS[username] : undefined;
    if (known) qidByName.set(name, known);
    else toResolve.push(name);
  }

  const rows: Row[] = [];
  for (const batch of chunks(toResolve, 25)) {
    const labels = [...new Set(batch.flatMap(labelVariants))];
    rows.push(...(await sparql(resolveQuery(labels))));
  }
  const { matched, ambiguous, unmatched } = pickMatches(toResolve, rows, activity);
  for (const [name, qid] of matched) qidByName.set(name, qid);

  const byQid = new Map<string, SnapshotPerson>();
  for (const [name, qid] of [...qidByName].sort((a, b) => a[0].localeCompare(b[0]))) {
    const existing = byQid.get(qid);
    const username = demoUsernameFor(name);
    if (existing) {
      existing.foNames.push(name);
      existing.username ??= username;
    } else {
      byQid.set(qid, { qid, label: formatName(name), username, foNames: [name] });
    }
  }
  return { people: [...byQid.values()], ambiguous, unmatched };
}

export async function fetchSnapshot(): Promise<WikidataSnapshot> {
  const circle = JSON.parse(
    readFileSync(new URL('../circle.json', import.meta.url), 'utf8'),
  ) as CircleRoster;

  const { people, ambiguous, unmatched } = await resolvePeople(circle);
  const qids = people.map((p) => p.qid).sort();
  console.log(
    `resolved ${people.length} people (${ambiguous.length} ambiguous, ${unmatched.length} unmatched)`,
  );

  const results = {} as Record<QueryName, Row[]>;
  for (const name of QUERY_NAMES) {
    results[name] = [];
    for (const batch of chunks(qids, BATCH)) {
      results[name].push(...(await sparql(QUERIES[name](batch))));
    }
    console.log(`${name}: ${results[name].length} rows`);
  }

  // Wikidata labels beat the FO catalog formatting for display.
  const labelOf = new Map(results.labels.map((r) => [qidOf(r.p), r.pLabel]));
  for (const p of people) {
    const l = labelOf.get(p.qid);
    if (l && !/^Q\d+$/.test(l)) p.label = l;
  }

  return {
    source: 'Wikidata (CC0)',
    endpoint: ENDPOINT,
    fetchedAt: new Date().toISOString().slice(0, 10),
    people,
    unresolved: { ambiguous, unmatched },
    results,
  };
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  fetchSnapshot().then((snapshot) => {
    // Sort rows so a re-fetch of unchanged data produces an identical file.
    for (const name of QUERY_NAMES) {
      snapshot.results[name].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    writeFileSync(
      new URL('../wikidata-snapshot.json', import.meta.url),
      JSON.stringify(snapshot) + '\n',
    );
    console.log(`Wrote snapshot with ${snapshot.people.length} people.`);
  });
}
