import type { RendererProps } from '$lib/render/props';
import { asText, byWriteTo, present } from '$lib/render/select';
import { parseLatLng } from '$lib/fields/registry';

type Fields = RendererProps['fields'];

/** A field's formatted text by writeTo column, or null when empty. */
export function textOf(fields: Fields, col: string): string | null {
  const f = byWriteTo(fields, col);
  return present(f) ? asText(f.value).trim() || null : null;
}

/** The linked user's display name for a `creatorId` / `assigneeId` field, or null. */
export function personOf(fields: Fields, col: string): string | null {
  return byWriteTo(fields, col)?.relation?.label || null;
}

function toDate(raw: unknown): Date | null {
  if (raw == null || raw === '') return null;
  const d = raw instanceof Date ? raw : new Date(raw as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Calendar parts are read in UTC: a historical date is a calendar day, not an instant.
const day = (d: Date): string => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
const full = (d: Date): string => `${day(d)} ${d.getUTCFullYear()}`;

/** "25 May 1747", or the span "3 Jun – 5 Aug 1747" / "3 Jun 1747 – 5 Aug 1748". */
export function whenLabel(date: unknown, start?: unknown, end?: unknown): string | null {
  const s = toDate(start);
  const e = toDate(end);
  if (s && e && s.getTime() !== e.getTime()) {
    return s.getUTCFullYear() === e.getUTCFullYear()
      ? `${day(s)} – ${full(e)}`
      : `${full(s)} – ${full(e)}`;
  }
  const one = toDate(date) ?? s ?? e;
  return one ? full(one) : null;
}

/** "1790–1797", a single year, or an open end ("1790–" / "–1797"); null when neither. */
export function yearsLabel(start: unknown, end: unknown): string | null {
  const s = toDate(start)?.getUTCFullYear();
  const e = toDate(end)?.getUTCFullYear();
  if (s == null && e == null) return null;
  if (s != null && e != null) return s === e ? String(s) : `${s}–${e}`;
  return s != null ? `${s}–` : `–${e}`;
}

/** The year alone, for compact stamps; null when the date is missing. */
export function yearOf(date: unknown): string | null {
  const d = toDate(date);
  return d ? String(d.getUTCFullYear()) : null;
}

/** "51.51° N, 0.13° W" from a raw "lat,lng" string; null when unparseable. */
export function geoLabel(raw: unknown): string | null {
  const p = parseLatLng(raw);
  if (!p) return null;
  const f = (n: number, pos: string, neg: string): string =>
    `${Math.abs(n).toFixed(2)}° ${n >= 0 ? pos : neg}`;
  return `${f(p.lat, 'N', 'S')}, ${f(p.lng, 'E', 'W')}`;
}

export interface CoreData {
  title: string | null;
  /** Date label for the record's own date, span, or null. */
  when: string | null;
  date: unknown;
  start: unknown;
  end: unknown;
  from: string | null;
  to: string | null;
  fromPerson: string | null;
  toPerson: string | null;
  text: string | null;
  note: string | null;
  description: string | null;
}

/** The semantic columns every Franklin renderer reads, all tolerant of absence. */
export function coreData(fields: Fields): CoreData {
  const date = byWriteTo(fields, 'date')?.raw;
  const start = byWriteTo(fields, 'start')?.raw;
  const end = byWriteTo(fields, 'end')?.raw;
  return {
    title: textOf(fields, 'title'),
    when: whenLabel(date, start, end),
    date,
    start,
    end,
    from: textOf(fields, 'from'),
    to: textOf(fields, 'to'),
    fromPerson: personOf(fields, 'creatorId'),
    toPerson: personOf(fields, 'assigneeId'),
    text: textOf(fields, 'text'),
    note: textOf(fields, 'note'),
    description: textOf(fields, 'description'),
  };
}
