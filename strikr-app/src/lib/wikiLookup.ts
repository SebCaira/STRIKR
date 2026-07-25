// Dynamic Wikipedia/Wikidata lookup for club logos + player photos.
// Wikidata is the primary source: P154 = "logo image" (built for exactly this),
// P18 = "image" for people. Both resolve to a Commons filename we turn into a
// Special:FilePath URL. Falls back to the Wikipedia REST summary/pageimages
// APIs (good for photos, unreliable for infobox logos) if Wikidata has nothing.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOGO_OVERRIDES, PHOTO_OVERRIDES } from '../data/wikiOverrides';
import { CLUB_LOGOS } from '../data/clubLogos';

const LS_KEY = 'strikr_wiki_cache_v3';
let cache: Record<string, string | null> = {};
let cacheLoaded = false;
let loadPromise: Promise<void> | null = null;

async function loadCache() {
  if (cacheLoaded) return;
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(LS_KEY)
      .then((raw) => {
        try {
          cache = raw ? JSON.parse(raw) : {};
        } catch {
          cache = {};
        }
      })
      .finally(() => {
        cacheLoaded = true;
      });
  }
  return loadPromise;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const positives: Record<string, string> = {};
    Object.keys(cache).forEach((k) => {
      const v = cache[k];
      if (v) positives[k] = v;
    });
    AsyncStorage.setItem(LS_KEY, JSON.stringify(positives)).catch(() => {});
  }, 500);
}

const pending: Record<string, ((v: string | null) => void)[]> = {};
const FETCH_TIMEOUT = 5000;

function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, FETCH_TIMEOUT);
    promise.then(
      (v) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(v);
        }
      },
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      }
    );
  });
}

// Small concurrency queue + minimum spacing between request starts: avoids
// tripping Wikipedia/Wikidata's server-side rate limiter.
const MAX_CONCURRENT = 2;
const MIN_GAP_MS = 220;
let active = 0;
const queue: (() => Promise<void>)[] = [];
let lastStart = 0;

function runQueue() {
  if (active >= MAX_CONCURRENT || !queue.length) return;
  const now = Date.now();
  const wait = Math.max(0, lastStart + MIN_GAP_MS - now);
  setTimeout(() => {
    if (active >= MAX_CONCURRENT || !queue.length) return;
    const job = queue.shift()!;
    active++;
    lastStart = Date.now();
    job().then(() => {
      active--;
      runQueue();
    });
    runQueue();
  }, wait);
}

function queued<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve) => {
    queue.push(() => fn().then(resolve as any));
    runQueue();
  });
}

function getJSON(url: string): Promise<any> {
  return queued(() =>
    withTimeout(
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );
}

function commonsFileUrl(filename: string, width?: number): string {
  const clean = String(filename).trim().replace(/\s+/g, '_');
  return (
    'https://commons.wikimedia.org/wiki/Special:FilePath/' +
    encodeURIComponent(clean) +
    (width ? '?width=' + width : '')
  );
}

function wikidataSearch(query: string): Promise<string | null> {
  return getJSON(
    'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' +
      encodeURIComponent(query) +
      '&language=en&format=json&origin=*&type=item&limit=1'
  ).then((j) => (j && j.search && j.search[0] && j.search[0].id) || null);
}

function wikidataClaim(qid: string, prop: string): Promise<string | null> {
  return getJSON(
    'https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=' +
      qid +
      '&property=' +
      prop +
      '&format=json&origin=*'
  ).then((j) => {
    const claims = j && j.claims && j.claims[prop];
    const v =
      claims &&
      claims[0] &&
      claims[0].mainsnak &&
      claims[0].mainsnak.datavalue &&
      claims[0].mainsnak.datavalue.value;
    return v || null;
  });
}

async function wikidataImage(query: string, prop: string, width: number): Promise<string | null> {
  await loadCache();
  const key = 'wd:' + prop + ':' + query;
  if (cache[key] !== undefined) return cache[key];
  if (pending[key]) return new Promise((resolve) => pending[key].push(resolve));
  pending[key] = [];
  const done = (val: string | null) => {
    if (val) {
      cache[key] = val;
      schedulePersist();
    }
    const cbs = pending[key] || [];
    delete pending[key];
    cbs.forEach((f) => f(val));
  };
  const qid = await wikidataSearch(query);
  if (!qid) {
    done(null);
    return null;
  }
  const filename = await wikidataClaim(qid, prop);
  const url = filename ? commonsFileUrl(filename, width) : null;
  done(url);
  return url;
}

const summaryEP = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const parseEP =
  'https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=800&redirects=1&titles=';

function normTitle(s: string): string {
  return String(s || '').trim().replace(/\s+/g, '_');
}

function upgradeThumb(url?: string | null): string | null | undefined {
  if (!url) return url;
  return url.replace(/\/thumb\/([^\s]+)\/(\d+)px-([^/]+)$/, (_m, mid, _size, tail) => '/thumb/' + mid + '/800px-' + tail);
}

async function fetchOne(title: string): Promise<string | null> {
  await loadCache();
  const key = 'rest:' + title;
  if (cache[key] !== undefined) return cache[key];
  if (pending[key]) return new Promise((resolve) => pending[key].push(resolve));
  pending[key] = [];
  const done = (val: string | null) => {
    if (val) {
      cache[key] = val;
      schedulePersist();
    }
    const cbs = pending[key] || [];
    delete pending[key];
    cbs.forEach((f) => f(val));
  };
  const t = normTitle(title);
  const j = await getJSON(summaryEP + encodeURIComponent(t));
  const url = j && ((j.originalimage && j.originalimage.source) || (j.thumbnail && upgradeThumb(j.thumbnail.source)));
  if (url) {
    done(url);
    return url;
  }
  const j2 = await getJSON(parseEP + encodeURIComponent(t));
  const pages = j2 && j2.query && j2.query.pages;
  const k = pages && Object.keys(pages)[0];
  const p = k && pages[k];
  const src = p && ((p.original && p.original.source) || (p.thumbnail && upgradeThumb(p.thumbnail.source)));
  done(src || null);
  return src || null;
}

async function tryCandidates(candidates: string[]): Promise<string | null> {
  const results = await Promise.all(candidates.map((c) => fetchOne(c)));
  return results.find((r) => r) || null;
}

export async function getClubLogo(clubName: string): Promise<string | null> {
  if (!clubName) return null;
  const override = LOGO_OVERRIDES[clubName];
  if (override) return override;
  // Verified offline (build-club-logos.js) rather than searched live — the
  // live search below takes the first Wikidata search hit for the name,
  // which occasionally matches the wrong entity and shows a wrong crest.
  const verified = CLUB_LOGOS[clubName];
  if (verified) return verified;
  const url = await wikidataImage(clubName, 'P154', 300);
  if (url) return url;
  return tryCandidates([clubName, clubName + ' F.C.', clubName + ' FC']);
}

export async function getPlayerPhoto(playerName: string): Promise<string | null> {
  if (!playerName) return null;
  const override = PHOTO_OVERRIDES[playerName];
  if (override) return override;
  const url = await wikidataImage(playerName, 'P18', 800);
  if (url) return url;
  return fetchOne(playerName);
}
