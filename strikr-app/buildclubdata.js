// Builds src/data/clubData.ts from Wikidata: country, founding year, stadium
// capacity, and coordinates (via the club's home venue) for every club that
// appears in players.ts. Needs a real internet connection (Wikidata isn't
// reachable from the dev sandbox), so this is meant to run in your Codespace.
//
// Usage (from strikr-app/):
//   node build-club-data.js
//
// Requires Node 18+ (built-in fetch). Takes roughly 5-15 minutes — ~360
// clubs, each needing several lookups, deliberately rate-limited to be
// polite to Wikidata's API rather than to be fast.
//
// Output: src/data/clubData.ts
// Also prints a "NEEDS REVIEW" list at the end for clubs where something
// couldn't be resolved (wrong Wikidata match, no stadium/capacity found,
// etc.) — check those manually the way you did with the Logo Review page.

const fs = require('fs');
const path = require('path');

const PLAYERS_PATH = path.join(__dirname, 'src/data/players.ts');
const OUTPUT_PATH = path.join(__dirname, 'src/data/clubData.ts');

function loadClubs() {
  let src = fs.readFileSync(PLAYERS_PATH, 'utf8');
  // Strip the TS-only bits (type alias, interface) that aren't valid plain
  // JS, then drop the `export ` keyword everywhere else so every other
  // `export const ...` in the file just becomes an ordinary local
  // declaration inside the Function body below (harmless — we only read
  // PLAYERS back out at the end).
  src = src.replace(/export type \w+[\s\S]*?;\n/, '');
  src = src.replace(/export interface \w+\s*\{[^}]*\}\n/, '');
  src = src.replace(/export const /g, 'const ');
  // Strip `: Type` annotations off top-level const declarations (e.g.
  // `const PLAYERS: Player[] =` -> `const PLAYERS =`).
  src = src.replace(/^const (\w+)\s*:[^=\n]+=/gm, 'const $1 =');
  src += '\nexports.PLAYERS = PLAYERS;\n';
  const mod = { exports: {} };
  new Function('exports', src)(mod.exports);
  const clubs = new Set();
  mod.exports.PLAYERS.forEach((p) => p.clubs.forEach((c) => clubs.add(c)));
  return Array.from(clubs).sort();
}

// --- tiny concurrency-limited, rate-spaced request queue -------------------
const MAX_CONCURRENT = 3;
const MIN_GAP_MS = 150;
let active = 0;
let lastStart = 0;
const queue = [];

function runQueue() {
  if (active >= MAX_CONCURRENT || !queue.length) return;
  const wait = Math.max(0, lastStart + MIN_GAP_MS - Date.now());
  setTimeout(() => {
    if (active >= MAX_CONCURRENT || !queue.length) return;
    const job = queue.shift();
    active++;
    lastStart = Date.now();
    job().finally(() => {
      active--;
      runQueue();
    });
    runQueue();
  }, wait);
}

function queued(fn) {
  return new Promise((resolve) => {
    queue.push(() => fn().then(resolve, () => resolve(null)));
    runQueue();
  });
}

function getJSON(url) {
  return queued(() =>
    fetch(url, { headers: { 'User-Agent': 'STRIKR-club-data-builder/1.0' } }).then((r) => (r.ok ? r.json() : null))
  );
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

  // Country (P17) -> ISO alpha-2 code (P297 on the country entity).
  const countryVal = claimValue(claims, 'P17');
  if (countryVal && countryVal.id) {
    const countryClaims = await wbClaims(countryVal.id);
    const iso = claimValue(countryClaims, 'P297');
    if (iso) result.country = iso;
    else result.issues.push('country found but no ISO code');
  } else {
    result.issues.push('no country (P17)');
  }

  // Founding year (P571).
  const inception = claimValue(claims, 'P571');
  if (inception && inception.time) {
    const m = /^\+?(\d{1,4})-/.exec(inception.time);
    if (m) result.founded = parseInt(m[1], 10);
  }
  if (!result.founded) result.issues.push('no founding year (P571)');

  // Capacity + coordinates live on the stadium (P115 home venue), not the club.
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

async function main() {
  const clubs = loadClubs();
  console.log(`Found ${clubs.length} unique clubs in players.ts. Querying Wikidata...`);

  const results = [];
  let done = 0;
  for (const name of clubs) {
    const r = await resolveClub(name);
    results.push(r);
    done++;
    if (done % 10 === 0 || done === clubs.length) {
      console.log(`  ${done}/${clubs.length}...`);
    }
  }

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
  results.forEach((r) => {
    out += `  ${JSON.stringify(r.name)}: { country: ${tsLiteral(r.country)}, founded: ${tsLiteral(r.founded)}, capacity: ${tsLiteral(r.capacity)}, lat: ${tsLiteral(r.lat)}, lng: ${tsLiteral(r.lng)} },\n`;
  });
  out += '};\n';

  fs.writeFileSync(OUTPUT_PATH, out);
  console.log(`\nWrote ${OUTPUT_PATH}`);

  const flagged = results.filter((r) => r.issues.length);
  console.log(`\n=== NEEDS REVIEW (${flagged.length}/${results.length}) ===`);
  flagged.forEach((r) => console.log(`- ${r.name}: ${r.issues.join('; ')}`));
}

main();
