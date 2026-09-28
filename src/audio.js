/* Keys Out: sound. Every effect is synthesized with the Web Audio API, so the game still needs
   no audio files and no build step. Tuning (volume, spacing) is SOUND in src/data.js.
   Browsers only allow audio after a tap, so audioUnlock() is called from the Start button. */

const MUTE_KEY = 'keysout.muted.v1';
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* storage blocked (private mode): stay unmuted */ }

let actx = null, master = null;
const lastSfx = {};

function audioUnlock() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = SOUND.volume;
      master.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { actx = null; }   // sound is a nice-to-have; never break the game over it
}

function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* keep the in-memory value */ }
}

// One note: an oscillator with a quick attack and an exponential fade. f1 makes it glide.
function tone(t0, o) {
  const osc = actx.createOscillator(), amp = actx.createGain();
  const gain = o.gain == null ? 0.2 : o.gain;
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f0, t0);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(amp); amp.connect(master);
  osc.start(t0); osc.stop(t0 + o.dur + 0.03);
}
const notes = (t0, freqs, step, o) => freqs.forEach((f, i) => tone(t0 + i * step, { ...o, f0: f }));

const SFX = {
  hit:    t => { tone(t, { type:'triangle', f0:2200, dur:0.06, gain:0.16 }); tone(t + 0.045, { type:'triangle', f0:3100, dur:0.08, gain:0.12 }); }, // keys jingle
  miss:   t => tone(t, { f0:160, f1:90, dur:0.12, gain:0.3 }),                       // hit before the flag
  flag:   t => tone(t, { type:'triangle', f0:98, f1:123, dur:0.32, gain:0.26 }),     // low hum as the flag goes up
  ko:     t => notes(t, [392, 523, 659], 0.07, { type:'square', dur:0.1, gain:0.09 }),
  save:   t => { SFX.ko(t); tone(t + 0.24, { f0:2637, dur:0.5, gain:0.15 }); tone(t + 0.24, { f0:3951, dur:0.35, gain:0.07 }); }, // glass clink
  hurt:   t => tone(t, { type:'sawtooth', f0:220, f1:60, dur:0.35, gain:0.15 }),
  tag:    t => notes(t, [1319, 1568, 1976, 2637], 0.04, { dur:0.09, gain:0.1 }),     // lipstick or glitter
  call:   t => [0, 0.35].forEach(d => { tone(t + d, { f0:440, dur:0.16, gain:0.14 }); tone(t + d, { f0:480, dur:0.16, gain:0.14 }); tone(t + d + 0.2, { f0:440, dur:0.12, gain:0.12 }); tone(t + d + 0.2, { f0:480, dur:0.12, gain:0.12 }); }),
  unlock: t => notes(t, [523, 659, 784, 1047], 0.07, { type:'triangle', dur:0.14, gain:0.14 }),
  win:    t => notes(t, [523, 659, 784, 1047, 1319], 0.1, { type:'triangle', dur:0.22, gain:0.14 })
};

function sfx(name) {
  if (muted || !actx || actx.state !== 'running' || !SFX[name]) return;
  const now = actx.currentTime;
  if (name in lastSfx && now - lastSfx[name] < SOUND.minGap) return;
  lastSfx[name] = now;
  try { SFX[name](now); } catch (e) { /* ignore */ }
}
