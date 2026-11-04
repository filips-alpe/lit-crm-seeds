import type { YearCount } from '$lib/dashboards/types';

/** The longest run of consecutive empty years strictly between the first and last dated year. */
export function longestSilence(
  byYear: YearCount[],
): { from: number; to: number; years: number } | null {
  let best: { from: number; to: number; years: number } | null = null;
  let start: number | null = null;
  for (const { year, count } of byYear) {
    if (count === 0) {
      start ??= year;
    } else if (start !== null) {
      const years = year - start;
      if (!best || years > best.years) best = { from: start, to: year - 1, years };
      start = null;
    }
  }
  return best;
}

/** Years with at least one dated record, out of the years between the first and the last. */
export function activeYears(byYear: YearCount[]): { active: number; span: number } {
  return { active: byYear.filter((y) => y.count > 0).length, span: byYear.length };
}
