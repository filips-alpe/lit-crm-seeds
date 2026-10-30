/**
 * FO stores person names as "Lastname, Firstname[, Sr./Jr.]" — this formats
 * them as "Firstname Lastname[, Sr./Jr.]" and joins multiple names
 * with "; " (committee letters, joint signatories) for the
 * record's `from`/`to` text columns.
 */

/** "Franklin, Benjamin" -> "Benjamin Franklin"; "Franklin, James, Jr." -> "James Franklin, Jr." */
export function formatName(raw: string): string {
  const parts = raw.split(',').map((p) => p.trim());
  if (parts.length < 2) return raw.trim(); // no comma: unstructured string, pass through verbatim
  const [last, first, ...suffix] = parts;
  const base = `${first} ${last}`;
  return suffix.length ? `${base}, ${suffix.join(', ')}` : base;
}

/** Joins formatted names for a from/to column with "; ": "A", "A; B; C". */
export function joinNames(raw: string[]): string {
  return raw.map(formatName).join('; ');
}
