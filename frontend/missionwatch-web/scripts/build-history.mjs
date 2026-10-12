#!/usr/bin/env node
/**
 * Builds the historical launch snapshot used by the Analytics page.
 *
 * Source: Jonathan C. McDowell, General Catalog of Artificial Space Objects (GCAT),
 * https://planet4589.org/space/gcat — licensed CC BY 4.0.
 *
 * Output: public/data/launch-history.json, a compact, dictionary-encoded list of every
 * orbital-class launch attempt (GCAT launch category O or D). Pad explosions and pad
 * aborts (success code E / A) are excluded because no launch took place.
 *
 * Usage: npm run data:history [-- --from-dir <dir with launch.tsv, orgs.tsv, sites.tsv>]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GCAT = 'https://planet4589.org/space/gcat/tsv';
const FILES = {
  launch: `${GCAT}/launch/launch.tsv`,
  orgs: `${GCAT}/tables/orgs.tsv`,
  sites: `${GCAT}/tables/sites.tsv`,
};
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'data',
  'launch-history.json',
);

/**
 * GCAT records launch agencies at subsidiary level. These are merged so provider
 * comparisons are not split across codes for the same operator. Keep this list short
 * and documented: it is a presentation choice, not a correction of the source.
 */
const AGENCY_MERGES = {
  CALT: 'CASC',
  SAST: 'CASC',
  CGWIC: 'CASC',
  ZHSH: 'CASC',
  CZHJ: 'CASC',
  ULAL: 'ULA',
  ULAB: 'ULA',
  RLABN: 'RLABU',
};
const MERGED_NAMES = {
  CASC: { short: 'CASC', name: 'China Aerospace Science and Technology Corporation', state: 'CN' },
  ULA: { short: 'ULA', name: 'United Launch Alliance', state: 'US' },
  RLABU: { short: 'Rocket Lab', name: 'Rocket Lab', state: 'US' },
};

const MONTHS = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

async function load(name, fromDir) {
  if (fromDir) return readFile(join(fromDir, `${name}.tsv`), 'utf8');
  const res = await fetch(FILES[name], {
    headers: { 'User-Agent': 'MissionWatch history builder' },
  });
  if (!res.ok) throw new Error(`GCAT ${name}: HTTP ${res.status}`);
  return res.text();
}

function parseTsv(text) {
  const lines = text.split('\n');
  const header = lines[0]
    .replace(/^#/, '')
    .split('\t')
    .map((h) => h.trim());
  const updated = lines
    .find((l) => l.startsWith('# Updated'))
    ?.replace('# Updated', '')
    .trim();
  const rows = lines
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const cells = l.split('\t');
      return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]));
    });
  return { rows, updated };
}

/** "2026 Oct 10 0739:44" → "2026-10-10T07:39Z"; date-only values keep day precision. */
export function toIso(gcatDate) {
  const m = /^(\d{4})\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{2})(\d{2}))?/.exec(
    gcatDate.replace(/[?]/g, ''),
  );
  if (!m || !MONTHS[m[2]]) return null;
  const [, y, mon, d, hh, mm] = m;
  const date = `${y}-${String(MONTHS[mon]).padStart(2, '0')}-${d.padStart(2, '0')}`;
  return hh ? `${date}T${hh}:${mm}Z` : date;
}

/** GCAT success code → 0 success, 1 partial (fractional code such as OS80 / OF40), 2 failure. */
export function toOutcome(launchCode) {
  const m = /^[OD]([SF])(\d{2})?$/.exec(launchCode);
  if (!m) return null;
  if (m[2]) return 1;
  return m[1] === 'S' ? 0 : 2;
}

async function main() {
  const fromIdx = process.argv.indexOf('--from-dir');
  const fromDir = fromIdx > -1 ? process.argv[fromIdx + 1] : undefined;

  const [launchTsv, orgsTsv, sitesTsv] = await Promise.all(
    ['launch', 'orgs', 'sites'].map((f) => load(f, fromDir)),
  );
  const launch = parseTsv(launchTsv);
  const orgs = new Map(parseTsv(orgsTsv).rows.map((r) => [r.Code, r]));
  const sites = new Map(parseTsv(sitesTsv).rows.map((r) => [r.Site, r]));

  const providers = [];
  const providerIndex = new Map();
  const siteList = [];
  const siteIndex = new Map();
  const vehicles = [];
  const vehicleIndex = new Map();
  const launches = [];
  let skipped = 0;

  const indexOf = (map, list, key, make) => {
    if (!map.has(key)) {
      map.set(key, list.length);
      list.push(make());
    }
    return map.get(key);
  };

  for (const r of launch.rows) {
    const outcome = toOutcome(r.LaunchCode);
    if (outcome === null) continue; // not an orbital-class attempt, or no launch occurred
    const time = toIso(r.Launch_Date);
    if (!time) {
      skipped++;
      continue;
    }

    const rawAgency = (r.Agency || '-').split('/')[0];
    const agency = AGENCY_MERGES[rawAgency] ?? rawAgency;
    const p = indexOf(providerIndex, providers, agency, () => {
      const merged = MERGED_NAMES[agency];
      const org = orgs.get(agency);
      return merged
        ? [agency, merged.short, merged.name, merged.state]
        : [agency, org?.ShortName || agency, org?.Name || agency, org?.StateCode || ''];
    });

    const siteCode = r.Launch_Site || '-';
    const s = indexOf(siteIndex, siteList, siteCode, () => {
      const site = sites.get(siteCode);
      return [siteCode, site?.ShortName || siteCode, site?.Name || siteCode];
    });

    const v = indexOf(vehicleIndex, vehicles, r.LV_Type, () => r.LV_Type);
    launches.push([time, p, s, outcome, v]);
  }

  launches.sort((a, b) => a[0].localeCompare(b[0]));

  const snapshot = {
    schema: 1,
    source: {
      name: 'General Catalog of Artificial Space Objects (GCAT)',
      author: 'Jonathan C. McDowell',
      url: 'https://planet4589.org/space/gcat',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      updated: launch.updated ?? null,
    },
    generatedAt: new Date().toISOString(),
    notes: [
      'Orbital-class launch attempts only (GCAT launch category O or D).',
      'Pad explosions and pad aborts are excluded because no launch occurred.',
      'Fractional GCAT success codes (e.g. OS80, OF40) are reported as partial failures.',
      `Merged agency codes: ${Object.entries(AGENCY_MERGES)
        .map(([a, b]) => `${a}→${b}`)
        .join(', ')}.`,
    ],
    columns: ['time', 'provider', 'site', 'outcome', 'vehicle'],
    providers,
    sites: siteList,
    vehicles,
    launches,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot));
  console.log(
    `Wrote ${launches.length} launches (${providers.length} providers, ${siteList.length} sites; ${skipped} skipped) to ${OUT}`,
  );
  console.log(`GCAT updated: ${launch.updated ?? 'unknown'}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
