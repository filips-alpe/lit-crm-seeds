/**
 * Project assignment: every record gets exactly one *period* project (by NS
 * date, Franklin's life broken into the residences/roles from the ledger)
 * plus zero or more *thematic* projects (by title/correspondent keyword).
 *
 * Period boundaries are NOT asserted here as prose — generate.ts cites the
 * earliest-dated record actually falling in each period (by permalink) when
 * it writes projects.yaml, so every boundary is backed by a real FO document
 * rather than invented narrative.
 */

export type PeriodProject = {
  code: string;
  label: string;
  /** Inclusive NS start date, ISO yyyy-mm-dd. Undefined = open start. */
  startNs?: string;
  /** Exclusive NS end date, ISO yyyy-mm-dd. Undefined = open end. */
  endNs?: string;
  color: string;
};

// Ordered chronologically; the first range whose [startNs, endNs) contains
// the record's NS date wins. Ranges are contiguous and exhaustive so every
// NS date (1706 onward) matches exactly one.
export const PERIOD_PROJECTS: PeriodProject[] = [
  {
    code: 'periode-boston-1706-1723',
    label: 'Boston, 1706–1723',
    endNs: '1723-10-01',
    color: '#3f5e6b',
  },
  {
    code: 'periode-londres-1724-1726',
    label: 'First London sojourn, 1724–1726',
    startNs: '1724-11-01',
    endNs: '1726-10-01',
    color: '#5c4b8a',
  },
  {
    code: 'periode-philadelphie-1723-1757',
    label: 'Philadelphia, 1723–1757',
    startNs: '1723-10-01',
    endNs: '1757-04-01',
    color: '#7a5c3e',
  },
  {
    code: 'periode-londres-agence-1757-1762',
    label: 'London, colonial agent, 1757–1762',
    startNs: '1757-04-01',
    endNs: '1762-11-01',
    color: '#4b6584',
  },
  {
    code: 'periode-philadelphie-1762-1764',
    label: 'Philadelphia, 1762–1764',
    startNs: '1762-11-01',
    endNs: '1764-11-01',
    color: '#8a6d3e',
  },
  {
    code: 'periode-londres-1764-1775',
    label: 'London, agent for several colonies, 1764–1775',
    startNs: '1764-11-01',
    endNs: '1775-03-21',
    color: '#2f4f6f',
  },
  {
    code: 'periode-congres-1775-1776',
    label: 'Second Continental Congress, 1775–1776',
    startNs: '1775-03-21',
    endNs: '1776-10-27',
    color: '#6b2c2c',
  },
  {
    code: 'periode-france-1776-1785',
    label: 'Mission to France, 1776–1785',
    startNs: '1776-10-27',
    endNs: '1785-07-01',
    color: '#5c2c2c',
  },
  {
    code: 'periode-philadelphie-1785-1790',
    label: 'Philadelphia, return and final years, 1785–1790',
    startNs: '1785-07-01',
    color: '#2e7d32',
  },
];

export function assignPeriod(nsDateIso: string): string {
  for (const p of PERIOD_PROJECTS) {
    if (p.startNs && nsDateIso < p.startNs) continue;
    if (p.endNs && nsDateIso >= p.endNs) continue;
    return p.code;
  }
  // Exhaustive by construction (first entry has no startNs, last has no
  // endNs), but keep a safe fallback rather than throwing mid-pipeline.
  return PERIOD_PROJECTS[PERIOD_PROJECTS.length - 1].code;
}

export type ThematicRule = {
  code: string;
  label: string;
  color: string;
  keywords: RegExp;
};

// Keyword lists favor precision over recall per the brief: literal, specific
// terms rather than broad topic guesses.
export const THEMATIC_RULES: ThematicRule[] = [
  {
    code: 'theme-electricite',
    label: 'Electrical experiments',
    color: '#d4af37',
    keywords: /\b(electric|electricity|lightning|armonica|leyden)\b/i,
  },
  {
    code: 'theme-imprimerie',
    label: 'Printing, the Gazette & Poor Richard',
    color: '#1f3a5f',
    keywords: /\b(Gazette|Poor Richard|printing|printer|almanack?)\b/i,
  },
  {
    code: 'theme-library-company',
    label: 'Library Company of Philadelphia',
    color: '#00838f',
    keywords: /\bLibrary Company\b/i,
  },
  {
    code: 'theme-aps',
    label: 'American Philosophical Society',
    color: '#6a4f8a',
    keywords: /\bAmerican Philosophical Society\b/i,
  },
  {
    code: 'theme-academy',
    label: 'Academy of Philadelphia',
    color: '#8a6d3e',
    keywords: /\bAcademy of Philadelphia\b/i,
  },
  {
    code: 'theme-pennsylvania-hospital',
    label: 'Pennsylvania Hospital',
    color: '#b8860b',
    keywords: /\bPennsylvania Hospital\b/i,
  },
  {
    code: 'theme-post-office',
    label: 'Post Office',
    color: '#455a64',
    keywords: /\bPost[- ]Office\b|\bpostmaster\b/i,
  },
  {
    code: 'theme-albany-plan',
    label: 'Albany Plan of Union',
    color: '#4a4f7a',
    keywords: /\bAlbany (Plan|Congress)\b/i,
  },
  { code: 'theme-stamp-act', label: 'Stamp Act', color: '#8b4513', keywords: /\bStamp Act\b/i },
  {
    code: 'theme-hutchinson-letters',
    label: 'Hutchinson letters affair',
    color: '#5c2c2c',
    keywords: /\bHutchinson\b.*\bletters\b|\bletters\b.*\bHutchinson\b/i,
  },
  {
    code: 'theme-alliance-france',
    label: 'French alliance & loans',
    color: '#2f4f8a',
    keywords: /\b(Treaty of Alliance|French (court|treasury|loan)|Vergennes)\b/i,
  },
  {
    code: 'theme-paix-1783',
    label: 'Peace of Paris, 1782–1783',
    color: '#3a5a40',
    keywords: /\b(Peace of Paris|preliminary articles of peace|definitive treaty)\b/i,
  },
  {
    code: 'theme-abolition',
    label: 'Abolition of slavery',
    color: '#b8860b',
    keywords: /\b(abolition|Pennsylvania (Society|Abolition))\b/i,
  },
  {
    code: 'theme-presse-passy',
    label: 'Private press at Passy',
    color: '#5e503f',
    keywords: /\bPassy\b.*\bpress\b|\bpress\b.*\bPassy\b/i,
  },
];

export function assignThematic(title: string, from = '', to = ''): string[] {
  const haystack = `${title} ${from} ${to}`;
  return THEMATIC_RULES.filter((r) => r.keywords.test(haystack)).map((r) => r.code);
}
