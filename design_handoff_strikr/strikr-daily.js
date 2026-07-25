(function(){
  var t = function(k){ return (window.STRIKR_t ? window.STRIKR_t(k) : k); };
  function stripAcc(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&lt;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  var MAX_ROWS = 6;
  var state = null, root = null;

  function todaySeed(){
    var d = new Date();
    return d.getFullYear() * 372 + (d.getMonth()+1) * 31 + d.getDate();
  }

  function pickDailyPlayer(){
    var pool = window.STRIKR_PLAYERS || [];
    if (!pool.length) return null;
    // Only last names in a reasonable range (3-10 letters) make a fair daily grid.
    var eligible = pool.filter(function(p){
      var last = stripAcc(p.n.split(' ').slice(-1)[0]).replace(/[^A-Za-z]/g,'');
      return last.length >= 3 && last.length <= 10;
    });
    if (!eligible.length) eligible = pool;
    var idx = todaySeed() % eligible.length;
    return eligible[idx];
  }

  function targetLetters(player){
    return stripAcc(player.n.split(' ').slice(-1)[0]).replace(/[^A-Za-z]/g,'').toUpperCase().split('');
  }

  function computeFeedback(guessLetters, target){
    var n = target.length;
    var result = new Array(n).fill('absent');
    var counts = {};
    var used = new Array(n).fill(false);
    for (var i=0;i<n;i++){
      if (guessLetters[i] === target[i]) { result[i] = 'exact'; used[i] = true; }
    }
    for (var i=0;i<n;i++){
      if (!used[i]) counts[target[i]] = (counts[target[i]]||0) + 1;
    }
    for (var i=0;i<n;i++){
      if (result[i] === 'exact') continue;
      var g = guessLetters[i];
      if (counts[g] > 0) { result[i] = 'present'; counts[g]--; }
    }
    return result;
  }

  var COLORS = {
    exact:   { bg: '#ffe66b', fg: '#1a1a1a', border: '#1a1a1a' },
    present: { bg: '#ffffff', fg: '#1a1a1a', border: '#1a1a1a' },
    absent:  { bg: '#2b3ff2', fg: '#ffffff', border: '#1a1a1a' },
    empty:   { bg: '#fff8ee', fg: '#1a1a1a', border: 'rgba(0,0,0,.15)' },
    typed:   { bg: '#fff', fg: '#1a1a1a', border: '#1a1a1a' },
  };

  function tileHTML(letter, kind){
    var c = COLORS[kind] || COLORS.empty;
    return '<div style="width:38px;height:38px;border-radius:8px;background:'+c.bg+';border:2px solid '+c.border+';display:flex;align-items:center;justify-content:center;font:900 18px \'Inter Tight\';color:'+c.fg+'">'+esc(letter||'')+'</div>';
  }

  function makeEmptyCurrent(){
    var n = state.target.length;
    var arr = new Array(n).fill('');
    for (var i=0;i<n;i++) if (state.locked[i]) arr[i] = state.locked[i];
    return arr;
  }

  function nextEditableIndex(){
    for (var i=0;i<state.current.length;i++){
      if (!state.locked[i] && !state.current[i]) return i;
    }
    return -1;
  }

  function lastEditableFilledIndex(){
    for (var i=state.current.length-1;i>=0;i--){
      if (!state.locked[i] && state.current[i]) return i;
    }
    return -1;
  }

  function renderGrid(){
    var host = document.getElementById('daily-grid');
    if (!host || !state.target) return;
    var n = state.target.length;
    var rows = [];
    for (var r = 0; r < MAX_ROWS; r++){
      var cells = '';
      if (r < state.guesses.length) {
        var g = state.guesses[r];
        for (var i=0;i<n;i++) cells += tileHTML(g.letters[i], g.feedback[i]);
      } else if (r === state.guesses.length && state.status === 'playing') {
        var current = state.current || [];
        for (var i=0;i<n;i++){
          if (state.locked[i]) cells += tileHTML(current[i], 'exact');
          else if (current[i]) cells += tileHTML(current[i], 'typed');
          else cells += tileHTML('', 'empty');
        }
      } else {
        for (var i=0;i<n;i++) cells += tileHTML('', 'empty');
      }
      rows.push('<div style="display:flex;gap:5px;justify-content:center">'+cells+'</div>');
    }
    host.innerHTML = rows.join('');
  }

  function renderPhoto(){
    var host = document.getElementById('daily-photo');
    if (!host) return;
    if (state.status !== 'won') { host.style.display = 'none'; host.innerHTML = ''; return; }
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.alignItems = 'center';
    if (host.getAttribute('data-for') === state.player.n) return; // already resolved for this player
    host.setAttribute('data-for', state.player.n);
    host.innerHTML = '<div style="width:128px;height:128px;border-radius:99px;background:linear-gradient(135deg,#1a1a1a,#3a3a3a);border:3px solid #1a1a1a;overflow:hidden;display:flex;align-items:center;justify-content:center;font:900 40px \'Inter Tight\';color:#ffe66b">'+esc((state.player.n.split(' ').map(function(w){return w[0];}).join('')).slice(0,2).toUpperCase())+'</div>';
    if (window.STRIKR_getPlayerPhoto) {
      window.STRIKR_getPlayerPhoto(state.player.n, function(url){
        if (!url || host.getAttribute('data-for') !== state.player.n) return;
        host.innerHTML = '<div style="width:128px;height:128px;border-radius:99px;overflow:hidden;border:3px solid #1a1a1a"><img src="'+url+'" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center 20%" onerror="this.parentElement.style.display=\'none\'"/></div>';
      });
    }
  }

  function renderDiamonds(){
    var host = document.getElementById('daily-diamonds');
    if (!host || !window.STRIKR_getDiamonds) return;
    host.textContent = '💎 ' + window.STRIKR_getDiamonds();
  }

  function rewardForTries(n){
    if (n === 1) return 50;
    if (n === 2 || n === 3) return 25;
    return 10; // 4, 5, 6
  }

  function renderStatus(){
    var host = document.getElementById('daily-status');
    if (!host) return;
    host.style.textAlign = 'center';
    if (!state.player) return;
    if (state.status === 'won') {
      var reward = rewardForTries(state.guesses.length);
      if (!state.rewardGiven && window.STRIKR_addDiamonds) {
        window.STRIKR_addDiamonds(reward);
        state.rewardGiven = true;
      }
      host.innerHTML = '<span style="color:#1a7a2e">✓ '+t('daily_found_in')+' '+state.guesses.length+'/'+MAX_ROWS+' · '+esc(state.player.n)+' · +'+reward+' 💎</span>';
      renderDiamonds();
    } else if (state.status === 'lost') {
      host.innerHTML = '<span style="color:#ff5a3c">✗ '+t('daily_lost')+' '+esc(state.player.n)+'</span>';
    } else {
      host.textContent = t('daily_try') + ' ' + (state.guesses.length + 1) + ' / ' + MAX_ROWS + ' · ' + state.target.length + ' ' + t('daily_letters');
    }
  }

  function renderKeyboard(){
    var host = document.getElementById('daily-keyboard');
    if (!host) return;
    var rows = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
    var letterState = {};
    state.guesses.forEach(function(g){
      g.letters.forEach(function(l, i){
        var f = g.feedback[i];
        var rank = { absent:0, present:1, exact:2 };
        if (rank[f] > (rank[letterState[l]] ?? -1)) letterState[l] = f;
      });
    });
    var html = rows.map(function(row, ri){
      var keys = row.split('').map(function(l){
        var st = letterState[l];
        var c = st ? COLORS[st] : { bg:'#fff', fg:'#1a1a1a', border:'#1a1a1a' };
        return '<button type="button" data-daily-key="'+l+'" style="flex:1;min-width:0;height:40px;border-radius:6px;background:'+c.bg+';color:'+c.fg+';border:1.5px solid '+c.border+';font:800 11px \'Inter Tight\';cursor:pointer;font-family:inherit">'+l+'</button>';
      }).join('');
      var pad = ri === 2 ? '<div style="flex:0.5"></div>' : '';
      return '<div style="display:flex;gap:4px">'+pad+keys+pad+'</div>';
    }).join('');
    html += '<div style="display:flex;gap:6px;margin-top:6px">'+
      '<button type="button" data-daily-action="back" style="flex:1;height:40px;border-radius:8px;background:#fff;border:2px solid #1a1a1a;font:800 11px \'Inter Tight\';cursor:pointer;font-family:inherit">'+t('daily_backspace')+'</button>'+
      '<button type="button" data-daily-action="submit" style="flex:1.4;height:40px;border-radius:8px;background:#ff5a3c;color:#fff;border:2px solid #1a1a1a;font:800 11px \'Inter Tight\';cursor:pointer;font-family:inherit">'+t('daily_submit')+'</button>'+
    '</div>';
    host.innerHTML = html;
  }

  function renderAll(){
    renderGrid();
    renderStatus();
    renderKeyboard();
    renderDiamonds();
    renderPhoto();
  }

  function typeLetter(l){
    if (state.status !== 'playing') return;
    var idx = nextEditableIndex();
    if (idx === -1) return; // row already full (all editable slots filled, or fully locked)
    state.current[idx] = l;
    renderAll();
  }

  function backspace(){
    if (state.status !== 'playing') return;
    var idx = lastEditableFilledIndex();
    if (idx === -1) return;
    state.current[idx] = '';
    renderAll();
  }

  function submitGuess(){
    if (state.status !== 'playing') return;
    if (nextEditableIndex() !== -1) return; // still has blanks
    var letters = state.current.slice();
    var feedback = computeFeedback(letters, state.target);
    state.guesses.push({ letters: letters, feedback: feedback });
    for (var i=0;i<feedback.length;i++){
      if (feedback[i] === 'exact') state.locked[i] = letters[i];
    }
    var isWin = feedback.every(function(f){ return f === 'exact'; });
    state.current = makeEmptyCurrent();
    if (isWin) { state.status = 'won'; if (window.STRIKR_fx) window.STRIKR_fx.win(); }
    else if (state.guesses.length >= MAX_ROWS) { state.status = 'lost'; if (window.STRIKR_fx) window.STRIKR_fx.wrong(); }
    else if (window.STRIKR_fx) window.STRIKR_fx.tap();
    renderAll();
  }

  function buildShell(){
    root.innerHTML =
      '<div style="height:56px;flex-shrink:0"></div>'+
      '<div style="padding:8px 20px 4px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<div style="font:700 10px \'JetBrains Mono\';color:#ff5a3c;letter-spacing:.14em;text-transform:uppercase">'+t('daily_kicker')+'</div>'+
          '<div id="daily-diamonds" style="padding:4px 9px;background:#a8f5c6;border:2px solid #1a1a1a;border-radius:99px;font:800 10px \'Inter Tight\';color:#1a1a1a">💎 …</div>'+
        '</div>'+
        '<div style="font:900 24px/1 \'Inter Tight\';color:#1a1a1a;margin-top:6px;letter-spacing:-.02em">'+t('daily_title_pre')+'<span style="color:#ff5a3c">'+t('daily_title_accent')+'</span>'+t('daily_title_suf')+'</div>'+
        '<div id="daily-photo" style="display:none;justify-content:center;margin:10px 0 2px"></div>'+
        '<div id="daily-status" style="font:600 12px \'Space Grotesk\';color:rgba(0,0,0,.55);margin-top:4px">'+t('daily_loading')+'</div>'+
      '</div>'+
      '<div id="daily-grid" style="flex:1;display:flex;flex-direction:column;gap:5px;justify-content:center;padding:6px 16px"></div>'+
      '<div id="daily-keyboard" style="padding:8px 14px 26px;display:flex;flex-direction:column;gap:4px"></div>';
  }

  function attachEvents(){
    root.addEventListener('click', function(e){
      var t = e.target;
      var key = t.getAttribute && t.getAttribute('data-daily-key');
      if (key) { typeLetter(key); return; }
      var action = t.getAttribute && t.getAttribute('data-daily-action');
      if (action === 'back') backspace();
      else if (action === 'submit') submitGuess();
    });
    document.addEventListener('keydown', function(e){
      if (!root || !root.isConnected || !state) return;
      if (e.key === 'Enter') submitGuess();
      else if (e.key === 'Backspace') backspace();
      else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
    });
  }

  function init(){
    if (!window.STRIKR_PLAYERS || !window.STRIKR_PLAYERS.length) return setTimeout(init, 120);
    root = document.getElementById('strikr-daily');
    if (!root) return setTimeout(init, 150);
    if (root.hasAttribute('data-daily-init')) return;
    root.setAttribute('data-daily-init', '1');
    var player = pickDailyPlayer();
    state = { player: player, target: targetLetters(player), guesses: [], current: null, status: 'playing', rewardGiven: false, locked: {} };
    state.current = makeEmptyCurrent();
    if (window.STRIKR_onDiamondsChanged) {
      window.STRIKR_onDiamondsChanged(function(){ renderDiamonds(); });
    }
    buildShell();
    attachEvents();
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setInterval(function(){
    var el = document.getElementById('strikr-daily');
    if (el && !el.hasAttribute('data-daily-init')) init();
  }, 500);
})();
