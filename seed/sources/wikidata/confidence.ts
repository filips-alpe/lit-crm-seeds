/**
 * Is a Wikidata match plausibly the same person as the Founders Online name?
 * Pure checks over data we already hold: the FO activity (document count and
 * the years they span) against the Wikidata lifespan and label. When in doubt
 * the person is dropped, so a namesake never gets records bound to it.
 */
import type { RosterPerson } from '../extract-fo';

export type PersonFacts = {
  foName: string;
  label: string;
  isDemo: boolean;
  isTop: boolean;
  born?: number;
  died?: number;
};

/** Below this many FO documents a match is too thinly evidenced (demo users and top correspondents exempt). */
export const MIN_DOCUMENTS = 4;
/** Documents needed to excuse a very young or weakly named match. */
const STRONG_PRESENCE = 10;
const ADULT_AGE = 14;
const MAX_AGE = 95;
const LATEST_BIRTH = 1770;

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The Wikidata label must carry the FO surname (accent, hyphen and case-insensitive). */
export function labelMatchesSurname(foName: string, label: string): boolean {
  const surname = plain(foName.split(',')[0]).split(' ').filter(Boolean);
  const words = new Set(plain(label).split(' '));
  return surname.length > 0 && surname.every((w) => words.has(w));
}

export function assessPerson(
  p: PersonFacts,
  activity: RosterPerson | undefined,
): { keep: boolean; reasons: string[] } {
  if (p.isDemo) return { keep: true, reasons: [] };
  const reasons: string[] = [];
  const count = activity?.count ?? 0;
  if (!activity) reasons.push('not-in-roster');
  if (!p.isTop && count < MIN_DOCUMENTS) reasons.push('thin-evidence');
  if (p.born === undefined) reasons.push('no-birth-date');
  else {
    if (p.born > LATEST_BIRTH && count < STRONG_PRESENCE) reasons.push('born-too-late');
    if (
      activity?.from !== undefined &&
      p.born > activity.from - ADULT_AGE &&
      count < STRONG_PRESENCE
    ) {
      reasons.push('too-young-for-documents');
    }
    if (p.died !== undefined && p.died - p.born > MAX_AGE) reasons.push('implausible-age');
  }
  if (p.died !== undefined && activity?.to !== undefined && p.died < activity.to - 1) {
    reasons.push('dead-before-documents');
  }
  if (!labelMatchesSurname(p.foName, p.label) && count < STRONG_PRESENCE) reasons.push('weak-name');
  return { keep: reasons.length === 0, reasons };
}
