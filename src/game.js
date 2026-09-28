/* Keys Out: Level 1 (Last Call) on Phaser 4.
   Tuning (villains, weapons, causes, donations) is in src/data.js.
   Screens, HUD and the weapon bar are in src/ui.js, which owns the shared
   `game`, `state`, `selected`, `goldPin` and `pointer` variables. */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hex = s => parseInt(s.slice(1), 16);
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const COLORS = { ink:0x1A0E1D, amber:0xF4B942, neon:0xFF4F9A, flag:0xE0302B, cream:0xFFF1E0, spiked:0x7CFF6B, pepper:0xFF8C3C };
const OUTFITS = ['#3E7CB1','#C4553B','#5E9E6E','#8A5FB0','#D9A441','#2F8F8F','#B84C7A','#6B6B8F','#A0522D','#467A3C'].map(hex);
const SKINS = ['#F1C7A5','#D9A07A','#A86B45','#7A4A2E','#E8B894','#5C3A24'].map(hex);
const HAIRS = ['#1E1410','#4A2C1A','#8B5A2B','#C9A15B','#2B2B2B','#7A2E1E','#D8D0C0'].map(hex);
// Render at the screen's pixel density (capped at 3) so phones stay sharp. World units stay CSS pixels:
// the canvas is DPR times larger and the camera zooms by DPR.
const DPR = Math.min(3, window.devicePixelRatio || 1);
const TEXT_RES = DPR;

let S = null;                       // the running scene
let W, H, horizonY, playerY, counterTop;
const drinks = [0,1,2].map(i => ({ i, x:0, spiked:false, resetT:0 }));
const patrons = drinks.map(() => ({ outfit:pick(OUTFITS), skin:pick(SKINS), hair:pick(HAIRS), male:false }));
const bottles = Array.from({length:22}, () => ({ x:Math.random(), h:rand(14,26), c:pick([0x3f7d4f,0x8a3b2a,0xc9a15b,0x4a6b8a,0xd8d0c0]), row:Math.random() < 0.5 ? 0 : 1 }));

const sc = y => 0.55 + 0.75 * clamp((y - horizonY) / (playerY - horizonY), 0, 1);
const origin = () => ({ x:W / 2, y:playerY + 14 });
const WPN = id => WEAPONS.find(w => w.id === id);
const dmgMult = c => (c.tagged || c.marked) ? 2 : 1;   // glitter-bombed or lipstick-marked
const slowMult = c => c.marked ? WPN('lipstick').slow : 1;

/* ---------- characters ---------- */

// A person is a container drawn in local coordinates with the feet at (0,0), scaled by depth.
function makePersonView(p, back) {
  const v = S.add.container(0, 0);
  const g = S.add.graphics();
  g.fillStyle(0x000000, 0.35).fillEllipse(0, 0, 30, 8);
  g.fillStyle(0x1c1420, 1).fillRect(-9, -26, 7, 26).fillRect(2, -26, 7, 26);
  const arms = S.add.graphics();
  const body = S.add.graphics();
  // Men: broader, squarer torso, short hair, sometimes a beard. Women: narrower torso, long hair.
  if (p.male) body.fillStyle(p.outfit, 1).fillRoundedRect(-15, -62, 30, 38, 5);
  else body.fillStyle(p.outfit, 1).fillRoundedRect(-12, -62, 24, 38, 9);
  body.fillStyle(p.skin, 1).fillCircle(0, -72, 10);
  body.fillStyle(p.hair, 1);
  if (back) {
    if (p.male) { body.beginPath(); body.arc(0, -73, 10.5, Math.PI * 0.95, Math.PI * 0.05); body.closePath(); body.fillPath(); }
    else body.fillCircle(0, -72, 11.5).fillRoundedRect(-11.5, -72, 23, 22, 4);
  } else if (p.male) {
    body.beginPath(); body.arc(0, -77, 10, Math.PI * 1.05, -Math.PI * 0.05); body.closePath(); body.fillPath();
    if (p.beard) { body.beginPath(); body.arc(0, -72, 10, Math.PI * 0.18, Math.PI * 0.82); body.closePath(); body.fillPath(); }
    body.fillStyle(COLORS.ink, 1).fillRect(-4.5, -72, 2.2, 2.6).fillRect(2.3, -72, 2.2, 2.6);
  } else {
    body.beginPath(); body.arc(0, -73, 11.5, Math.PI, 0); body.closePath(); body.fillPath();
    body.fillRoundedRect(-12.5, -76, 6, 27, 3).fillRoundedRect(6.5, -76, 6, 27, 3);
    body.fillStyle(COLORS.ink, 1).fillRect(-4.5, -72, 2.2, 2.6).fillRect(2.3, -72, 2.2, 2.6);
  }
  v.add([g, arms, body]);
  v.arms = arms; v.armPose = null; v.person = p;
  setArms(v, 'down');
  return v;
}
function setArms(v, pose) {
  if (v.armPose === pose) return;
  v.armPose = pose;
  const a = v.arms, p = v.person;
  a.clear().lineStyle(6, p.outfit, 1);
  const arm = (x1, y1, x2, y2) => { a.lineBetween(x1, y1, x2, y2); a.fillStyle(p.skin, 1).fillCircle(x2, y2, 3.4); };
  if (pose === 'grab') { arm(-11,-56,-24,-48); arm(11,-56,24,-48); }
  else if (pose === 'wipe') { arm(-11,-56,-6,-72); arm(11,-56,6,-72); }
  else if (pose === 'vial') { arm(-11,-56,-14,-32); arm(11,-56,20,-64); a.fillStyle(COLORS.spiked, 1).fillRect(18, -74, 4, 9); }
  else { arm(-11,-56,-14,-32); arm(11,-56,14,-32); }
}

function makeChar(kind) {
  const depth = playerY - horizonY, fromLeft = Math.random() < 0.5;
  const c = { kind, x:fromLeft ? -24 : W + 24, y:horizonY + rand(0.08, 0.3) * depth, dir:fromLeft ? 1 : -1,
    outfit:pick(OUTFITS), skin:pick(SKINS), hair:pick(HAIRS),
    state:'wander', tx:rand(0.12, 0.88) * W, ty:horizonY + rand(0.06, 0.45) * depth,
    hitCool:0, stun:0, flagged:false, tagged:false, life:rand(6, 10) };
  c.male = kind === 'bystander' ? Math.random() < LOOKS.bystanderMaleChance : Math.random() >= LOOKS.villainFemaleChance;
  c.beard = c.male && Math.random() < LOOKS.beardChance;
  if (kind !== 'bystander') { const v = VILLAINS[kind]; c.hp = v.hp; c.tellT = rand(v.tell[0], v.tell[1]); }

  const view = makePersonView(c, false);
  view.stunFx = S.add.circle(0, -70, 16, COLORS.pepper, 0.35).setVisible(false);
  view.flag = S.add.container(9, 0).setVisible(false);
  const fg = S.add.graphics();
  fg.lineStyle(2, COLORS.cream, 1).lineBetween(0, -82, 0, -116);
  fg.fillStyle(COLORS.flag, 1).fillTriangle(0, -116, 24, -110, 0, -102);
  view.flag.add(fg);
  view.sparkles = [0,1,2,3,4].map(i => S.add.circle(0, 0, 2.5, i % 2 ? COLORS.neon : COLORS.amber).setVisible(false));
  view.add([view.stunFx, view.flag, ...view.sparkles]);
  c.view = view;
  return c;
}
function spawn() {
  if (game.chars.filter(c => c.state !== 'ko').length >= 9) return;
  let r = Math.random(), kind = 'bystander';
  for (const k in SPAWN_WEIGHTS) { r -= SPAWN_WEIGHTS[k]; if (r <= 0) { kind = k; break; } }
  if (kind === 'spiker' && game.chars.filter(c => c.kind === 'spiker' && c.state !== 'ko').length >= 2) kind = 'follower';
  game.chars.push(makeChar(kind));
}
function moveToward(c, tx, ty, sp, dt) {
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
  if (Math.abs(dx) > 0.5) c.dir = dx < 0 ? -1 : 1;
  if (d <= sp * dt || d < 1) { c.x = tx; c.y = ty; return true; }
  c.x += dx / d * sp * dt; c.y += dy / d * sp * dt; return false;
}
function flag(c) {
  if (c.flagged) return;
  c.flagged = true;
  c.view.flag.setVisible(true);
  if (!reduceMotion) S.tweens.add({ targets:c.view.flag, scaleX:0.8, duration:160, yoyo:true, repeat:-1 });
  if (c.kind === 'grabber') { c.state = 'windup'; c.windup = VILLAINS.grabber.windup; }
  else if (c.kind === 'spiker') {
    const taken = game.chars.filter(o => o !== c && o.kind === 'spiker' && o.flagged && o.state !== 'ko').map(o => o.drink);
    const free = drinks.filter(d => !d.spiked && !taken.includes(d.i)).map(d => d.i);
    c.drink = free.length ? pick(free) : Math.floor(Math.random() * 3);
    c.state = 'act';
  } else c.state = 'act';
}

/* ---------- combat ---------- */
function charAt(px, py) {
  const list = game.chars.filter(c => c.state !== 'ko').sort((a, b) => b.y - a.y);
  for (const c of list) {
    const s = sc(c.y), w = 34 * s + 12, h = 86 * s + 10;
    if (px > c.x - w / 2 && px < c.x + w / 2 && py > c.y - h && py < c.y + 8) return c;
  }
  return null;
}
/* ---------- haptics ---------- */
// navigator.vibrate on Android. iOS Safari has no vibration API, but toggling a hidden
// <input type="checkbox" switch> plays the system haptic tick (iOS 18+), so we use that
// as a fallback. It only fires inside a user gesture, so on iPhone held weapons stay quiet.
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
let iosTick = null;
if (!canVibrate && /iP(hone|ad|od)/.test(navigator.userAgent)) {
  const label = document.createElement('label'), input = document.createElement('input');
  input.type = 'checkbox'; input.setAttribute('switch', '');
  label.appendChild(input);
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.appendChild(label);
  iosTick = label;
}
const lastBuzz = {};
function buzz(kind) {
  if (!HAPTICS.enabled) return;
  const pattern = HAPTICS[kind];
  if (pattern == null) return;
  const now = performance.now() / 1000;
  if (now - (lastBuzz[kind] || 0) < HAPTICS.minGap) return;
  lastBuzz[kind] = now;
  try {
    if (canVibrate) navigator.vibrate(pattern);
    else if (iosTick) iosTick.click();
  } catch (e) { /* haptics are a nice-to-have; never break the game over them */ }
}

function applyHit(c, dmg) {
  if (c.state === 'ko' || c.state === 'bail') return;
  const s = sc(c.y);
  if (c.kind === 'bystander') { if (c.hitCool > 0) return; c.hitCool = 1.2; hurt('That\u2019s just a girl trying to leave.'); return; }
  if (!c.flagged) {
    if (c.hitCool > 0) return;
    c.hitCool = 0.8; game.score = Math.max(0, game.score - 50); game.combo = 0;
    floatText(c.x, c.y - 96 * s, 'Not yet. Wait for the flag. -50', '#FFF1E0'); return;
  }
  c.hp -= dmg * dmgMult(c);
  S.fx.sparks.explode(6, c.x, c.y - 50 * s);
  if (c.hp <= 0) ko(c); else buzz('hit');
}
function ko(c) {
  const v = VILLAINS[c.kind], s = sc(c.y);
  const save = c.kind === 'spiker' && c.state !== 'leave';
  c.state = 'ko'; game.kos++; game.combo++; game.faced.add(c.kind);
  const mult = Math.min(4, 1 + Math.floor(game.combo / 3));
  let pts = v.points * mult;
  if (save) { pts += v.saveBonus; game.saves++; }
  game.score += pts;
  buzz(save ? 'save' : 'ko');
  floatText(c.x, c.y - 100 * s, (save ? 'SAVED HER +' : 'DOWN +') + pts, save ? '#FF4F9A' : '#F4B942');
  S.fx.gold.explode(14, c.x, c.y - 50 * s);
  koBadge(c.x, c.y - 100 * s, s);
  c.view.stunFx.setVisible(false); c.view.sparkles.forEach(p => p.setVisible(false));
  S.tweens.killTweensOf(c.view.flag); c.view.flag.setVisible(false);
  S.tweens.add({ targets:c.view, angle:(c.dir || 1) * 80, alpha:0, duration:900, onComplete:() => { c.view.destroy(); c.dead = true; } });
  checkUnlocks();
}
function koBadge(x, y, s) {
  const b = S.add.container(x, y).setDepth(9000);
  const g = S.add.graphics(), r = 18 * s + 6, pts = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rad = i % 2 ? r * 0.55 : r; pts.push({ x:Math.cos(a) * rad, y:Math.sin(a) * rad }); }
  g.fillStyle(COLORS.amber, 1).fillPoints(pts, true);
  const t = S.add.text(0, 1, 'KO', { fontFamily:"Bungee, 'Arial Black', sans-serif", fontSize:Math.round(12 * s + 6) + 'px', color:'#1A0E1D', resolution:TEXT_RES }).setOrigin(0.5);
  b.add([g, t]);
  S.tweens.add({ targets:b, alpha:0, duration:900, onComplete:() => b.destroy() });
}
function hurt(msg) {
  if (state !== 'play') return;
  game.hearts--; game.combo = 0;
  const why = { 'Drink spiked.':'spiked', 'He followed you.':'followed', 'Grabbed.':'grabbed', 'That was a bystander.':'bystander' }[msg];
  if (why) game.events.push(why);
  buzz('hurt');
  S.cameras.main.flash(350, 224, 48, 43, true);
  if (!reduceMotion) S.cameras.main.shake(300, 0.008, true);
  floatText(W / 2, H * 0.5, msg, '#FFF1E0', true);
  if (game.hearts <= 0) endGame(false);
}
function useKeys() {
  const w = WPN('keys');
  if (game.cool.keys > 0) return;
  game.cool.keys = w.cooldown;
  const c = charAt(pointer.x, pointer.y);
  game.streaks.push({ star:true, x2:pointer.x, y2:pointer.y, life:0.15, color:COLORS.cream });
  if (c) applyHit(c, w.dmg);
}
function sprayTick(dt) {
  const w = WPN('spray'), o = origin(), ang = Math.atan2(pointer.y - o.y, pointer.x - o.x);
  const range = (playerY - horizonY) * 0.75 + 40, half = 0.26;
  game.sprayAng = ang; game.spraying = 0.1;
  if (Math.random() < 0.7) S.fx.spray.emitParticleAt(o.x, o.y, 1);
  for (const c of game.chars) {
    if (c.state === 'ko' || c.state === 'bail') continue;
    const cx = c.x, cy = c.y - 45 * sc(c.y), dx = cx - o.x, dy = cy - o.y, d = Math.hypot(dx, dy);
    if (d > range) continue;
    let da = Math.atan2(dy, dx) - ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > half + 14 / Math.max(d, 1)) continue;
    if (c.kind === 'bystander') applyHit(c, 0);
    else if (!c.flagged) c.stun = Math.max(c.stun, 0.3);
    else { c.stun = 0.5; c.hp -= w.dps * dt * dmgMult(c); if (c.hp <= 0) ko(c); else buzz('hit'); }
  }
}
function useGlitter() {
  const w = WPN('glitter');
  if (game.cool.glitter > 0) { toast('Glitter\u2019s reloading. Hang on.'); return; }
  game.cool.glitter = w.cooldown;
  const R = clamp(W * 0.18, 70, 120);
  let n = 0;
  S.fx.glitter.explode(40, pointer.x, pointer.y);
  ringFx(pointer.x, pointer.y, R, COLORS.neon);
  for (const c of game.chars) {
    if (c.state === 'ko' || c.state === 'bail' || c.kind === 'bystander') continue;
    if (Math.hypot(c.x - pointer.x, (c.y - 40 * sc(c.y)) - pointer.y) < R + 20 * sc(c.y)) { flag(c); glitterBomb(c); n++; }
  }
  if (n) buzz('tag');
  floatText(pointer.x, pointer.y - 40, n ? (n > 1 ? 'GLITTERED x' + n : 'GLITTERED \u2014 good luck washing that off') : 'Swung at air', '#FF4F9A', n > 0);
}
// He gets absolutely covered: a shower from above, glitter stuck all over him, and he's
// stuck wiping his face for a moment.
function glitterBomb(c) {
  const s = sc(c.y), v = c.view, first = !c.tagged;
  c.tagged = true;
  c.stun = Math.max(c.stun, 0.7); c.bombT = 0.7;
  for (let k = 0; k < 6; k++) S.fx.glitterRain.explode(7, c.x + rand(-16, 16) * s, c.y - rand(105, 125) * s);
  const puff = S.add.circle(0, -60, 18, COLORS.neon, 0.45);
  v.add(puff);
  S.tweens.add({ targets:puff, scale:2.2, alpha:0, duration:500, onComplete:() => puff.destroy() });
  if (first) {
    const cols = [COLORS.neon, COLORS.amber, COLORS.cream, 0xB478FF, 0x6BE4FF];
    v.specks = [];
    for (let i = 0; i < 22; i++) {
      const onHead = i < 8;
      const d = S.add.circle(onHead ? rand(-9, 9) : rand(-12, 12), onHead ? rand(-82, -64) : rand(-60, -26), rand(0.9, 1.7), pick(cols)).setScale(0);
      v.add(d); v.specks.push(d);
      S.tweens.add({ targets:d, scale:1, delay:120 + i * 18, duration:120 });
    }
  }
}
function ringFx(x, y, r, color) {
  const g = S.add.graphics().setDepth(8600);
  const o = { t:0 };
  S.tweens.add({ targets:o, t:1, duration:350, onUpdate:() => { g.clear().lineStyle(3, color, 1 - o.t).strokeCircle(x, y, r * (0.3 + 0.7 * o.t)); }, onComplete:() => g.destroy() });
}

/* ---------- lipstick ---------- */
function useLipstick() {
  const w = WPN('lipstick');
  if (game.cool.lipstick > 0) return;
  game.cool.lipstick = w.cooldown;
  const c = charAt(pointer.x, pointer.y);
  game.streaks.push({ star:true, x2:pointer.x, y2:pointer.y, life:0.15, color:0xE0115F });
  if (!c) return;
  if (c.kind !== 'bystander' && c.flagged && c.state !== 'bail' && !c.marked) writeCreep(c);
  applyHit(c, w.dmg);
}
// Writes CREEP across his forehead, left to right, with the lipstick moving along the letters.
function writeCreep(c) {
  c.marked = true;
  const v = c.view, color = goldPin ? '#F4B942' : '#E0115F';
  const t = S.add.text(0, -77, 'CREEP', { fontFamily:"Bungee, 'Arial Black', Impact, sans-serif", fontSize:'11px', color,
    stroke:'#1A0E1D', strokeThickness:2, resolution:TEXT_RES * 3 }).setOrigin(0, 0.5).setAngle(-6);
  t.x = -t.width / 2;
  v.add(t); v.creep = t;
  buzz('tag');
  if (reduceMotion) return;
  const tube = S.add.text(t.x, -80, '💄', { fontSize:'13px', resolution:TEXT_RES * 3 }).setOrigin(0.2, 0.9).setAngle(30);
  v.add(tube);
  t.setScale(0, 1);
  S.tweens.add({ targets:t, scaleX:1, duration:420, ease:'Linear',
    onUpdate:() => { tube.x = t.x + t.width * t.scaleX; } ,
    onComplete:() => S.tweens.add({ targets:tube, alpha:0, y:-92, duration:200, onComplete:() => tube.destroy() }) });
}

/* ---------- fake call from your friend ---------- */
const CALL_LINES = [
  'OMG I\u2019m literally right outside.',
  'Where are you?? I\u2019m by the door.',
  'I see you. Coming over right now.',
  'Stay there, we\u2019re walking in.',
  'Babe your Uber\u2019s here. And so am I.'
];
function fakeCall() {
  const w = WPN('call');
  if (game.cool.call > 0) { toast('You just made that call. Give her a sec.'); return; }
  game.cool.call = w.cooldown;
  buzz('call');
  phoneFx(pick(CALL_LINES));
  let bailed = 0, frozen = 0;
  for (const c of game.chars) {
    if (c.state === 'ko' || c.state === 'bail' || c.kind === 'bystander' || !c.flagged) continue;
    const s = sc(c.y), v = VILLAINS[c.kind];
    if (c.kind === 'grabber') { c.stun = Math.max(c.stun, w.freeze); frozen++; floatText(c.x, c.y - 100 * s, 'Somebody\u2019s watching now.', '#FFF1E0'); continue; }
    if (c.kind === 'spiker' && c.state === 'leave') continue;   // already done his damage
    const save = c.kind === 'spiker';
    const pts = Math.round(v.points / 2) + (save ? Math.round(v.saveBonus / 2) : 0);
    game.score += pts; if (save) game.saves++;
    c.state = 'bail'; c.tx = c.x < W / 2 ? -40 : W + 40;
    S.tweens.killTweensOf(c.view.flag); c.view.flag.setVisible(false);
    floatText(c.x, c.y - 100 * s, (save ? 'SAVED HER ' : 'Scattered. ') + '+' + pts, save ? '#FF4F9A' : '#F4B942');
    bailed++;
  }
  if (!bailed && !frozen) floatText(W / 2, playerY - 90, 'Nobody to spook', '#FFF1E0');
  checkUnlocks();
}
function phoneFx(line) {
  const x = W / 2, y = playerY - 40;
  const phone = S.add.text(x, y, '📱', { fontSize:'34px', resolution:TEXT_RES }).setOrigin(0.5).setDepth(9600);
  const bubble = S.add.text(x, y - 44, line, { fontFamily:'Rubik, system-ui, sans-serif', fontStyle:'800', fontSize:'15px', color:'#1A0E1D',
    backgroundColor:'#FFF1E0', padding:{ x:10, y:6 }, align:'center', wordWrap:{ width:Math.min(260, W - 40) }, resolution:TEXT_RES })
    .setOrigin(0.5, 1).setDepth(9600).setAlpha(0);
  if (!reduceMotion) S.tweens.add({ targets:phone, angle:{ from:-14, to:14 }, duration:70, yoyo:true, repeat:5 });
  S.tweens.add({ targets:bubble, alpha:1, delay:450, duration:150 });
  S.tweens.add({ targets:[phone, bubble], alpha:0, delay:2000, duration:350, onComplete:() => { phone.destroy(); bubble.destroy(); } });
}

function checkUnlocks() {
  for (const w of WEAPONS) {
    if (!game.unlocked.has(w.id) && game.score >= w.unlock) { game.unlocked.add(w.id); toast(w.name + ' unlocked. ' + w.hint); renderBar(); }
  }
}
function floatText(x, y, text, color, big) {
  const t = S.add.text(x, y, text, { fontFamily:'Rubik, system-ui, sans-serif', fontStyle:'800', fontSize:(big ? 24 : 15) + 'px',
    color, stroke:'rgba(26,14,29,0.85)', strokeThickness:4, resolution:TEXT_RES }).setOrigin(0.5).setDepth(9500);
  const life = big ? 1300 : 900;
  S.tweens.add({ targets:t, y:y - (big ? 26 : 36), duration:life });
  S.tweens.add({ targets:t, alpha:0, delay:life * 0.35, duration:life * 0.65, onComplete:() => t.destroy() });
}

/* ---------- run lifecycle (called from ui.js) ---------- */
function newGame() {
  if (game) for (const c of game.chars) if (c.view && c.view.active) c.view.destroy();
  game = { score:0, hearts:CONFIG.hearts, time:CONFIG.levelSeconds, chars:[], streaks:[],
    spawnT:0.6, combo:0, kos:0, saves:0, cool:{}, unlocked:new Set(['keys']), events:[], faced:new Set(), used:new Set(), t:0, spraying:0, sprayAng:0 };
  drinks.forEach(d => { d.spiked = false; d.resetT = 0; });
  selected = 0; renderBar(); updateHUD();
}

/* ---------- per-frame logic ---------- */
function step(dt) {
  const g = game;
  g.t += dt; g.time -= dt;
  if (g.time <= 0) { g.time = 0; endGame(true); return; }
  const prog = 1 - g.time / CONFIG.levelSeconds, depth = playerY - horizonY;
  g.spawnT -= dt;
  if (g.spawnT <= 0) { spawn(); g.spawnT = rand(0.8, 1.2) * (1.7 - 0.95 * prog); }
  for (const d of drinks) if (d.spiked) { d.resetT -= dt; if (d.resetT <= 0) d.spiked = false; }

  for (const c of g.chars) {
    if (state !== 'play') break;
    c.hitCool = Math.max(0, c.hitCool - dt);
    if (c.bombT > 0) c.bombT -= dt;
    if (c.state === 'ko') continue;
    if (c.stun > 0) { c.stun -= dt; continue; }
    if (c.kind === 'bystander') {
      c.life -= dt;
      if (c.life <= 0) {
        if (c.state !== 'leave') { c.state = 'leave'; c.tx = c.x < W / 2 ? -40 : W + 40; }
        if (moveToward(c, c.tx, c.y, 0.08 * W, dt)) c.gone = true;
      } else if (moveToward(c, c.tx, c.ty, 0.07 * W, dt)) { c.tx = rand(0.1, 0.9) * W; c.ty = horizonY + rand(0.06, 0.55) * depth; }
      continue;
    }
    if (c.state === 'bail') { if (moveToward(c, c.tx, c.y, 0.3 * W, dt)) c.gone = true; continue; }
    const v = VILLAINS[c.kind];
    if (!c.flagged) {
      c.tellT -= dt;
      if (moveToward(c, c.tx, c.ty, 0.07 * W, dt)) { c.tx = rand(0.12, 0.88) * W; c.ty = horizonY + rand(0.06, 0.4) * depth; }
      if (c.tellT <= 0) flag(c);
      continue;
    }
    if (c.kind === 'follower') {
      if (moveToward(c, W / 2 + (c.x < W / 2 ? -30 : 30), playerY, v.speed * slowMult(c) * depth, dt)) { c.gone = true; hurt('He followed you home.'); }
    } else if (c.kind === 'grabber') {
      if (c.state === 'windup') { c.windup -= dt; if (c.windup <= 0) c.state = 'lunge'; }
      else if (moveToward(c, W / 2, playerY, v.speed * slowMult(c) * depth, dt)) { c.gone = true; hurt('He put his hands on you.'); }
    } else if (c.kind === 'spiker') {
      const d = drinks[c.drink];
      if (c.state === 'spiking') {
        c.spikeT -= dt;
        if (c.spikeT <= 0) { d.spiked = true; d.resetT = 4; c.state = 'leave'; c.tx = c.x < W / 2 ? -40 : W + 40; hurt('He got something in her drink.'); }
      } else if (c.state === 'leave') { if (moveToward(c, c.tx, c.y, 0.1 * W, dt)) c.gone = true; }
      else if (moveToward(c, d.x + 18, horizonY + 10, v.speed * slowMult(c) * W, dt)) { c.state = 'spiking'; c.spikeT = v.spikeTime; }
    }
  }
  for (const c of g.chars) if (c.gone && c.view.active) c.view.destroy();
  g.chars = g.chars.filter(c => !c.gone && !c.dead);

  const w = WEAPONS[selected];
  if (pointer.down && state === 'play') {
    if (w.mode === 'cone') sprayTick(dt);
  }
  for (const k in g.cool) g.cool[k] = Math.max(0, g.cool[k] - dt);
}

// Push logic state onto the Phaser objects.
function syncViews() {
  for (const c of game.chars) {
    if (c.state === 'ko') continue;
    const s = sc(c.y), v = c.view;
    const shake = c.state === 'windup' && !reduceMotion ? Math.sin(game.t * 60) * 2.2 : 0;
    v.setPosition(c.x + shake, c.y).setScale(s).setDepth(c.y);
    setArms(v, c.bombT > 0 ? 'wipe' : c.state === 'lunge' ? 'grab' : (c.kind === 'spiker' && c.flagged && (c.state === 'act' || c.state === 'spiking')) ? 'vial' : 'down');
    v.stunFx.setVisible(c.stun > 0);
    if (c.tagged) v.sparkles.forEach((p, i) => { const a = game.t * 3 + i * 1.26; p.setVisible(true).setPosition(Math.cos(a) * 20, -50 + Math.sin(a) * 28); });
  }
}

function drawFx() {
  const f = S.fxLayer, g = game;
  f.clear();
  if (!g) return;
  const dtFade = S.game.loop.delta / 1000;
  if (g.spraying > 0) {
    const o = origin(), range = (playerY - horizonY) * 0.75 + 40, half = 0.26;
    f.fillStyle(COLORS.pepper, 0.18).slice(o.x, o.y, range, g.sprayAng - half, g.sprayAng + half).fillPath();
    f.fillStyle(COLORS.pepper, 0.18).slice(o.x, o.y, range * 0.5, g.sprayAng - half, g.sprayAng + half).fillPath();
    g.spraying = Math.max(0, g.spraying - dtFade);
  }
  for (const s of g.streaks) {
    f.lineStyle(s.star ? 3 : 2, s.color, clamp(s.life / 0.15, 0, 1));
    if (s.star) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; f.lineBetween(s.x2 + Math.cos(a) * 6, s.y2 + Math.sin(a) * 6, s.x2 + Math.cos(a) * 16, s.y2 + Math.sin(a) * 16); }
    else f.lineBetween(s.x1, s.y1, s.x2, s.y2);
    s.life -= dtFade;
  }
  g.streaks = g.streaks.filter(s => s.life > 0);
}

/* ---------- the bar ---------- */
function drawRoom() {
  const r = S.room;
  r.clear();
  r.fillGradientStyle(0x1F1024, 0x1F1024, 0x3F2446, 0x3F2446, 1).fillRect(-10, -10, W + 20, horizonY + 10);
  const shelves = [counterTop - horizonY * 0.34, counterTop - horizonY * 0.14];
  r.fillStyle(0x5a3322, 1); shelves.forEach(y => r.fillRect(W * 0.06, y, W * 0.88, 4));
  for (const b of bottles) {
    const x = W * 0.08 + b.x * W * 0.84, y = shelves[b.row];
    r.fillStyle(b.c, 0.8).fillRect(x - 4, y - b.h, 8, b.h).fillRect(x - 1.5, y - b.h - 7, 3, 7);
  }
  for (const lx of [0.2, 0.5, 0.8]) {
    const x = W * lx, ly = horizonY * 0.1;
    r.lineStyle(2, 0x120a14, 1).lineBetween(x, 0, x, ly);
    r.fillStyle(COLORS.amber, 1).fillCircle(x, ly + 4, 5);
  }
  r.fillGradientStyle(0x2A1530, 0x2A1530, 0x120914, 0x120914, 1).fillRect(-10, horizonY, W + 20, H - horizonY + 10);
  r.lineStyle(1, COLORS.cream, 0.05);
  for (let i = -10; i <= 10; i++) r.lineBetween(W / 2 + i * W * 0.06, horizonY, W / 2 + i * W * 0.22, H);
  r.fillStyle(0x6B3822, 1).fillRect(-10, counterTop, W + 20, horizonY - counterTop);
  r.fillStyle(0xA2603A, 1).fillRect(-10, counterTop, W + 20, 5);
  r.fillStyle(0x000000, 0.18);
  for (let x = 0; x < W; x += 48) r.fillRect(x, counterTop + 9, 2, horizonY - counterTop - 9);
  drinks.forEach((d, i) => r.fillStyle(0x3a2020, 1).fillRect(d.x - 26, horizonY - 8, 12, 10));

  S.glows.forEach((gl, i) => gl.setPosition(W * [0.2, 0.5, 0.8][i], horizonY * 0.1).setDisplaySize(W * 0.5, W * 0.5));
  S.neon.setPosition(W / 2, horizonY * 0.3).setFontSize(Math.round(clamp(W * 0.075, 22, 44)) + 'px');
  S.patronViews.forEach((v, i) => v.setPosition(drinks[i].x - 20, horizonY + 2).setScale(0.5));
}
function drawDrinks() {
  const g = S.drinkLayer, t = S.time.now / 1000;
  g.clear();
  drinks.forEach(d => {
    const gx = d.x + 8, gy = counterTop;
    g.fillStyle(COLORS.cream, 0.55).fillPoints([{x:gx-7,y:gy-18},{x:gx+7,y:gy-18},{x:gx+4,y:gy},{x:gx-4,y:gy}], true);
    g.fillStyle(d.spiked ? COLORS.spiked : COLORS.amber, 1).fillPoints([{x:gx-5.5,y:gy-12},{x:gx+5.5,y:gy-12},{x:gx+3.5,y:gy-1},{x:gx-3.5,y:gy-1}], true);
    if (d.spiked) g.fillStyle(COLORS.spiked, 1).fillCircle(gx + 2, gy - 22 - ((t * 20) % 8), 1.8);
  });
}
function layout() {
  const old = W ? { W, horizonY, depth:playerY - horizonY } : null;
  W = window.innerWidth; H = window.innerHeight;
  const barH = $('bar').offsetHeight || 70;
  horizonY = Math.round(H * 0.34); playerY = H - barH - 12; counterTop = horizonY - 46;
  // Keep people in the same relative spot on the floor when the screen rotates or resizes.
  if (old && game) {
    const fx = W / old.W, fy = (playerY - horizonY) / old.depth;
    for (const c of game.chars) {
      c.x *= fx; c.tx *= fx;
      c.y = horizonY + (c.y - old.horizonY) * fy;
      c.ty = horizonY + (c.ty - old.horizonY) * fy;
    }
  }
  drinks.forEach((d, i) => d.x = W * (0.22 + 0.28 * i));
  drawRoom();
}

class BarScene extends Phaser.Scene {
  constructor() { super('bar'); }

  create() {
    S = this;
    // Textures made in code, so the game still needs no image files.
    const dot = this.add.graphics().fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
    dot.generateTexture('dot', 8, 8); dot.destroy();
    const glow = this.textures.createCanvas('glow', 128, 128), gctx = glow.getContext();
    const rg = gctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    rg.addColorStop(0, 'rgba(244,185,66,.3)'); rg.addColorStop(1, 'rgba(244,185,66,0)');
    gctx.fillStyle = rg; gctx.fillRect(0, 0, 128, 128); glow.refresh();

    this.room = this.add.graphics().setDepth(-1000);
    this.glows = [0,1,2].map(() => this.add.image(0, 0, 'glow').setDepth(-990).setBlendMode(Phaser.BlendModes.ADD));
    this.neon = this.add.text(0, 0, 'LAST CALL', { fontFamily:"Bungee, 'Arial Black', Impact, sans-serif", fontSize:'32px', color:'#FF4F9A', resolution:TEXT_RES })
      .setOrigin(0.5).setShadow(0, 0, '#FF4F9A', 20, false, true).setDepth(-980);
    this.drinkLayer = this.add.graphics().setDepth(-970);
    this.patronViews = patrons.map(p => makePersonView(p, true).setDepth(-960));
    this.fxLayer = this.add.graphics().setDepth(8000);

    const base = { lifespan:{ min:300, max:600 }, speed:{ min:80, max:220 }, gravityY:380, scale:{ start:0.5, end:0.1 }, emitting:false };
    this.fx = {
      sparks: this.add.particles(0, 0, 'dot', { ...base, tint:COLORS.cream }).setDepth(8500),
      gold: this.add.particles(0, 0, 'dot', { ...base, tint:COLORS.amber }).setDepth(8500),
      glitter: this.add.particles(0, 0, 'dot', { lifespan:{ min:600, max:1100 }, speed:{ min:60, max:260 }, gravityY:380,
        scale:{ start:0.5, end:0.2 }, tint:[COLORS.neon, COLORS.amber, COLORS.cream, 0xB478FF], emitting:false }).setDepth(8500),
      glitterRain: this.add.particles(0, 0, 'dot', { lifespan:{ min:500, max:900 }, speed:{ min:20, max:110 }, angle:{ min:60, max:120 },
        gravityY:420, scale:{ start:0.4, end:0.15 }, tint:[COLORS.neon, COLORS.amber, COLORS.cream, 0xB478FF, 0x6BE4FF], emitting:false }).setDepth(8500),
      spray: this.add.particles(0, 0, 'dot', { lifespan:400, speed:{ min:320, max:520 },
        angle:{ onEmit:() => Phaser.Math.RadToDeg(game ? game.sprayAng : 0) + rand(-15, 15) },
        scale:{ start:1.5, end:0.8 }, alpha:{ start:0.5, end:0 }, tint:COLORS.pepper, emitting:false }).setDepth(8400)
    };

    this.cameras.main.setOrigin(0, 0).setZoom(DPR);
    layout();
    window.addEventListener('resize', () => { this.scale.resize(window.innerWidth * DPR, window.innerHeight * DPR); layout(); });
    if (document.fonts) document.fonts.ready.then(() => { this.neon.setFontFamily("Bungee, 'Arial Black', Impact, sans-serif"); layout(); });

    this.input.on('pointerdown', p => {
      if (state !== 'play') return;
      pointer.x = p.worldX; pointer.y = p.worldY; pointer.down = true;
      const w = WEAPONS[selected];
      game.used.add(w.id);
      if (w.mode === 'tap') useKeys(); else if (w.mode === 'mark') useLipstick(); else if (w.mode === 'area') useGlitter(); else if (w.mode === 'call') fakeCall();
    });
    this.input.on('pointermove', p => { pointer.x = p.worldX; pointer.y = p.worldY; });
    this.input.on('pointerup', () => pointer.down = false);
    this.input.on('pointerupoutside', () => pointer.down = false);
    this.input.on('gameout', () => pointer.down = false);
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    const flick = reduceMotion ? 1 : (Math.sin(time / 1000 * 7) + Math.sin(time / 1000 * 23) > 1.85 ? 0.35 : 1);
    this.neon.setAlpha(flick);
    drawDrinks();
    if (game) {
      if (state === 'play') { step(dt); updateHUD(); }
      syncViews();
    }
    drawFx();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1A0E1D',
  scale: { mode: Phaser.Scale.NONE, width: window.innerWidth * DPR, height: window.innerHeight * DPR, zoom: 1 / DPR },
  input: { activePointers: 1 },
  banner: false,
  scene: BarScene
});
