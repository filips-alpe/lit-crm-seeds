import type { YearCount } from '$lib/dashboards/types';
import { sliceYears } from '../_family/pick';

export const PASSY_FROM = 1777;
export const PASSY_TO = 1785;

export interface PassyWindow {
  /** Zero-filled years of the Passy residence (1777-1785), clipped to what the data spans. */
  years: YearCount[];
  inside: number;
  outside: number;
  peak: YearCount | null;
}

/** How much of the dated work falls inside the years at Passy. */
export function passyWindow(byYear: YearCount[]): PassyWindow {
  const years = sliceYears(byYear, PASSY_FROM, PASSY_TO);
  const inside = years.reduce((sum, y) => sum + y.count, 0);
  const total = byYear.reduce((sum, y) => sum + y.count, 0);
  let peak: YearCount | null = null;
  for (const y of years) if (y.count > 0 && (!peak || y.count > peak.count)) peak = y;
  return { years, inside, outside: total - inside, peak };
}
