/**
 * Matches split Smyth documents to Founders Online records. Pure and
 * deterministic. Every rule prefers leaving a document unmatched: a record
 * without text is honest, a record with another document's text is wrong.
 */
import type { MatchedText } from '../../pipeline/text-merge';
import type { FranklinDoc } from '../extract-fo';
import { volumeDetailsUrl } from './fetch';
import { editDistance, type SmythDocument } from './split';

export type UnmatchedReason =
  | 'split-flagged'
  | 'text-too-short'
  | 'no-exact-date'
  | 'no-record-on-date'
  | 'no-name-or-title-match'
  | 'ambiguous'
  | 'contested-record';

export type SmythOutcome = {
  volume: number;
  number: number;
  title: string;
  date?: string;
  status: 'matched' | 'unmatched';
  reason?: UnmatchedReason;
  permalink?: string;
  matchMethod?: string;
};

const FRANKLIN = 'Franklin, Benjamin';
const MIN_TEXT_LENGTH = 40;
/** Below this length one wrong letter can be a different person (Jay/Ray). */
const MIN_FUZZY_SURNAME_LENGTH = 6;
/** A compound surname's first word only identifies someone if it is not a common short word. */
const MIN_COMPOUND_SURNAME_WORD_LENGTH = 5;
const TITLE_OVERLAP_SAME_DAY = 0.6;
const TITLE_OVERLAP_SAME_PERIOD = 0.8;

const CONFIDENCE = {
  recipient: 0.95,
  recipientOcrTolerant: 0.85,
  titleSameDay: 0.8,
  titleSamePeriod: 0.75,
};

/** Words that say nothing about who someone is, dropped from both sides of a name comparison. */
const NAME_NOISE = new Set(
  'mr mrs miss ms dr rev reverend sir lord lady hon honorable honourable m mme mlle monsieur madame abbe comte comtesse marquis marquise duc duchesse baron chevalier count countess de du la le les d the esq captain capt col colonel gen general gov governor president'.split(
    ' ',
  ),
);

const TITLE_NOISE = new Set(
  'a an and at by for from in into of on or the to with concerning benjamin franklin'.split(' '),
);

function words(s: string): string[] {
  return (
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .match(/[a-z]+/g) ?? []
  );
}

const nameWords = (s: string) => words(s).filter((w) => !NAME_NOISE.has(w));
const titleWords = (s: string) => new Set(words(s).filter((w) => !TITLE_NOISE.has(w)));

function overlap(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  return [...a].filter((w) => b.has(w)).length / union.size;
}

type NameFit = 'exact' | 'ocr-tolerant' | 'none';

function surnameFit(partyWords: string[], surname: string[]): NameFit {
  if (surname.length === 0) return 'none';
  const run = surname.join(' ');
  if (` ${partyWords.join(' ')} `.includes(` ${run} `)) return 'exact';
  if (
    surname.length > 1 &&
    surname[0].length >= MIN_COMPOUND_SURNAME_WORD_LENGTH &&
    partyWords.includes(surname[0])
  ) {
    return 'exact'; // "Madame Brillon" for "Brillon de Jouy, ..."
  }
  if (surname.length === 1 && surname[0].length >= MIN_FUZZY_SURNAME_LENGTH) {
    if (partyWords.some((w) => editDistance(w, surname[0]) === 1)) return 'ocr-tolerant';
  }
  return 'none';
}

/** Whether a given name in the addressee contradicts the record's ("John" vs "William"). */
function givenNameConflicts(partyGiven: string | undefined, recordGiven: string | undefined) {
  if (!partyGiven || !recordGiven) return false;
  if (partyGiven.length === 1 || recordGiven.length === 1) return partyGiven[0] !== recordGiven[0];
  return editDistance(partyGiven, recordGiven) > 1;
}

/** "Miss Mary Stevenson" for the record "Hewson, Mary (Polly) Stevenson": both names must agree. */
function isMaidenName(partyWords: string[], recordGiven: string[]): boolean {
  if (partyWords.length < 2 || recordGiven.length < 2) return false;
  return (
    partyWords[0] === recordGiven[0] &&
    partyWords[partyWords.length - 1] === recordGiven[recordGiven.length - 1]
  );
}

/** How well an addressee fits one record name ("Strahan, William"). */
function fitPersonName(party: string, recordName: string): NameFit {
  const [surnamePart, givenPart = ''] = recordName.split(',');
  const partyWords = nameWords(party);
  const surname = nameWords(surnamePart);
  if (isMaidenName(partyWords, nameWords(givenPart))) return 'exact';
  const fit = surnameFit(partyWords, surname);
  if (fit === 'none') return 'none';

  const surnameWords = new Set(surname);
  const partyGivenNames = partyWords.filter(
    (w) => !surnameWords.has(w) && (fit === 'exact' || editDistance(w, surname[0]) > 1),
  );
  const recordGiven = nameWords(givenPart)[0];
  // With several addressees, any one of the given names may be this person's.
  const conflicts =
    partyGivenNames.length > 0 &&
    partyGivenNames.every((given) => givenNameConflicts(given, recordGiven));
  return conflicts ? 'none' : fit;
}

function bestFit(party: string, recordNames: string[]): NameFit {
  const fits = recordNames.map((name) => fitPersonName(party, name));
  if (fits.includes('exact')) return 'exact';
  return fits.includes('ocr-tolerant') ? 'ocr-tolerant' : 'none';
}

type Letter = { party: string; direction: 'from-franklin' | 'to-franklin' };

function parseLetter(title: string): Letter | undefined {
  const toFranklin = /^From (.+?) to (?:Dr\. )?(?:Benjamin |B\. )?Franklin\b/i.exec(title);
  if (toFranklin) return { party: toFranklin[1], direction: 'to-franklin' };
  const fromFranklin = /^To\s+(.+)$/i.exec(title);
  if (fromFranklin) return { party: fromFranklin[1], direction: 'from-franklin' };
  return undefined;
}

type Found = { record: FranklinDoc; method: string; confidence: number };
type Candidate = { found: Found[] } | { reason: UnmatchedReason };

function matchLetter(letter: Letter, recordsOnDay: FranklinDoc[]): Candidate {
  if (nameWords(letter.party).length === 0) return { reason: 'no-name-or-title-match' };

  const exact: Found[] = [];
  const tolerant: Found[] = [];
  for (const record of recordsOnDay) {
    const franklinWrote = record.authors.includes(FRANKLIN);
    const franklinReceived = record.recipients.includes(FRANKLIN);
    const correct = letter.direction === 'from-franklin' ? franklinWrote : franklinReceived;
    if (!correct) continue;
    const names = letter.direction === 'from-franklin' ? record.recipients : record.authors;
    const fit = bestFit(letter.party, names);
    if (fit === 'exact') {
      exact.push({ record, method: 'exact-date+recipient', confidence: CONFIDENCE.recipient });
    } else if (fit === 'ocr-tolerant') {
      tolerant.push({
        record,
        method: 'exact-date+recipient-ocr-tolerant',
        confidence: CONFIDENCE.recipientOcrTolerant,
      });
    }
  }
  return { found: exact.length > 0 ? exact : tolerant };
}

function matchByTitle(
  doc: SmythDocument,
  records: FranklinDoc[],
  threshold: number,
  method: string,
  confidence: number,
): Found[] {
  const wanted = titleWords(doc.title);
  return records
    .filter(
      (r) => overlap(wanted, titleWords(r.title.replace(/,[^,]*\d{4}\]?\s*$/, ''))) >= threshold,
    )
    .map((record) => ({ record, method, confidence }));
}

function findCandidates(
  doc: SmythDocument,
  byDay: Map<string, FranklinDoc[]>,
  sorted: FranklinDoc[],
): Candidate {
  const date = doc.date;
  const letter = parseLetter(doc.title);
  if (!date || (letter && date.precision !== 'day')) return { reason: 'no-exact-date' };

  if (date.precision !== 'day') {
    const inPeriod = sorted.filter((r) => r['date-from']?.startsWith(date.iso));
    return {
      found: matchByTitle(
        doc,
        inPeriod,
        TITLE_OVERLAP_SAME_PERIOD,
        'same-period+title',
        CONFIDENCE.titleSamePeriod,
      ),
    };
  }

  const recordsOnDay = byDay.get(date.iso) ?? [];
  if (recordsOnDay.length === 0) return { reason: 'no-record-on-date' };
  if (letter) return matchLetter(letter, recordsOnDay);
  return {
    found: matchByTitle(
      doc,
      recordsOnDay,
      TITLE_OVERLAP_SAME_DAY,
      'exact-date+title',
      CONFIDENCE.titleSameDay,
    ),
  };
}

function citation(doc: SmythDocument): string {
  const page = doc.page === undefined ? '' : `, p. ${doc.page}`;
  return `Smyth, The Writings of Benjamin Franklin (1905-07), vol. ${doc.volume}, no. ${doc.number}${page} (uncorrected OCR)`;
}

/** Matches documents to records. Output order follows `docs`, whatever the order of `records`. */
export function matchDocuments(
  docs: SmythDocument[],
  records: FranklinDoc[],
): { matches: MatchedText[]; outcomes: SmythOutcome[] } {
  const sorted = [...records].sort((a, b) => a.permalink.localeCompare(b.permalink));
  const byDay = new Map<string, FranklinDoc[]>();
  for (const record of sorted) {
    const day = record['date-from'];
    if (!day) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), record]);
  }

  const first = docs.map((doc): { found?: Found; reason?: UnmatchedReason } => {
    if (doc.flags.length > 0) return { reason: 'split-flagged' };
    if (doc.text.length < MIN_TEXT_LENGTH) return { reason: 'text-too-short' };
    const candidate = findCandidates(doc, byDay, sorted);
    if ('reason' in candidate) return { reason: candidate.reason };
    if (candidate.found.length === 0) return { reason: 'no-name-or-title-match' };
    if (candidate.found.length > 1) return { reason: 'ambiguous' };
    return { found: candidate.found[0] };
  });

  const claims = new Map<string, number>();
  for (const { found } of first) {
    if (found) claims.set(found.record.permalink, (claims.get(found.record.permalink) ?? 0) + 1);
  }

  const matches: MatchedText[] = [];
  const outcomes = docs.map((doc, index): SmythOutcome => {
    const base = { volume: doc.volume, number: doc.number, title: doc.title, date: doc.date?.iso };
    const { found, reason } = first[index];
    if (!found) return { ...base, status: 'unmatched', reason };
    const { permalink } = found.record;
    if ((claims.get(permalink) ?? 0) > 1) {
      return { ...base, status: 'unmatched', reason: 'contested-record', permalink };
    }
    matches.push({
      permalink,
      text: doc.text,
      source: {
        name: 'Internet Archive',
        edition: citation(doc),
        url: volumeDetailsUrl(doc.volume),
      },
      matchMethod: found.method,
      confidence: found.confidence,
    });
    return { ...base, status: 'matched', permalink, matchMethod: found.method };
  });
  return { matches, outcomes };
}
