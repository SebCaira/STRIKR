// Dynamic Wikipedia/Wikidata lookup for club logos + player photos.
// Wikidata is the primary source: P154 = "logo image" (built for exactly this),
// P18 = "image" for people. Both resolve to a Commons filename we turn into a
// Special:FilePath URL. Falls back to the Wikipedia REST summary/pageimages
// APIs (good for photos, unreliable for infobox logos) if Wikidata has nothing.
(function(){
  var LS_KEY = 'strikr_wiki_cache_v3';
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(e){ cache = {}; }
  var persistTimer = null;
  function schedulePersist(){
    if (persistTimer) return;
    persistTimer = setTimeout(function(){
      persistTimer = null;
      try {
        // Only persist positive hits across reloads — a null can be a transient
        // failure (timeout, rate limit) and must be retried on next load, not
        // baked in forever.
        var positives = {};
        Object.keys(cache).forEach(function(k){ if (cache[k]) positives[k] = cache[k]; });
        localStorage.setItem(LS_KEY, JSON.stringify(positives));
      } catch(e){}
    }, 500);
  }
  var pending = {};
  var FETCH_TIMEOUT = 5000;

  function withTimeout(promise){
    return new Promise(function(resolve){
      var settled = false;
      var timer = setTimeout(function(){ if (!settled) { settled = true; resolve(null); } }, FETCH_TIMEOUT);
      promise.then(function(v){ if (!settled) { settled = true; clearTimeout(timer); resolve(v); } },
                   function(){ if (!settled) { settled = true; clearTimeout(timer); resolve(null); } });
    });
  }

  // Small concurrency queue + minimum spacing between request starts: avoids
  // tripping Wikipedia/Wikidata's server-side rate limiter, which cares about
  // requests-per-second from an IP, not just how many we run in parallel.
  var MAX_CONCURRENT = 2;
  var MIN_GAP_MS = 220;
  var active = 0;
  var queue = [];
  var lastStart = 0;
  function runQueue(){
    if (active >= MAX_CONCURRENT || !queue.length) return;
    var now = Date.now();
    var wait = Math.max(0, lastStart + MIN_GAP_MS - now);
    setTimeout(function(){
      if (active >= MAX_CONCURRENT || !queue.length) return;
      var job = queue.shift();
      active++;
      lastStart = Date.now();
      job().then(function(){ active--; runQueue(); });
      runQueue();
    }, wait);
  }
  function queued(fn){
    return new Promise(function(resolve){
      queue.push(function(){ return fn().then(resolve); });
      runQueue();
    });
  }

  function getJSON(url){
    return queued(function(){
      return withTimeout(fetch(url).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }));
    });
  }

  function commonsFileUrl(filename, width){
    var clean = String(filename).trim().replace(/\s+/g, '_');
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(clean) + (width ? ('?width=' + width) : '');
  }

  // ---- Wikidata: search entity, then read an image-valued claim ----
  function wikidataSearch(query, cb){
    getJSON('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + encodeURIComponent(query) + '&language=en&format=json&origin=*&type=item&limit=1')
      .then(function(j){ cb((j && j.search && j.search[0] && j.search[0].id) || null); });
  }
  function wikidataClaim(qid, prop, cb){
    getJSON('https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=' + qid + '&property=' + prop + '&format=json&origin=*')
      .then(function(j){
        var claims = j && j.claims && j.claims[prop];
        var v = claims && claims[0] && claims[0].mainsnak && claims[0].mainsnak.datavalue && claims[0].mainsnak.datavalue.value;
        cb(v || null);
      });
  }
  function wikidataImage(query, prop, width, cb){
    var key = 'wd:' + prop + ':' + query;
    if (cache[key] !== undefined) { cb(cache[key]); return; }
    if (pending[key]) { pending[key].push(cb); return; }
    pending[key] = [cb];
    function done(val){
      if (val) { cache[key] = val; schedulePersist(); } // don't poison the cache with a transient null
      var cbs = pending[key] || []; delete pending[key];
      cbs.forEach(function(f){ try { f(val); } catch(e){} });
    }
    wikidataSearch(query, function(qid){
      if (!qid) { done(null); return; }
      wikidataClaim(qid, prop, function(filename){
        done(filename ? commonsFileUrl(filename, width) : null);
      });
    });
  }

  // ---- Wikipedia REST fallback (page summary + pageimages) ----
  var summaryEP = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  var parseEP   = 'https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=800&redirects=1&titles=';
  function normTitle(s){ return String(s||'').trim().replace(/\s+/g,'_'); }
  function upgradeThumb(url){
    if (!url) return url;
    return url.replace(/\/thumb\/([^\s]+)\/(\d+)px-([^/]+)$/, function(_, mid, _size, tail){ return '/thumb/' + mid + '/800px-' + tail; });
  }
  function fetchOne(title, cb){
    var key = 'rest:' + title;
    if (cache[key] !== undefined) { cb(cache[key]); return; }
    if (pending[key]) { pending[key].push(cb); return; }
    pending[key] = [cb];
    function done(val){
      if (val) { cache[key] = val; schedulePersist(); } // don't poison the cache with a transient null
      var cbs = pending[key] || []; delete pending[key];
      cbs.forEach(function(f){ try { f(val); } catch(e){} });
    }
    var t = normTitle(title);
    getJSON(summaryEP + encodeURIComponent(t)).then(function(j){
      var url = j && ((j.originalimage && j.originalimage.source) || (j.thumbnail && upgradeThumb(j.thumbnail.source)));
      if (url) { done(url); return; }
      getJSON(parseEP + encodeURIComponent(t)).then(function(j2){
        var pages = j2 && j2.query && j2.query.pages;
        var k = pages && Object.keys(pages)[0];
        var p = k && pages[k];
        var src = p && ((p.original && p.original.source) || (p.thumbnail && upgradeThumb(p.thumbnail.source)));
        done(src || null);
      });
    });
  }
  function tryCandidates(candidates, cb){
    var results = new Array(candidates.length);
    var settled = false;
    function tryFinish(){
      if (settled) return;
      for (var i = 0; i < candidates.length; i++) {
        if (results[i] === undefined) return;
        if (results[i]) { settled = true; cb(results[i]); return; }
      }
      settled = true; cb(null);
    }
    candidates.forEach(function(title, i){
      fetchOne(title, function(v){ results[i] = v || null; tryFinish(); });
    });
  }

  // ---- Public API ----
  window.STRIKR_getClubLogo = function(clubName, cb){
    if (!clubName || typeof cb !== 'function') return;
    var override = window.STRIKR_LOGO_OVERRIDES && window.STRIKR_LOGO_OVERRIDES[clubName];
    if (override) { cb(override); return; }
    wikidataImage(clubName, 'P154', 300, function(url){
      if (url) { cb(url); return; }
      // Rare fallback: club page exists but has no P154 claim set.
      var candidates = [clubName, clubName + ' F.C.', clubName + ' FC'];
      tryCandidates(candidates, cb);
    });
  };

  window.STRIKR_getPlayerPhoto = function(playerName, cb){
    if (!playerName || typeof cb !== 'function') return;
    var override = window.STRIKR_PHOTO_OVERRIDES && window.STRIKR_PHOTO_OVERRIDES[playerName];
    if (override) { cb(override); return; }
    wikidataImage(playerName, 'P18', 800, function(url){
      if (url) { cb(url); return; }
      fetchOne(playerName, cb);
    });
  };
})();
