/**
 * Entity resolution and mention linking.
 *
 * Entities come from the curated gazetteer (gazetteer.yaml): each has a
 * canonical name and the variant names the text uses for it. Resolution is
 * by exact, case-sensitive match on whole words, longest variant first, so
 * "George Washington" wins over "Washington".
 *
 * A variant claimed by two entities ("Washington": the man and the city) is
 * ambiguous and is not linked. So are the gazetteer's `unlinked` names — bare
 * surnames and titles the text uses for more than one person ("Mr. Randolph",
 * "the President"); listing them stops a shorter variant inside them from
 * matching and lets the report count them. Nothing is guessed from context.
 */

export type EntityType = 'person' | 'place' | 'organization' | 'work';

export type GazetteerEntity = {
  key: string;
  type: EntityType;
  name: string;
  description?: string;
  /** Variant names as printed, including OCR-stable misspellings. The name is always a variant. */
  aliases?: string[];
};

export type Gazetteer = {
  entities: GazetteerEntity[];
  /** Names that refer to more than one entity and are left unlinked. */
  unlinked?: string[];
};

export type Mention = {
  start: number;
  end: number;
  surface: string;
  /** Entity key, or null when the surface is ambiguous. */
  entity: string | null;
};

export type AliasIndex = {
  pattern: RegExp | null;
  /** Variant → entity keys (more than one = ambiguous; empty = listed as unlinked). */
  byAlias: Map<string, string[]>;
};

/** Both apostrophe forms occur in the OCR; every variant matches either. */
function apostropheForms(alias: string): string[] {
  if (!/['’]/.test(alias)) return [alias];
  return [alias.replace(/’/g, "'"), alias.replace(/'/g, '’')];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');

export function buildAliasIndex(gazetteer: Gazetteer): AliasIndex {
  const byAlias = new Map<string, string[]>();
  const add = (alias: string, key: string | null) => {
    for (const form of apostropheForms(alias.trim())) {
      const keys = byAlias.get(form) ?? [];
      if (key && !keys.includes(key)) keys.push(key);
      byAlias.set(form, keys);
    }
  };
  const seen = new Set<string>();
  for (const e of gazetteer.entities) {
    if (seen.has(e.key)) throw new Error(`duplicate entity key: ${e.key}`);
    seen.add(e.key);
    for (const alias of new Set([e.name, ...(e.aliases ?? [])])) add(alias, e.key);
  }
  // An explicitly unlinked name stays unlinked even if an entity also claims it.
  for (const name of gazetteer.unlinked ?? []) {
    for (const form of apostropheForms(name.trim())) byAlias.set(form, []);
  }
  const aliases = [...byAlias.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
  const pattern = aliases.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${aliases.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'gu')
    : null;
  return { pattern, byAlias };
}

/** Collapses the whitespace in a matched surface so it can be looked up. */
const lookupForm = (surface: string) => surface.replace(/\s+/g, ' ');

export function findMentions(text: string, index: AliasIndex): Mention[] {
  if (!index.pattern) return [];
  const out: Mention[] = [];
  for (const m of text.matchAll(index.pattern)) {
    const keys = index.byAlias.get(lookupForm(m[0])) ?? [];
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      surface: m[0],
      entity: keys.length === 1 ? keys[0] : null,
    });
  }
  return out;
}

const HONORIFIC =
  /(?<![\p{L}])(?:Mr|Mrs|Dr|Gen|General|Col|Colonel|Governor|Gov|Judge|Captain|Capt|Major|Count|Marquis|Lord|Sir|Baron|Chevalier|Bishop|President|Secretary)\.?\s+(?:[A-Z][\p{L}’'-]+)(?:\s+(?:de|of|la|von|[A-Z][\p{L}’'-]+))*/gu;
const NAME_RUN = /(?<=[a-z,;]\s)(?:[A-Z][a-z]+(?:\s+(?:de|of)\s+|\s+)){1,3}[A-Z][a-z]+/g;

/**
 * Likely names the gazetteer does not cover: an honorific and a capitalised
 * name, or a run of two to four capitalised words in mid-sentence. They feed
 * the report's "left unlinked" table only; nothing here is linked.
 */
export function unlinkedCandidates(text: string, mentions: Mention[]): string[] {
  const covered = (s: number, e: number) => mentions.some((m) => m.start < e && s < m.end);
  const out: string[] = [];
  for (const re of [HONORIFIC, NAME_RUN]) {
    for (const m of text.matchAll(re)) {
      if (!covered(m.index, m.index + m[0].length)) out.push(m[0].replace(/\s+/g, ' '));
    }
  }
  return out;
}
