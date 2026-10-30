/**
 * Old Style (Julian, as Founders Online stores it) -> New Style (Gregorian)
 * date conversion.
 *
 * England (and her colonies) adjusted the calendar in two ways, at different
 * times:
 *  - The Julian/Gregorian day-count gap widened from 10 to 11 days on
 *    1700-03-01 (Gregorian leap years and Julian leap years diverged at the
 *    turn of that century).
 *  - England adopted the Gregorian calendar outright on 1752-09-14 (the day
 *    after 1752-09-02 OS), after which OS and NS are the same calendar.
 *
 * Founders Online stores `date-from`/`date-to` as OS-as-written (confirmed in
 * the pipeline brief: Franklin's birth is cataloged as "6 January 1706", the
 * universally-cited OS date). This module derives the NS date the seed's
 * `createdAt`/timeline field needs; the OS value is kept verbatim in the
 * `date` column by the record mapper.
 */

const GAP_WIDENS = '1700-03-01';
const LAST_OS_DATE = '1752-09-02'; // last day England used the Julian calendar

export function isOldStyle(isoDate: string): boolean {
  return isoDate <= LAST_OS_DATE;
}

export function osToNs(isoDate: string): string {
  if (!isOldStyle(isoDate)) return isoDate;
  const offsetDays = isoDate < GAP_WIDENS ? 10 : 11;
  const [y, m, d] = isoDate.split('-').map(Number);
  // UTC midnight avoids local-timezone day-shifting.
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
