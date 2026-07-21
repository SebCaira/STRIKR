// Builds src/data/clubLogos.ts from Wikidata: a verified logo image URL
// (P154) for every club in players.ts, resolved once offline rather than
// searched live on every app render — the live search in wikiLookup.ts
// picks the FIRST Wikidata search hit for a club's name, which occasionally
// matches the wrong entity (a homonymous place, person, or unrelated club)
// and shows a wrong crest in the app. This script does the same lookup once,
// keyed by name, so it can be reviewed and fixed by hand like clubData.ts
// and wikiOverrides.ts already were.
//
// Needs a real internet connection (Wikidata isn't reachable from the dev
// sandbox), so this is meant to run in your Codespace, same as
// build-club-data.js.
//
// Usage (from strikr-app/):
//   node build-club-logos.js
//
// Slow on purpose (1 request/sec, serial, with retries) — expect a long run
// across ~300+ clubs. RESUME support: clubs already in an existing
// src/data/clubLogos.ts are skipped, so if Wikidata throttles this IP
// partway through, just run it again.
//
// Output: src/data/clubLogos.ts
// Also prints a "NEEDS REVIEW" list — clubs with no logo claim at all, or
// where the matched Wikidata entity's own label doesn't look like the club
// name (a likely wrong match, e.g. homonymous city/person/club). Check
// those by hand and either fix them here or add them to
// src/data/wikiOverrides.ts (which still takes priority over this file).

const fs = require('fs');
const path = require('path');

const PLAYERS_PATH = path.join(__dirname, 'src/data/players.ts');
const OUTPUT_PATH = path.join(__dirname, 'src/data/clubLogos.ts');

const USER_AGENT = 'STRIKR-club-logos-builder/1.0 (https://github.com/SebCaira/STRIKR; one-off data collection script)';

function loadClubs() {
  let src = fs.readFileSync(PLAYERS_PATH, 'utf8');
  src = src.replace(/export type \w+[\s\S]*?;\n/, '');
  src = src.replace(/export interface \w+\s*\{[^}]*\}\n/, '');
  src = src.replace(/export const /g, 'const ');
  src = src.replace(/^const (\w+)\s*:[^=\n]+=/gm, 'const $1 =');
  src += '\nexports.PLAYERS = PLAYERS;\n';
  const mod = { exports: {} };
  new Function('exports', src)(mod.exports);
  const clubs = new Set();
  mod.exports.PLAYERS.forEach((p) => p.clubs.forEach((c) => clubs.add(c)));
  return Array.from(clubs).sort();
}

function loadExisting() {
  if (!fs.existsSync(OUTPUT_PATH)) return {};
  let src = fs.readFileSync(OUTPUT_PATH, 'utf8');
  const start = src.indexOf('{', src.indexOf('CLUB_LOGOS'));
  if (start === -1) return {};
  const end = src.lastIndexOf('};');
  if (end === -1) return {};
  try {
    return eval('(' + src.slice(start, end + 1) + ')');
  } catch {
    return {};
  }
}

// --- fully serial, 1 request/sec, with retry+backoff on failure -----------
const MIN_GAP_MS = 1000;
const MAX_RETRIES = 3;
let lastRequestAt = 0;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getJSON(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status === 403 || r.status >= 500) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      return null;
    } catch {
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

function wbSearch(query) {
  return getJSON(
    'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' +
      encodeURIComponent(query) +
      '&language=en&format=json&origin=*&type=item&limit=1'
  ).then((j) => (j && j.search && j.search[0] && { id: j.search[0].id, label: j.search[0].label || '' }) || null);
}

function wbClaims(qid) {
  return getJSON('https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=' + qid + '&property=P154&format=json&origin=*').then(
    (j) => (j && j.claims && j.claims.P154) || []
  );
}

function claimValue(claims) {
  const c = claims[0];
  return (c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value) || null;
}

function commonsFileUrl(filename, width) {
  const clean = String(filename).trim().replace(/\s+/g, '_');
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(clean) + (width ? '?width=' + width : '');
}

function stripAcc(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function norm(s) {
  return stripAcc(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Conservative check: flags a likely wrong Wikidata match rather than
// silently trusting the first search hit — the exact failure mode that
// causes wrong crests in the app.
function looksLikeMismatch(searchedName, label) {
  if (!label) return true;
  const a = norm(searchedName);
  const b = norm(label);
  if (!a || !b) return true;
  return !(b.includes(a) || a.includes(b));
}

async function resolveLogo(name) {
  const result = { name, url: null, issues: [] };
  const hit = (await wbSearch(name)) || (await wbSearch(name + ' F.C.')) || (await wbSearch(name + ' FC'));
  if (!hit) {
    result.issues.push('no Wikidata match');
    return result;
  }
  if (looksLikeMismatch(name, hit.label)) {
    result.issues.push(`possible wrong match: Wikidata entity is "${hit.label}"`);
  }
  const claims = await wbClaims(hit.id);
  const filename = claimValue(claims);
  if (!filename) {
    result.issues.push('no logo image (P154)');
    return result;
  }
  result.url = commonsFileUrl(filename, 300);
  return result;
}

function writeOutput(dataByName) {
  let out = `// Verified club logo URLs, built once from Wikidata (P154) by
// build-club-logos.js rather than searched live on every render — see that
// script for why. Checked against wikiOverrides.ts's manual corrections
// first (higher priority); this file is the second line of defense before
// falling back to a live, less reliable search.
export const CLUB_LOGOS: Record<string, string> = {
`;
  Object.keys(dataByName)
    .sort()
    .forEach((name) => {
      const url = dataByName[name];
      if (url) out += `  ${JSON.stringify(name)}: ${JSON.stringify(url)},\n`;
    });
  out += '};\n';
  fs.writeFileSync(OUTPUT_PATH, out);
}

async function main() {
  const clubs = loadClubs();
  const existing = loadExisting();
  const dataByName = { ...existing };

  const todo = clubs.filter((name) => !dataByName[name]);
  console.log(`${clubs.length} clubs total, ${clubs.length - todo.length} already resolved from a previous run, ${todo.length} left to do.`);

  const issuesByName = {};
  let done = 0;
  for (const name of todo) {
    const r = await resolveLogo(name);
    if (r.url) dataByName[name] = r.url;
    if (r.issues.length) issuesByName[name] = r.issues;
    done++;
    if (done % 5 === 0 || done === todo.length) {
      console.log(`  ${done}/${todo.length}... (writing progress to disk)`);
      writeOutput(dataByName);
    }
  }

  writeOutput(dataByName);
  console.log(`\nWrote ${OUTPUT_PATH}`);

  const flagged = Object.entries(issuesByName);
  console.log(`\n=== NEEDS REVIEW (${flagged.length}/${todo.length} from this run) ===`);
  flagged.forEach(([name, issues]) => console.log(`- ${name}: ${issues.join('; ')}`));
}

main();
