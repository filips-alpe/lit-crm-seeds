/**
 * Handles the small number of FO docs with no `date-from` at all (9 among
 * the 14,596 Franklin Papers docs, per the pipeline brief).
 *
 * Rule (explicit, never invents a date): walk the FO catalog in permalink
 * order (which tracks volume/document sequence) and place each undated doc
 * at the date of the nearest *preceding* dated document — "the earliest
 * date consistent with its volume/neighbours". If an undated doc has no
 * preceding dated neighbour at all (it's first in the catalog), it falls
 * back to the nearest *following* dated neighbour instead. Every filled-in
 * date is flagged via the returned `inferred` list so the record mapper can
 * attach a note; a date is never silently fabricated without that flag.
 */

export type DatedKey = { permalink: string; dateFrom?: string };

export function fillMissingDates(
  docsInPermalinkOrder: DatedKey[],
): Map<string, { dateFrom: string; inferred: true }> {
  const sorted = [...docsInPermalinkOrder].sort((a, b) => a.permalink.localeCompare(b.permalink));
  const result = new Map<string, { dateFrom: string; inferred: true }>();

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].dateFrom) continue;
    let fill: string | undefined;
    for (let j = i - 1; j >= 0; j--) {
      const d = result.get(sorted[j].permalink)?.dateFrom ?? sorted[j].dateFrom;
      if (d) {
        fill = d;
        break;
      }
    }
    if (!fill) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].dateFrom) {
          fill = sorted[j].dateFrom;
          break;
        }
      }
    }
    if (fill) result.set(sorted[i].permalink, { dateFrom: fill, inferred: true });
  }

  return result;
}
