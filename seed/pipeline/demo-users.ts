/**
 * The 17 seeded demo users (data/user.yaml) as they appear in Founders Online
 * ("Last, First" catalog names). Single source for both the circle selection
 * and the creator/assignee resolution of generated records.
 */
export const DEMO_USER_PATTERNS: { username: string; pattern: RegExp }[] = [
  { username: 'bfranklin', pattern: /^Franklin, Benjamin$/ },
  { username: 'dfranklin', pattern: /^Franklin, Deborah$/ },
  { username: 'mstevenson', pattern: /^Stevenson, Margaret/ },
  { username: 'phewson', pattern: /^Hewson, Mary/ },
  { username: 'wtfranklin', pattern: /^Franklin, William Temple/ },
  { username: 'wfranklin', pattern: /^Franklin, William$/ },
  { username: 'sbache', pattern: /^Bache, Sarah Franklin/ },
  { username: 'pcollinson', pattern: /^Collinson, Peter/ },
  { username: 'tcushing', pattern: /^Cushing, Thomas(?!,? ?(H|Sr))/ },
  { username: 'ahelvetius', pattern: /Helv[ée]tius, Anne/ },
  { username: 'jadams', pattern: /^Adams, John$/ },
  { username: 'tjefferson', pattern: /^Jefferson, Thomas$/ },
  { username: 'lafayette', pattern: /^Lafayette, Marie-Joseph/ },
  { username: 'gsharp', pattern: /^Sharp, Granville/ },
  { username: 'estiles', pattern: /^Stiles, Ezra/ },
  { username: 'jcaillot', pattern: /Caillot, Joseph/ },
  { username: 'montgolfier', pattern: /^Montgolfier, / },
];

/** Username of the demo user an FO catalog name refers to, if any. */
export function demoUsernameFor(foName: string): string | undefined {
  return DEMO_USER_PATTERNS.find((u) => u.pattern.test(foName))?.username;
}
