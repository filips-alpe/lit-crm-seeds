import type { TypeCount } from '$lib/dashboards/types';

/** Total records over every type. */
export const totalOf = (counts: TypeCount[]) => counts.reduce((n, c) => n + c.count, 0);

/** True when the user holds nothing at all (the common case for an illustrative role). */
export const isEmpty = (counts: TypeCount[]) => totalOf(counts) === 0;

/** Records of one type code. */
export const countOf = (counts: TypeCount[], code: string) =>
  counts.find((c) => c.code === code)?.count ?? 0;
