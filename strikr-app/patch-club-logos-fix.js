// Corrige des logos de club erronés vus en jeu (Midtjylland = carte de
// la région danoise, Palermo = simple rayure rose, Brøndby = photo d'un
// bâtiment) : ce sont exactement les 3 noms de clubs qui n'ont pas de logo
// vérifié à la main et retombaient sur une recherche Wikipedia/Wikidata en
// direct, laquelle a matché la mauvaise page pour ces 3 noms (des noms
// ambigus - une région, une ville, un lieu - plutôt que le club). Retrouver
// les vrais logos demande d'aller chercher sur Wikimedia Commons, ce qui
// n'est pas possible depuis l'environnement où ce correctif a été préparé -
// donc ces 3 clubs affichent maintenant le badge "initiales" propre de
// ClubShield (comme n'importe quel club sans logo connu) au lieu d'une
// mauvaise image. Si tu as les vrais logos sous la main, je peux les
// ajouter proprement ensuite.
//
// A appliquer depuis la racine du repo OU depuis strikr-app :
//   node patch-club-logos-fix.js
//   git add -A
//   git commit -m "Corrige les logos erronés de Midtjylland/Palermo/Brøndby"
//   git push -u origin main
//   cd strikr-app
//   eas update --branch production --platform ios
//   eas update --branch production --platform android

const fs = require('fs');
const path = require('path');

function resolveBase() {
  const candidates = [path.join(__dirname, 'strikr-app'), __dirname];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json')) && fs.existsSync(path.join(c, 'App.tsx'))) {
      return c;
    }
  }
  throw new Error(
    "Impossible de trouver le dossier strikr-app (avec package.json et App.tsx dedans). " +
    "Lance ce script depuis la racine du repo (a cote du dossier strikr-app) ou depuis l'interieur de strikr-app."
  );
}
const BASE = resolveBase();
console.log('dossier detecte :', BASE);

function write(rel, content) {
  const full = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log('wrote', rel);
}

write("src/lib/wikiLookup.ts", "// Dynamic Wikipedia/Wikidata lookup for club logos + player photos.\n// Wikidata is the primary source: P154 = \"logo image\" (built for exactly this),\n// P18 = \"image\" for people. Both resolve to a Commons filename we turn into a\n// Special:FilePath URL. Falls back to the Wikipedia REST summary/pageimages\n// APIs (good for photos, unreliable for infobox logos) if Wikidata has nothing.\nimport AsyncStorage from '@react-native-async-storage/async-storage';\nimport { LOGO_OVERRIDES, PHOTO_OVERRIDES } from '../data/wikiOverrides';\nimport { CLUB_LOGOS } from '../data/clubLogos';\n\nconst LS_KEY = 'strikr_wiki_cache_v3';\nlet cache: Record<string, string | null> = {};\nlet cacheLoaded = false;\nlet loadPromise: Promise<void> | null = null;\n\nasync function loadCache() {\n  if (cacheLoaded) return;\n  if (!loadPromise) {\n    loadPromise = AsyncStorage.getItem(LS_KEY)\n      .then((raw) => {\n        try {\n          cache = raw ? JSON.parse(raw) : {};\n        } catch {\n          cache = {};\n        }\n      })\n      .finally(() => {\n        cacheLoaded = true;\n      });\n  }\n  return loadPromise;\n}\n\nlet persistTimer: ReturnType<typeof setTimeout> | null = null;\nfunction schedulePersist() {\n  if (persistTimer) return;\n  persistTimer = setTimeout(() => {\n    persistTimer = null;\n    const positives: Record<string, string> = {};\n    Object.keys(cache).forEach((k) => {\n      const v = cache[k];\n      if (v) positives[k] = v;\n    });\n    AsyncStorage.setItem(LS_KEY, JSON.stringify(positives)).catch(() => {});\n  }, 500);\n}\n\nconst pending: Record<string, ((v: string | null) => void)[]> = {};\nconst FETCH_TIMEOUT = 5000;\n\nfunction withTimeout<T>(promise: Promise<T>): Promise<T | null> {\n  return new Promise((resolve) => {\n    let settled = false;\n    const timer = setTimeout(() => {\n      if (!settled) {\n        settled = true;\n        resolve(null);\n      }\n    }, FETCH_TIMEOUT);\n    promise.then(\n      (v) => {\n        if (!settled) {\n          settled = true;\n          clearTimeout(timer);\n          resolve(v);\n        }\n      },\n      () => {\n        if (!settled) {\n          settled = true;\n          clearTimeout(timer);\n          resolve(null);\n        }\n      }\n    );\n  });\n}\n\n// Small concurrency queue + minimum spacing between request starts: avoids\n// tripping Wikipedia/Wikidata's server-side rate limiter.\nconst MAX_CONCURRENT = 2;\nconst MIN_GAP_MS = 220;\nlet active = 0;\nconst queue: (() => Promise<void>)[] = [];\nlet lastStart = 0;\n\nfunction runQueue() {\n  if (active >= MAX_CONCURRENT || !queue.length) return;\n  const now = Date.now();\n  const wait = Math.max(0, lastStart + MIN_GAP_MS - now);\n  setTimeout(() => {\n    if (active >= MAX_CONCURRENT || !queue.length) return;\n    const job = queue.shift()!;\n    active++;\n    lastStart = Date.now();\n    job().then(() => {\n      active--;\n      runQueue();\n    });\n    runQueue();\n  }, wait);\n}\n\nfunction queued<T>(fn: () => Promise<T>): Promise<T> {\n  return new Promise((resolve) => {\n    queue.push(() => fn().then(resolve as any));\n    runQueue();\n  });\n}\n\nfunction getJSON(url: string): Promise<any> {\n  return queued(() =>\n    withTimeout(\n      fetch(url)\n        .then((r) => (r.ok ? r.json() : null))\n        .catch(() => null)\n    )\n  );\n}\n\nfunction commonsFileUrl(filename: string, width?: number): string {\n  const clean = String(filename).trim().replace(/\\s+/g, '_');\n  return (\n    'https://commons.wikimedia.org/wiki/Special:FilePath/' +\n    encodeURIComponent(clean) +\n    (width ? '?width=' + width : '')\n  );\n}\n\nfunction wikidataSearch(query: string): Promise<string | null> {\n  return getJSON(\n    'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' +\n      encodeURIComponent(query) +\n      '&language=en&format=json&origin=*&type=item&limit=1'\n  ).then((j) => (j && j.search && j.search[0] && j.search[0].id) || null);\n}\n\nfunction wikidataClaim(qid: string, prop: string): Promise<string | null> {\n  return getJSON(\n    'https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=' +\n      qid +\n      '&property=' +\n      prop +\n      '&format=json&origin=*'\n  ).then((j) => {\n    const claims = j && j.claims && j.claims[prop];\n    const v =\n      claims &&\n      claims[0] &&\n      claims[0].mainsnak &&\n      claims[0].mainsnak.datavalue &&\n      claims[0].mainsnak.datavalue.value;\n    return v || null;\n  });\n}\n\nasync function wikidataImage(query: string, prop: string, width: number): Promise<string | null> {\n  await loadCache();\n  const key = 'wd:' + prop + ':' + query;\n  if (cache[key] !== undefined) return cache[key];\n  if (pending[key]) return new Promise((resolve) => pending[key].push(resolve));\n  pending[key] = [];\n  const done = (val: string | null) => {\n    if (val) {\n      cache[key] = val;\n      schedulePersist();\n    }\n    const cbs = pending[key] || [];\n    delete pending[key];\n    cbs.forEach((f) => f(val));\n  };\n  const qid = await wikidataSearch(query);\n  if (!qid) {\n    done(null);\n    return null;\n  }\n  const filename = await wikidataClaim(qid, prop);\n  const url = filename ? commonsFileUrl(filename, width) : null;\n  done(url);\n  return url;\n}\n\nconst summaryEP = 'https://en.wikipedia.org/api/rest_v1/page/summary/';\nconst parseEP =\n  'https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=800&redirects=1&titles=';\n\nfunction normTitle(s: string): string {\n  return String(s || '').trim().replace(/\\s+/g, '_');\n}\n\nfunction upgradeThumb(url?: string | null): string | null | undefined {\n  if (!url) return url;\n  return url.replace(/\\/thumb\\/([^\\s]+)\\/(\\d+)px-([^/]+)$/, (_m, mid, _size, tail) => '/thumb/' + mid + '/800px-' + tail);\n}\n\nasync function fetchOne(title: string): Promise<string | null> {\n  await loadCache();\n  const key = 'rest:' + title;\n  if (cache[key] !== undefined) return cache[key];\n  if (pending[key]) return new Promise((resolve) => pending[key].push(resolve));\n  pending[key] = [];\n  const done = (val: string | null) => {\n    if (val) {\n      cache[key] = val;\n      schedulePersist();\n    }\n    const cbs = pending[key] || [];\n    delete pending[key];\n    cbs.forEach((f) => f(val));\n  };\n  const t = normTitle(title);\n  const j = await getJSON(summaryEP + encodeURIComponent(t));\n  const url = j && ((j.originalimage && j.originalimage.source) || (j.thumbnail && upgradeThumb(j.thumbnail.source)));\n  if (url) {\n    done(url);\n    return url;\n  }\n  const j2 = await getJSON(parseEP + encodeURIComponent(t));\n  const pages = j2 && j2.query && j2.query.pages;\n  const k = pages && Object.keys(pages)[0];\n  const p = k && pages[k];\n  const src = p && ((p.original && p.original.source) || (p.thumbnail && upgradeThumb(p.thumbnail.source)));\n  done(src || null);\n  return src || null;\n}\n\nasync function tryCandidates(candidates: string[]): Promise<string | null> {\n  const results = await Promise.all(candidates.map((c) => fetchOne(c)));\n  return results.find((r) => r) || null;\n}\n\n// Names where the live search below is known to match the wrong Wikidata\n// entity outright — e.g. \"Palermo\" resolving to the city/flag, \"Midtjylland\"\n// to the Danish region, \"Brøndby\" to a building — rather than just missing.\n// Verifying real replacement crests requires reaching Wikipedia/Wikimedia\n// Commons, which isn't reachable from every environment this code is\n// maintained from, so these are blocked from the live fallback entirely and\n// fall through to ClubShield's clean initials badge instead of a wrong logo.\nconst NO_LIVE_LOOKUP = new Set(['Palermo', 'Midtjylland', 'Brøndby']);\n\nexport async function getClubLogo(clubName: string): Promise<string | null> {\n  if (!clubName) return null;\n  const override = LOGO_OVERRIDES[clubName];\n  if (override) return override;\n  // Verified offline (build-club-logos.js) rather than searched live — the\n  // live search below takes the first Wikidata search hit for the name,\n  // which occasionally matches the wrong entity and shows a wrong crest.\n  const verified = CLUB_LOGOS[clubName];\n  if (verified) return verified;\n  if (NO_LIVE_LOOKUP.has(clubName)) return null;\n  const url = await wikidataImage(clubName, 'P154', 300);\n  if (url) return url;\n  return tryCandidates([clubName, clubName + ' F.C.', clubName + ' FC']);\n}\n\nexport async function getPlayerPhoto(playerName: string): Promise<string | null> {\n  if (!playerName) return null;\n  const override = PHOTO_OVERRIDES[playerName];\n  if (override) return override;\n  const url = await wikidataImage(playerName, 'P18', 800);\n  if (url) return url;\n  return fetchOne(playerName);\n}\n");


{
  const target = path.join(BASE, 'src/data/wikiOverridesData.json');
  const raw = fs.readFileSync(target, 'utf8');
  const keyStr = '"Palermo":"';
  const start = raw.indexOf(keyStr);
  if (start === -1) {
    console.log('Palermo entry already absent from wikiOverridesData.json, skipping');
  } else {
    const valStart = start + keyStr.length;
    const valEnd = raw.indexOf('"', valStart);
    // Remove "Palermo":"...", (including the trailing comma, since Palermo
    // isn't the last key in the object).
    const spliced = raw.slice(0, start) + raw.slice(valEnd + 2);
    fs.writeFileSync(target, spliced);
    console.log('removed bad Palermo entry from wikiOverridesData.json');
  }
}
