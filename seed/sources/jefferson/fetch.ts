/**
 * Downloads the Internet Archive OCR of "The Writings of Thomas Jefferson"
 * (Definitive Edition, ed. Lipscomb & Bergh, 1905, vols I-II in one scan,
 * public domain) into a local, uncommitted cache. Only this step touches the
 * network; build.ts reads the cache.
 *
 * Run with: `bun seed/sources/jefferson/fetch.ts [cacheDir]`
 * Writes:   .workflow/scratch/jefferson/{raw.txt,page_numbers.json} (skipped if present)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CACHE_DIR = '.workflow/scratch/jefferson';
export const IA_ITEM = 'writingsofthomas0000vari_v5r4';
export const IA_DETAILS_URL = `https://archive.org/details/${IA_ITEM}`;

const USER_AGENT =
  'lit-crm-seed/1.0 (one-off download of public-domain text for a research seed dataset)';

/** The two files the build needs: the plain OCR and IA's leaf → printed page map. */
export const CACHE_FILES = {
  raw: { name: 'raw.txt', url: `https://archive.org/download/${IA_ITEM}/${IA_ITEM}_djvu.txt` },
  pageNumbers: {
    name: 'page_numbers.json',
    url: `https://archive.org/download/${IA_ITEM}/${IA_ITEM}_page_numbers.json`,
  },
} as const;

export function cachePath(cacheDir: string, file: keyof typeof CACHE_FILES): string {
  return resolve(cacheDir, CACHE_FILES[file].name);
}

async function fetchWithRetry(url: string, attempts = 4): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) return response.text();
    if (response.status < 500 || attempt === attempts) {
      throw new Error(`${url}: HTTP ${response.status} after ${attempt} attempt(s)`);
    }
    await new Promise((r) => setTimeout(r, 3000 * 2 ** attempt));
  }
}

async function main() {
  const cacheDir = process.argv[2] ?? DEFAULT_CACHE_DIR;
  mkdirSync(cacheDir, { recursive: true });
  for (const key of Object.keys(CACHE_FILES) as (keyof typeof CACHE_FILES)[]) {
    const path = cachePath(cacheDir, key);
    if (existsSync(path)) {
      console.log(`${CACHE_FILES[key].name}: cached`);
      continue;
    }
    const text = await fetchWithRetry(CACHE_FILES[key].url);
    writeFileSync(path, text);
    console.log(`${CACHE_FILES[key].name}: ${text.length} chars`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) await main();
