import type { GeneratedRecord } from './record-mapper';

/**
 * Shape produced by the parallel "text-fetcher" worker:
 * .workflow/scratch/texts/matched.json = [{permalink, text, source, matchMethod, confidence}]
 * `source` cites the public-domain edition the text came from (Wikisource/
 * Gutenberg), so its URL gets added to `references` alongside the FO
 * permalink — every quoted text is itself sourced.
 */
export type MatchedText = {
  permalink: string;
  text: string;
  source: { name: string; edition: string; url: string };
  matchMethod: string;
  confidence: number;
  // Facts parsed directly from the matched text (e.g. a civil record's
  // place of registry) — applied only when the mapped record doesn't
  // already carry a value, never overriding what record-mapper derived.
  place?: string;
  description?: string;
};

/**
 * Merges matched full text into generated records by FO permalink. Records
 * with no match are returned unchanged. Mutates nothing; returns new
 * record objects.
 */
export function mergeText(records: GeneratedRecord[], matches: MatchedText[]): GeneratedRecord[] {
  const byPermalink = new Map(matches.map((m) => [m.permalink, m]));
  return records.map((r) => {
    const match = byPermalink.get(r.permalink);
    if (!match) return r;
    return {
      ...r,
      text: match.text,
      to: r.to ?? match.place,
      description: r.description ?? match.description,
      references: r.references.includes(match.source.url)
        ? r.references
        : [...r.references, match.source.url],
    };
  });
}
