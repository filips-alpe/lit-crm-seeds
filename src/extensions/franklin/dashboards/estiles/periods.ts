import type { ProjectCount, TypeCount } from '$lib/dashboards/types';

export interface PeriodBar {
  id: string;
  label: string;
  color: string;
  count: number;
  /** 0–1 of the busiest period. */
  width: number;
  start: number;
}

export const countOf = (counts: TypeCount[], code: string) =>
  counts.find((c) => c.code === code)?.count ?? 0;

/** 'periode-france-1776-1785' → 'France 1776–1785'; anything else is returned unchanged. */
export function periodLabel(code: string): string {
  const match = /^periode-(.+)-(\d{4})-(\d{4})$/.exec(code);
  if (!match) return code;
  const place = match[1]
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `${place} ${match[2]}–${match[3]}`;
}

/** The period projects (not themes), in chronological order, each sized against the busiest. */
export function periodBars(projects: ProjectCount[]): PeriodBar[] {
  const periods = projects
    .filter((p) => p.code.startsWith('periode-') && p.count > 0)
    .map((p) => ({
      id: p.id,
      label: periodLabel(p.code),
      color: p.color,
      count: p.count,
      start: Number(/(\d{4})-\d{4}$/.exec(p.code)?.[1] ?? 0),
    }));
  const max = Math.max(1, ...periods.map((p) => p.count));
  return periods.sort((a, b) => a.start - b.start).map((p) => ({ ...p, width: p.count / max }));
}
