// Shared diamond wallet across STRIKR's mini-games (main game + daily challenge).
// Persisted in localStorage so both screens reflect the same balance.
(function(){
  var KEY = 'strikr_diamonds_v1';
  var DEFAULT_BALANCE = 320;

  function get(){
    try {
      var v = localStorage.getItem(KEY);
      return v === null ? DEFAULT_BALANCE : parseInt(v, 10) || 0;
    } catch (e) { return DEFAULT_BALANCE; }
  }

  function set(n){
    try { localStorage.setItem(KEY, String(Math.max(0, n))); } catch (e) {}
    window.dispatchEvent(new CustomEvent('strikr-diamonds-changed', { detail: { balance: n } }));
  }

  window.STRIKR_getDiamonds = get;
  window.STRIKR_addDiamonds = function(delta){
    var n = get() + delta;
    set(n);
    return n;
  };
  window.STRIKR_onDiamondsChanged = function(cb){
    window.addEventListener('strikr-diamonds-changed', function(e){ cb(e.detail.balance); });
  };
})();
