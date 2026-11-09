/**
 * Downloads the Internet Archive OCR of Smyth's "The Writings of Benjamin
 * Franklin" (10 vols, 1905-07, public domain) into a local, uncommitted cache.
 * Only this step touches the network; matching reads the cache.
 *
 * Run with: `tsx seed/sources/smyth/fetch.ts [cacheDir]`
 * Writes:   .workflow/scratch/smyth/vol-NN.txt (one per volume, skipped if present)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CACHE_DIR = '.workflow/scratch/smyth';

const USER_AGENT =
  'lit-crm-seed/1.0 (one-off download of public-domain text for a research seed dataset)';
/** Pause between downloads, so ten large files are not requested in a burst. */
const DELAY_MS = 3000;

export function volumeIdentifier(volume: number): string {
  return `writingsofbenjam${String(volume).padStart(2, '0')}franuoft`;
}

export function volumeUrl(volume: number): string {
  const id = volumeIdentifier(volume);
  return `https://archive.org/download/${id}/${id}_djvu.txt`;
}

/** Reader page for the volume: the citation added to a matched record's references. */
export function volumeDetailsUrl(volume: number): string {
  return `https://archive.org/details/${volumeIdentifier(volume)}`;
}

export function volumeCachePath(cacheDir: string, volume: number): string {
  return resolve(cacheDir, `vol-${String(volume).padStart(2, '0')}.txt`);
}

/** archive.org occasionally answers 5xx for a file that is fine seconds later. */
async function fetchWithRetry(url: string, attempts = 4): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) return response.text();
    if (response.status < 500 || attempt === attempts) {
      throw new Error(`${url}: HTTP ${response.status} after ${attempt} attempt(s)`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS * 2 ** attempt));
  }
}

async function main() {
  const cacheDir = process.argv[2] ?? DEFAULT_CACHE_DIR;
  mkdirSync(cacheDir, { recursive: true });
  for (let volume = 1; volume <= 10; volume++) {
    const path = volumeCachePath(cacheDir, volume);
    if (existsSync(path)) {
      console.log(`vol ${volume}: cached`);
      continue;
    }
    const text = await fetchWithRetry(volumeUrl(volume));
    writeFileSync(path, text);
    console.log(`vol ${volume}: ${text.length} chars`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) await main();
