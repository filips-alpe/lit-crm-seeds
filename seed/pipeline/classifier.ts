/**
 * Deterministic document classifier: a Founders Online document (title plus
 * author/recipient metadata) -> seed Type code.
 *
 * Ordered rules; the first that fires wins:
 *  1. editorial     title is an "Editorial Note/Introduction"        -> SKIP
 *  2. diary         no recipient AND a bare date heading (or an Adams Papers
 *                   date-led title)                                   -> diary
 *  3. genre@start   title opens with a genre noun ("Petition to ...") -> genre type
 *  4. genre@colon   "Actor: Genre ..." takes the genre after the colon -> genre type
 *  5. letter shape  "X to Y", "From X to Y", "To X from Y"            -> letter
 *                   (any institutional participant is a dispatch, merged into letter)
 *  6. genre@anywhere genre keyword anywhere in the title              -> genre type
 *  7. authored piece with no recipient                                -> essay
 *  8. fallthrough                                                     -> document
 *
 * Genre families: instrument (treaty, contract, certificate, commission, deed,
 * act ...), petition, account, proceedings (minutes, report, resolution,
 * message, speech ...), note (memorandum, extracts, remarks, plans ...), essay
 * (almanacs, series, verse, hoaxes ...). Each rule family is exercised in
 * classifier.test.ts.
 */

export const SKIP = Symbol('skip');

export type ClassifiableDoc = {
  title: string;
  project?: string;
  authors: string[];
  recipients: string[];
};

export type Classification = { type: string | typeof SKIP; kind: string; rule: string };

const MONTH =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|Ap|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:r|ember)?|Dec(?:r|ember)?)';
const DAY =
  '(?:Mon(?:day)?|Tues?(?:day)?|Wed(?:nesday)?|Thu(?:rs(?:day)?)?|Fri(?:day)?|Fryday|Sat(?:urday)?|Sun(?:day)?|Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche|Munday|Tuesday)';
// A title that is nothing but date / weekday / month tokens (a journal heading).
const DATE_ONLY = new RegExp(
  `^[\\[\\(]?\\s*(?:(?:${MONTH}|${DAY}|\\d{1,2}(?:st|nd|rd|th|d)?|\\d{4}|Novr|Decr|Septr|Octr|[IVX]+)[\\s.,:;\\-–]*)+\\]?\\.?$`,
  'i',
);
const DIARY_HEAD = new RegExp(`^[\\[\\(]?\\s*(?:\\d|${MONTH}\\b|${DAY}\\b)`, 'i');

type Kind = 'deed' | 'petition' | 'account' | 'minutes' | 'note' | 'journal' | 'print' | 'essay';

// [kind, regex tested at the START of the genre text]
const GENRES: [Kind, RegExp][] = [
  [
    'deed',
    /^(Last )?Will\b|^(Articles of )?Agreement\b|^Contract\b|^(Draft )?(Consular )?Convention\b|^(Preliminary |Definitive |Draft |Proposed )?(Articles|Treaty|Treaties)\b|^(An? )?Act\b|^Treaty\b|^Deed\b|^Indenture\b|^Power of Attorney\b|^Charter\b|^Lease\b|^Bond\b|^Mortgage\b|^Commission\b|^Appointment\b|^Warrant\b|^Passport\b|^Pass\b|^Certificate\b|^Certification\b|^(Export )?License\b|^Ordinance\b|^Proclamation\b|^Instructions\b|^Declaration\b|^Oath\b|^Patent\b|^Articles\b|^Marriage\b|^Record of\b|\b(Act|Certificate|Passport|Testimonial|Toasts?|Inscription)\s*(,|$)/i,
  ],
  [
    'petition',
    /^(A )?(Petition|Memorial|Remonstrance|Request for|Proposal|Proposals|Application|Appeal|Address(?:es)? (to|of)|Memoir)\b/i,
  ],
  [
    'account',
    /^(Subscriptions?|Account|Accounts|Statement|Bill|Receipted? Bill|Receipt|Invoice|Inventory|List|Table|Schedule|Estimate|Ledger|Cashbook|Index|Catalogue|Return)\b|^(Outgoing|Incoming)\b/i,
  ],
  [
    'minutes',
    /^(Minutes|Proceedings|Report|Reports|Resolutions?|Resolve|Votes|Message|Messages|Reply|Answer|Order|Orders|Examination|Committee|Journal|Debates|Speech|Testimony|Hearing|Memorandum of a conversation)\b/i,
  ],
  [
    'note',
    /^(Memorandum|Memoranda|Notes?|Remarks?|Observations?|Marginalia|Extracts?|Query|Queries|Reflections?|Hints|Rules|Maxims|Sketch|Plan|Scheme|Draft|Abstract|Summary|Translation|Précis|Resume|Memo)\b/i,
  ],
  ['journal', /^(Diary|Journal|Franklin’s Journal)\b/i],
  [
    'print',
    /^(Poor Richard|Silence Dogood|The Busy-Body|Busy-Body|Plain Truth|Advertisement|Notice|Essay|Dialogue|Verses|Poem|Epitaph|Hoax|Parable|Fable|Satire|Bagatelle|Almanack?|Pennsylvania Gazette|Dissertation|On|Of|The Printer to|A Letter|An Account|An Edict|An Address|Apology|Letter from|Letters from)\b/i,
  ],
];

// Unanchored keyword fallbacks, tried only after letter shape.
const ANYWHERE: [Kind, RegExp][] = [
  [
    'deed',
    /\b(Degree|Admission|Credentials|Freedom of|Discharge|Appointing|Reappointment|Treaty|Convention|Contract|Agreement|Certificate|Commission|Passport|Charter|Deed|Will|Act)\b/,
  ],
  ['account', /\b(Account|Accounts|Inventory|Invoice|Receipt|Bill|Subscription|List)\b/],
  ['minutes', /\b(Minutes|Report|Resolutions?|Debates|Proceedings|Examination|Audience)\b/],
  [
    'essay',
    /\b(Reply|Replies|Defen[cs]e|Hoax|Epitaph|Arguments?|Humourous|Letters? of Introduction)\b/,
  ],
  [
    'note',
    /\b(Memorand\w+|Notes|Excerpts?|Extracts?|Remarks|Observations|Comments|Instructions)\b/,
  ],
];

const LETTER =
  /^(?:\[?From\]?|\[?To\]?)\s|^.{2,100}?\s\[?(?:to|from)\s|^Exchanges? with\b|^.{2,60}: Confidential to\b/;
const INSTITUTIONAL =
  /Committee|Commissioners|Congress|Assembly|Council|Ministry|Minister|Board|Society|Company|Governor|Parliament|Treasury|Admiralty|Secretary|Navy|Government|Legislature|Convention|College|Academy|Chamber|Lords|Commons|King|Court|Department|Office|Treaty|Bureau|Directors|President|Cabinet|Staff/i;

const KIND_TO_TYPE: Record<string, string> = {
  letter: 'letter',
  diary: 'diary',
  journal: 'diary',
  note: 'note',
  deed: 'instrument',
  minutes: 'proceedings',
  account: 'account',
  petition: 'petition',
  print: 'essay',
  writing: 'essay',
  essay: 'essay',
  other: 'document',
};

function genreOf(text: string): Kind | undefined {
  return GENRES.find(([, re]) => re.test(text))?.[0];
}

/** Strips HTML-escaped ampersands and leading "Enclosure"/roman-numeral prefixes. */
export function normalizeTitle(title: string): string {
  return title
    .replace(/&amp;/g, '&')
    .replace(/^\s*(?:Enclosure\s*[IVX\d]*\s*:\s*|\[Enclosure\]\s*:?\s*|(?:[IVX]+|\d+)\.\s+)/i, '')
    .trim();
}

export function classifyDoc(doc: ClassifiableDoc): Classification {
  const T = normalizeTitle(doc.title);
  const noRecipient = doc.recipients.length === 0;
  const result = (kind: string, rule: string): Classification => ({
    type: KIND_TO_TYPE[kind],
    kind,
    rule,
  });

  if (/Editorial (Note|Introduction)\b/i.test(T))
    return { type: SKIP, kind: 'editorial', rule: 'editorial' };

  if (
    noRecipient &&
    (DATE_ONLY.test(T) ||
      (doc.project === 'Adams Papers' && DIARY_HEAD.test(T) && !/\bto\b/.test(T) && T.length < 60))
  ) {
    return result('diary', 'date-heading title, no recipient');
  }

  const genreAtStart = genreOf(T.replace(/^\[+\s*/, ''));
  if (genreAtStart && !/^(?:From|To)\s/.test(T)) return result(genreAtStart, 'genre@start');

  const colon = T.indexOf(': ');
  const letterShape = LETTER.test(T) && !(colon > -1 && colon < T.search(/\s(?:to|from)\s/));
  if (colon > -1 && colon < 90) {
    const g = genreOf(T.slice(colon + 2).replace(/^\[[^\]]*\]:?\s*/, ''));
    if (g) return result(g, 'genre@after-colon');
  }

  if (letterShape) {
    // Letters between institutions are "dispatches" in the analysis; the type
    // set merges them into `letter`, the rule id keeps the distinction.
    const participants = [...doc.authors, ...doc.recipients].join(' ; ');
    const official =
      INSTITUTIONAL.test(participants) ||
      /^(?:The\s)?(?:American|Commissioners|Committee|Continental)/.test(T);
    return result('letter', official ? 'letter-shape+institution' : 'letter-shape');
  }

  for (const [kind, re] of ANYWHERE) if (re.test(T)) return result(kind, 'genre@anywhere');

  if (doc.authors.length >= 1 && noRecipient)
    return result('essay', 'authored piece, no recipient');
  return result('other', 'fallthrough');
}

/** Seed Type code for a document, or SKIP for non-document front-matter. */
export function classifyTitle(doc: ClassifiableDoc): string | typeof SKIP {
  return classifyDoc(doc).type;
}
