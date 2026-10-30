import type { Correspondent, YearCount } from '$lib/dashboards/types';
import { findCorrespondent } from '../_family/pick';

export interface Exchange {
  name: string;
  /** Letters the user sent / received (matched by name). */
  sent: number;
  received: number;
  total: number;
  /** Share of the exchange that was the user writing, 0-100. */
  sentPct: number;
}

/** Father and son as one exchange: the correspondent matching `fragments`, or null. */
export function exchangeWith(people: Correspondent[], ...fragments: string[]): Exchange | null {
  const p = findCorrespondent(people, ...fragments);
  if (!p) return null;
  return {
    name: p.name,
    sent: p.sent,
    received: p.received,
    total: p.total,
    sentPct: p.total ? Math.round((p.sent / p.total) * 100) : 0,
  };
}

/** Letters before / from the war: counts either side of a cut-off year. */
export function eras(byYear: YearCount[], cutoff: number): { before: number; after: number } {
  let before = 0;
  let after = 0;
  for (const y of byYear) {
    if (y.year < cutoff) before += y.count;
    else after += y.count;
  }
  return { before, after };
}
