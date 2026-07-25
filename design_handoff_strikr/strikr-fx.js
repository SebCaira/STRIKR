// Shared feedback FX for STRIKR: haptics (vibration) + short synthesized sounds.
// No audio files needed — tones are generated with the Web Audio API.
(function(){
  var ctx = null;
  function getCtx(){
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type, gainPeak){
    var c = getCtx();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak || 0.15, c.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration + 0.02);
  }

  function vibrate(pattern){
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  window.STRIKR_fx = {
    correct: function(){
      vibrate(30);
      tone(523.25, 0.12, 'sine', 0.16);
      setTimeout(function(){ tone(783.99, 0.16, 'sine', 0.16); }, 90);
    },
    wrong: function(){
      vibrate([40, 40, 40]);
      tone(160, 0.22, 'square', 0.10);
    },
    win: function(){
      vibrate([25, 60, 25, 60, 40]);
      [523.25, 659.25, 783.99, 1046.5].forEach(function(f, i){
        setTimeout(function(){ tone(f, 0.18, 'sine', 0.14); }, i * 90);
      });
    },
    coin: function(){
      vibrate(15);
      tone(1046.5, 0.09, 'sine', 0.12);
      setTimeout(function(){ tone(1318.5, 0.12, 'sine', 0.12); }, 60);
    },
    tap: function(){
      vibrate(10);
    },
  };
})();
