// Builds src/data/clubData.ts from Wikidata: country, founding year, stadium
// capacity, and coordinates (via the club's home venue) for every club that
// appears in players.ts. Needs a real internet connection (Wikidata isn't
// reachable from the dev sandbox), so this is meant to run in your Codespace.
//
// Usage (from strikr-app/):
//   node build-club-data.js
//
// v2: much slower and serial (1 request/sec, no concurrency) with retries,
// a Wikimedia-policy-compliant User-Agent, and RESUME support — clubs
// already resolved in an existing src/data/clubData.ts are skipped, so if
// Wikidata throttles you partway through you can just run it again (and
// again) instead of losing everything and starting over. Real failures
// (genuinely no Wikidata entry) are also remembered so they're not retried
// forever — delete their line from clubData.ts if you want a fresh attempt.
//
// Requires Node 18+ (built-in fetch). Slow on purpose — expect 10-20+
// minutes, possibly across a few runs if Wikidata throttles this IP.
//
// Output: src/data/clubData.ts
// Also prints a "NEEDS REVIEW" list at the end for clubs where something
// couldn't be resolved — check those manually the way you did with the
// Logo Review page.

const fs = require('fs');
const path = require('path');

const PLAYERS_PATH = path.join(__dirname, 'src/data/players.ts');
const OUTPUT_PATH = path.join(__dirname, 'src/data/clubData.ts');

// Identifies the tool per Wikimedia's User-Agent policy
// (https://meta.wikimedia.org/wiki/User-Agent_policy) — generic/blank UAs
// from datacenter IPs are the main thing that gets rate-limited hard.
const USER_AGENT = 'STRIKR-club-data-builder/1.0 (https://github.com/SebCaira/STRIKR; one-off data collection script)';

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

// Reads whatever clubData.ts already exists (from a previous, possibly
// throttled run) so this run can skip clubs already done.
function loadExisting() {
  if (!fs.existsSync(OUTPUT_PATH)) return {};
  let src = fs.readFileSync(OUTPUT_PATH, 'utf8');
  src = src.replace(/export interface \w+\s*\{[^}]*\}\n/, '');
  src = src.replace(/export const /g, 'const ');
  src = src.replace(/^const (\w+)\s*:[^=\n]+=/gm, 'const $1 =');
  src += '\nexports.CLUB_DATA = CLUB_DATA;\n';
  const mod = { exports: {} };
  try {
    new Function('exports', src)(mod.exports);
    return mod.exports.CLUB_DATA || {};
  } catch {
    return {};
  }
}

function hasAnyData(entry) {
  return entry && (entry.country || entry.founded || entry.capacity || entry.lat !== null);
}

// --- fully serial, 1 request/sec, with retry+backoff on failure -----------
const MIN_GAP_MS = 1000;
const MAX_RETRIES = 3;
let lastRequestAt = 0;
let requestsLogged = 0;

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
      // Log the actual reason the first few times so a real problem is visible.
      if (requestsLogged < 5) {
        console.log(`  [debug] HTTP ${r.status} for ${url.slice(0, 90)}...`);
        requestsLogged++;
      }
      if (r.status === 429 || r.status === 403 || r.status >= 500) {
        await sleep(2000 * (attempt + 1)); // back off harder and retry
        continue;
      }
      return null; // non-retryable HTTP error (e.g. 400)
    } catch (e) {
      if (requestsLogged < 5) {
        console.log(`  [debug] fetch error: ${e.message}`);
        requestsLogged++;
      }
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
  ).then((j) => (j && j.search && j.search[0] && j.search[0].id) || null);
}

function wbClaims(qid) {
  return getJSON('https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=' + qid + '&format=json&origin=*').then(
    (j) => (j && j.claims) || {}
  );
}

function claimValue(claims, prop) {
  const c = claims[prop];
  return (c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue && c[0].mainsnak.datavalue.value) || null;
}

async function resolveClub(name) {
  const result = { name, country: null, founded: null, capacity: null, lat: null, lng: null, issues: [] };

  const qid = (await wbSearch(name)) || (await wbSearch(name + ' F.C.')) || (await wbSearch(name + ' FC'));
  if (!qid) {
    result.issues.push('no Wikidata match');
    return result;
  }
  const claims = await wbClaims(qid);

  const countryVal = claimValue(claims, 'P17');
  if (countryVal && countryVal.id) {
    const countryClaims = await wbClaims(countryVal.id);
    const iso = claimValue(countryClaims, 'P297');
    if (iso) result.country = iso;
    else result.issues.push('country found but no ISO code');
  } else {
    result.issues.push('no country (P17)');
  }

  const inception = claimValue(claims, 'P571');
  if (inception && inception.time) {
    const m = /^\+?(\d{1,4})-/.exec(inception.time);
    if (m) result.founded = parseInt(m[1], 10);
  }
  if (!result.founded) result.issues.push('no founding year (P571)');

  const venueVal = claimValue(claims, 'P115');
  let venueClaims = null;
  if (venueVal && venueVal.id) {
    venueClaims = await wbClaims(venueVal.id);
  } else {
    result.issues.push('no home venue (P115)');
  }

  const capacitySource = venueClaims || claims;
  const capacity = claimValue(capacitySource, 'P1083');
  if (capacity && capacity.amount) result.capacity = Math.round(parseFloat(capacity.amount));
  else result.issues.push('no stadium capacity (P1083)');

  const coordSource = venueClaims || claims;
  const coord = claimValue(coordSource, 'P625');
  if (coord && typeof coord.latitude === 'number') {
    result.lat = coord.latitude;
    result.lng = coord.longitude;
  } else {
    result.issues.push('no coordinates (P625)');
  }

  return result;
}

function tsLiteral(v) {
  return v === null ? 'null' : JSON.stringify(v);
}

function writeOutput(dataByName) {
  let out = `// Auto-generated by build-club-data.js from Wikidata — country, founding
// year, stadium capacity, and coordinates, keyed by the exact club name used
// in players.ts. Entries flagged in the "NEEDS REVIEW" console output when
// this was generated may have missing or wrong fields; fix those by hand.

export interface ClubData {
  country: string | null;
  founded: number | null;
  capacity: number | null;
  lat: number | null;
  lng: number | null;
}

export const CLUB_DATA: Record<string, ClubData> = {
`;
  Object.keys(dataByName)
    .sort()
    .forEach((name) => {
      const r = dataByName[name];
      out += `  ${JSON.stringify(name)}: { country: ${tsLiteral(r.country)}, founded: ${tsLiteral(r.founded)}, capacity: ${tsLiteral(r.capacity)}, lat: ${tsLiteral(r.lat)}, lng: ${tsLiteral(r.lng)} },\n`;
    });
  out += '};\n';
  fs.writeFileSync(OUTPUT_PATH, out);
}

async function main() {
  const clubs = loadClubs();
  const existing = loadExisting();
  const dataByName = { ...existing };

  const todo = clubs.filter((name) => !hasAnyData(existing[name]));
  console.log(
    `${clubs.length} clubs total, ${clubs.length - todo.length} already resolved from a previous run, ${todo.length} left to do.`
  );

  const issuesByName = {};
  let done = 0;
  for (const name of todo) {
    const r = await resolveClub(name);
    dataByName[name] = { country: r.country, founded: r.founded, capacity: r.capacity, lat: r.lat, lng: r.lng };
    if (r.issues.length) issuesByName[name] = r.issues;
    done++;
    if (done % 5 === 0 || done === todo.length) {
      console.log(`  ${done}/${todo.length}... (writing progress to disk)`);
      writeOutput(dataByName); // save incrementally so a crash/throttle mid-run doesn't lose work
    }
  }

  writeOutput(dataByName);
  console.log(`\nWrote ${OUTPUT_PATH}`);

  const flagged = Object.entries(issuesByName);
  console.log(`\n=== NEEDS REVIEW (${flagged.length}/${todo.length} from this run) ===`);
  flagged.forEach(([name, issues]) => console.log(`- ${name}: ${issues.join('; ')}`));

  const stillMissing = clubs.filter((name) => !hasAnyData(dataByName[name]));
  if (stillMissing.length) {
    console.log(`\n${stillMissing.length} clubs still have no data at all — just run the script again to retry only those.`);
  } else {
    console.log('\nAll clubs have at least some data.');
  }
}

main();