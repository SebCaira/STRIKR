// Builds src/data/playerClubYears.ts from Wikidata: for every player in
// players.ts, fetches their "member of sports team" (P54) statements —
// each carries "start time" (P580) / "end time" (P582) qualifiers — then
// aligns those career stints with the player's `clubs` array (assumed to
// already be in chronological order) by club name.
//
// Needs a real internet connection (Wikidata isn't reachable from the dev
// sandbox), so this is meant to run in your Codespace, same as
// build-club-data.js was for club data.
//
// Usage (from strikr-app/):
//   node build-player-club-dates.js
//
// Slow on purpose (1 request/sec, serial) — expect a long run (200 players,
// several requests each). RESUME support: players already in an existing
// src/data/playerClubYears.ts are skipped, so if Wikidata throttles this IP
// partway through, just run it again.
//
// Output: src/data/playerClubYears.ts
// Also prints a "NEEDS REVIEW" list for stints that couldn't be matched to
// a Wikidata team by name, or where a club in `clubs` had no year data at
// all — check/fill those manually rather than guessing.

const fs = require('fs');
const path = require('path');

const PLAYERS_PATH = path.join(__dirname, 'src/data/players.ts');
const OUTPUT_PATH = path.join(__dirname, 'src/data/playerClubYears.ts');

const USER_AGENT = 'STRIKR-player-dates-builder/1.0 (https://github.com/SebCaira/STRIKR; one-off data collection script)';

function loadPlayers() {
  let src = fs.readFileSync(PLAYERS_PATH, 'utf8');
  src = src.replace(/export type \w+[\s\S]*?;\n/, '');
  src = src.replace(/export interface \w+\s*\{[^}]*\}\n/, '');
  src = src.replace(/export const /g, 'const ');
  src = src.replace(/^const (\w+)\s*:[^=\n]+=/gm, 'const $1 =');
  src += '\nexports.PLAYERS = PLAYERS;\n';
  const mod = { exports: {} };
  new Function('exports', src)(mod.exports);
  return mod.exports.PLAYERS;
}

function loadExisting() {
  if (!fs.existsSync(OUTPUT_PATH)) return {};
  let src = fs.readFileSync(OUTPUT_PATH, 'utf8');
  const start = src.indexOf('{', src.indexOf('PLAYER_CLUB_YEARS'));
  if (start === -1) return {};
  const end = src.lastIndexOf('};');
  if (end === -1) return {};
  try {
    return eval('(' + src.slice(start, end + 1) + ')');
  } catch {
    return {};
  }
}

// --- serial, 1 request/sec, with retry+backoff ----------------------------
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
      await sleep(1500 * (attempt + 1));
    }
  }
  return null;
}

async function searchEntity(name) {
  const j = await getJSON(
    'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' +
      encodeURIComponent(name) +
      '&language=en&format=json&origin=*&type=item&limit=1'
  );
  return (j && j.search && j.search[0] && j.search[0].id) || null;
}

async function getClaims(qid, prop) {
  const j = await getJSON(
    'https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=' + qid + '&property=' + prop + '&format=json&origin=*'
  );
  return (j && j.claims && j.claims[prop]) || [];
}

async function getLabel(qid) {
  const j = await getJSON(
    'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid + '&props=labels&languages=en&format=json&origin=*'
  );
  return (j && j.entities && j.entities[qid] && j.entities[qid].labels && j.entities[qid].labels.en && j.entities[qid].labels.en.value) || null;
}

function extractYear(timeValue) {
  if (!timeValue || !timeValue.time) return null;
  const m = /^\+(\d{4})-/.exec(timeValue.time);
  return m ? parseInt(m[1], 10) : null;
}

function stripAcc(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normClub(s) {
  return stripAcc(String(s || ''))
    .toLowerCase()
    .replace(/\b(fc|cf|afc|f\.c\.|sc|cd|ac)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function labelsMatch(a, b) {
  const na = normClub(a);
  const nb = normClub(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function buildStintsForPlayer(qid) {
  const claims = await getClaims(qid, 'P54');
  const stints = [];
  for (const c of claims) {
    const teamQid = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id;
    if (!teamQid) continue;
    const quals = c.qualifiers || {};
    const startVal = quals.P580 && quals.P580[0] && quals.P580[0].datavalue && quals.P580[0].datavalue.value;
    const endVal = quals.P582 && quals.P582[0] && quals.P582[0].datavalue && quals.P582[0].datavalue.value;
    stints.push({ teamQid, start: extractYear(startVal), end: extractYear(endVal) });
  }
  for (const s of stints) {
    s.label = await getLabel(s.teamQid);
  }
  stints.sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999));
  return stints;
}

function alignClubs(playerClubs, stints) {
  const used = new Array(stints.length).fill(false);
  const result = [];
  const unmatched = [];
  for (const club of playerClubs) {
    let matched = false;
    for (let i = 0; i < stints.length; i++) {
      if (used[i]) continue;
      if (labelsMatch(club, stints[i].label)) {
        result.push({ club, start: stints[i].start, end: stints[i].end });
        used[i] = true;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push({ club, start: null, end: null });
      unmatched.push(club);
    }
  }
  return { aligned: result, unmatched };
}   