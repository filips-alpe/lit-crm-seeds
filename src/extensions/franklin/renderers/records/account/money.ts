/** Period helper for the ledger renderers. */

export type TermSpan = { kind: 'year' | 'years' | 'months' | 'days'; n: number };

const DAY = 86_400_000;

/** How long a subscription runs, from inclusive start/end dates. */
export function termSpan(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): TermSpan | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
  const days = Math.round((e - s) / DAY) + 1;
  const months = Math.round(days / 30.4375);
  if (months >= 12 && months % 12 === 0) {
    const n = months / 12;
    return n === 1 ? { kind: 'year', n } : { kind: 'years', n };
  }
  if (months >= 1) return { kind: 'months', n: months };
  return { kind: 'days', n: days };
}
