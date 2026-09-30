/* RedFlag: Level 1 (Last Call) on Phaser 4.
   Tuning (villains, weapons, causes, donations) is in src/data.js.
   Screens, HUD and the weapon bar are in src/ui.js, which owns the shared
   `game`, `state`, `selected`, `goldPin` and `pointer` variables. */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hex = s => parseInt(s.slice(1), 16);
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
// Blend two 0xRRGGBB colours, t from 0 (a) to 1 (b).
const lerpHex = (a, b, t) => {
  const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255;
  return (((ar + ((b >> 16 & 255) - ar) * t) | 0) << 16) | (((ag + ((b >> 8 & 255) - ag) * t) | 0) << 8) | (((ab + ((b & 255) - ab) * t) | 0));
};
const FLAG_OBVIOUS = hex((typeof FLAG !== 'undefined' && FLAG.obvious) || '#FF2E2A');
const FLAG_SUBTLE = hex((typeof FLAG !== 'undefined' && FLAG.subtle) || '#9E1B1B');
const FLAG_RANGE = (typeof FLAG !== 'undefined' && FLAG.subtlety) || [0.2, 0.85];

const COLORS = { ink:0x0C0714, amber:0xF4B942, neon:0xFF4F9A, cyan:0x3AE7FF, flag:0xFF2D4A, cream:0xEAF7FF, spiked:0x7CFF6B, pepper:0xFF8C3C };
// Dark noir jewel tones: bodies read as rim-lit silhouettes against the neon room.
// Bystanders wear softer everyday colours; villains wear one saturated colour per type (VILLAINS[kind].outfit).
const OUTFITS = ['#2BB59A','#7FB069','#C77DA5','#8899A6','#8C6A5D','#B07A4B','#E6E1D6','#5E8C9E','#C9C2B0','#A67C52'].map(hex);
const SKINS = ['#F1C7A5','#D9A07A','#A86B45','#7A4A2E','#E8B894','#5C3A24'].map(hex);
// Skin tones are dealt from a shuffled bag, one bag for villains and one for bystanders, instead of drawn at random.
// Random draws are fair on average but a 60-second run only has about a dozen villains, so luck alone could put
// most red flags on one tone. A bag deals every tone once before repeating, so no tone gets more than one villain
// more than any other in a run, and villains and bystanders share the same spread. Reset at the start of each run.
const skinBags = { villain:[], bystander:[] };
function shuffled(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function dealSkin(role) {
  const bag = skinBags[role];
  if (!bag.length) bag.push(...shuffled(SKINS));
  return bag.pop();
}
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

const sc = y => VIEW.minScale + (VIEW.maxScale - VIEW.minScale) * clamp((y - horizonY) / (playerY - horizonY), 0, 1);
// How much bigger the bar is drawn than the original half-size layout (people at the counter were 0.5).
const barK = () => sc(horizonY) / 0.5;
// Top of a friend's head at the counter, in screen y. Her bar, label and speech bubble stack above it.
const friendHeadY = () => horizonY - 82 * sc(horizonY);
const origin = () => ({ x:W / 2, y:playerY + 14 });
const WPN = id => WEAPONS.find(w => w.id === id);
const dmgMult = c => (c.tagged || c.marked) ? 2 : 1;   // glitter-bombed or lipstick-marked
const slowMult = c => c.marked ? 0.65 : 1;   // lipstick marks are retired; kept so old code paths stay safe

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
  // Neon rim light around the silhouette.
  body.lineStyle(1.3, COLORS.cyan, 0.85);
  if (p.male) body.strokeRoundedRect(-15, -62, 30, 38, 5); else body.strokeRoundedRect(-12, -62, 24, 38, 9);
  body.strokeCircle(0, -72, 10);
  const torso = S.add.graphics();   // recoloured for crews; empty otherwise
  v.add([g, arms, body, torso]);
  v.torso = torso;
  v.arms = arms; v.armPose = null; v.person = p;
  setArms(v, 'down');
  return v;
}
// The red flag worn on the chest, shown when a villain makes his move. A container
// pinned at the pole so it can flutter (scaleX) without drifting. subtlety 0..1: bigger
// and brighter at 0, smaller and darker at 1.
function makeFlag(subtlety) {
  const t = clamp(subtlety, 0, 1), k = 1.2 - 0.5 * t, col = lerpHex(FLAG_OBVIOUS, FLAG_SUBTLE, t);
  const c = S.add.container(-3, -50).setVisible(false);
  const g = S.add.graphics();
  g.lineStyle(2 * k, 0x2c1a12, 1).lineBetween(0, 8 * k, 0, -9 * k);       // short pole on the chest
  g.fillStyle(col, 1).fillTriangle(0, -9 * k, 13 * k, -5 * k, 0, -1 * k); // the pennant
  if (t < 0.4) g.lineStyle(1, COLORS.cream, 0.9).strokeTriangle(0, -9 * k, 13 * k, -5 * k, 0, -1 * k); // obvious ones get an outline
  c.add(g);
  c.wave = t < 0.5;
  return c;
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
    outfit:(VILLAINS[kind] && VILLAINS[kind].outfit) ? hex(VILLAINS[kind].outfit) : pick(OUTFITS), skin:dealSkin(kind === 'bystander' ? 'bystander' : 'villain'), hair:pick(HAIRS),
    state:'wander', tx:rand(0.12, 0.88) * W, ty:horizonY + rand(0.06, 0.45) * depth,
    hitCool:0, stun:0, flagged:false, tagged:false, life:rand(6, 10) };
  c.male = kind === 'bystander' ? Math.random() < LOOKS.bystanderMaleChance : Math.random() >= LOOKS.villainFemaleChance;
  c.beard = c.male && Math.random() < LOOKS.beardChance;
  if (kind !== 'bystander') { const v = VILLAINS[kind]; c.hp = v.hp; c.tellT = rand(v.tell[0], v.tell[1]); c.subtlety = rand(...(v.subtlety || FLAG_RANGE)); }
  else c.subtlety = 0.5;

  const view = makePersonView(c, false);
  view.stunFx = S.add.circle(0, -70, 16, COLORS.pepper, 0.35).setVisible(false);
  view.flag = makeFlag(c.subtlety);
  view.sparkles = [0,1,2,3,4].map(i => S.add.circle(0, 0, 2.5, i % 2 ? COLORS.neon : COLORS.amber).setVisible(false));
  view.add([view.stunFx, view.flag, ...view.sparkles]);
  c.view = view;
  if (kind === 'bystander') c.helper = new Bystander(S, view, pickAbility());
  return c;
}
function spawn() {
  const g = game;
  const stageAt = k => (typeof STAGES !== 'undefined' && STAGES[k]) || 0;
  const open = k => k === 'bystander' || g.t >= stageAt(k);   // not before its stage
  // Each type is due a couple of seconds after its stage starts, so the pacing doesn't depend on luck or a crowded room.
  const due = Object.keys(STAGES || {}).find(k => !g.introSeen.has(k) && !g.spawned.has(k) && g.t >= stageAt(k) + 2);
  if (!due && g.chars.filter(c => c.state !== 'ko').length >= 9) return;
  const pool = Object.keys(SPAWN_WEIGHTS).filter(open);
  let r = Math.random() * pool.reduce((s, k) => s + SPAWN_WEIGHTS[k], 0), kind = 'bystander';
  for (const k of pool) { r -= SPAWN_WEIGHTS[k]; if (r <= 0) { kind = k; break; } }
  if (due) kind = due;
  if (kind === 'spiker' && g.chars.filter(c => c.kind === 'spiker' && c.state !== 'ko').length >= 2) kind = open('follower') ? 'follower' : 'bystander';
  g.chars.push(makeChar(kind));
  if (kind !== 'bystander') g.spawned.add(kind);
  if (kind !== 'bystander' && !g.introSeen.has(kind)) { g.introSeen.add(kind); maybeCard('creep-' + kind, INTRO.everyRun); }
}
function moveToward(c, tx, ty, sp, dt) {
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
  if (Math.abs(dx) > 0.5) c.dir = dx < 0 ? -1 : 1;
  if (d <= sp * dt || d < 1) { c.x = tx; c.y = ty; return true; }
  c.x += dx / d * sp * dt; c.y += dy / d * sp * dt; return false;
}
const FLAG_LINES = {
  spiker:   'The Spiker is heading for her drink. Stop him first.',
  follower: 'The Follower is trailing her. Stop him.',
  grabber:  'The Grabber is about to lunge. Stop him now.'
};
function narrateFlag(c) {
  const v = VILLAINS[c.kind], g = game;
  if (!v || !FLAG_LINES[c.kind] || (g.narrFlagAt && g.t - g.narrFlagAt < 4)) return;
  g.narrFlagAt = g.t;
  narrate((v.icon ? v.icon + ' ' : '') + FLAG_LINES[c.kind]);
}
function flag(c) {
  if (c.flagged) return;
  if (c.crew && c.crew.isActive) return;   // a linked crew member can't be forced to flag early
  c.flagged = true;
  narrateFlag(c);
  if (game.chars.filter(isThreat).length >= 2) maybeCard('ask');
  const fl = c.view.flag; fl.setVisible(true);
  if (fl.wave && !reduceMotion) S.tweens.add({ targets:fl, scaleX:0.72, duration:200, yoyo:true, repeat:-1 });
  // Say what the flag means, once per villain type per run. Keeps the screen quiet after the first time.
  const tellText = VILLAINS[c.kind].tellText;
  if (tellText && !game.seenTells.has(c.kind)) {
    game.seenTells.add(c.kind);
    floatText(c.x, c.y - 128 * sc(c.y), tellText, '#FF8A80');
  }
  if (c.kind !== 'spiker') c.target = weakestFriend();   // Followers and Grabbers go for whoever's had the worst night
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
// as a fallback. iOS only plays it when the click happens inside a real touch event handler.
// Phaser handles taps a frame later (outside that window), so buzz() only marks a tick as pending
// and the native touch/pointer-up listener below plays it when the finger lifts.
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
let iosTick = null;
if (!canVibrate && /iP(hone|ad|od)/.test(navigator.userAgent)) {
  const label = document.createElement('label'), input = document.createElement('input');
  input.type = 'checkbox'; input.setAttribute('switch', '');
  label.appendChild(input);
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.appendChild(label);
  iosTick = label;
  ['pointerup', 'touchend', 'click'].forEach(ev => window.addEventListener(ev, () => {
    if (iosPending && performance.now() - iosPending < 500) iosTick.click();
    iosPending = 0;
  }, true));
}
let iosPending = 0;
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
    else if (iosTick) iosPending = performance.now();
  } catch (e) { /* haptics are a nice-to-have; never break the game over them */ }
}

function applyHit(c, dmg) {
  if (c.state === 'ko' || c.state === 'bail') return;
  const s = sc(c.y);
  if (c.kind === 'bystander') { if (c.hitCool > 0) return; c.hitCool = 1.2; game.bystanderHits++; hurtFriend(nearestFriend(c.x), FRIENDS.bystanderHit, 'That\u2019s just a girl trying to leave.', 'bystander'); return; }
  if (!c.flagged) {
    if (c.hitCool > 0) return;
    c.hitCool = 0.8; game.earlyHits++; game.score = Math.max(0, game.score - 50); game.combo = 0;
    floatText(c.x, c.y - 96 * s, 'Not yet. Wait for the flag. -50', '#FFF1E0'); return;
  }
  c.hp -= dmg * dmgMult(c);
  S.fx.sparks.explode(6, c.x, c.y - 50 * s);
  if (c.hp <= 0) ko(c, 'knee'); else buzz('hit');
}
// How each creep went down, for the result pop-up: knee, spray, call, help, plus glitter-bombed and friend saves.
function tally(k) { game.outcomes[k] = (game.outcomes[k] || 0) + 1; }
function ko(c, by = 'knee') {
  const v = VILLAINS[c.kind], s = sc(c.y);
  const save = c.kind === 'spiker' && c.state !== 'leave';
  c.state = 'ko'; game.kos++; game.combo++; game.faced.add(c.kind); game.kosBy[c.kind] = (game.kosBy[c.kind] || 0) + 1; tally(by);
  const mult = Math.min(4, 1 + Math.floor(game.combo / 3));
  let pts = v.points * mult;
  if (save) { pts += v.saveBonus; game.saves++; }
  game.score += pts;
  buzz(save ? 'save' : 'ko');
  floatText(c.x, c.y - 100 * s, (save ? 'SAVED HER +' : 'DOWN +') + pts, save ? '#FF4F9A' : '#F4B942');
  if (save) narrate('Saved.');
  S.fx.gold.explode(14, c.x, c.y - 50 * s);
  koBadge(c.x, c.y - 100 * s, s);
  c.view.stunFx.setVisible(false); c.view.sparkles.forEach(p => p.setVisible(false));
  S.tweens.killTweensOf(c.view.flag); c.view.flag.setVisible(false);
  S.tweens.add({ targets:c.view, angle:(c.dir || 1) * 80, alpha:0, duration:900, onComplete:() => { c.view.destroy(); c.dead = true; } });
  epilogueBeat(c, v, s);
  checkUnlocks();
}
function epilogueBeat(c, v, s) {
  if (!v.epilogue || !EPILOGUE.enabled) return;
  if (!reduceMotion) game.slowT = EPILOGUE.slowSeconds;   // brief slow-mo, the game keeps running
  if (game.seenEpi.has(c.kind)) return;                   // caption only the first takedown of each type per run
  game.seenEpi.add(c.kind);
  const t = S.add.text(clamp(c.x, W * 0.3, W * 0.7), c.y - 165 * s, (v.icon ? v.icon + ' ' : '') + v.name + '\n' + v.epilogue, { fontFamily:'Rubik, system-ui, sans-serif', fontStyle:'800', fontSize:'15px',
    color:'#FFF1E0', align:'center', wordWrap:{ width:Math.min(280, W * 0.7) }, stroke:'rgba(26,14,29,0.9)', strokeThickness:5, resolution:TEXT_RES }).setOrigin(0.5, 1).setDepth(9600);
  S.tweens.add({ targets:t, alpha:0, delay:EPILOGUE.captionMs * 0.6, duration:EPILOGUE.captionMs * 0.4, onComplete:() => t.destroy() });
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
/* ---------- friends ---------- */
// Your three friends at the counter are drinks[0..2]'s patrons. Friend i owns drink i.
// wellbeing is her comfort bar (0-100); it is the same name Crew.applyEffect('heal') writes to.
const makeFriends = () => {
  const ids = Object.keys(FRIEND_TRAITS).sort(() => Math.random() - 0.5);
  return drinks.map(d => ({ i:d.i, wellbeing:100, out:false, flashT:0, trait:FRIEND_TRAITS[ids[d.i % ids.length]] }));
};
const friendSpot = i => ({ x:drinks[i].x - 20, y:horizonY + Math.round(18 * barK()) });
// The friend who's had the worst night so far. Creeps go for her.
function weakestFriend() {
  const live = game.friends.filter(f => !f.out);
  const low = Math.min(...live.map(f => f.wellbeing));
  return pick(live.filter(f => f.wellbeing === low));
}
const nearestFriend = x => game.friends.reduce((b, f) => Math.abs(drinks[f.i].x - x) < Math.abs(drinks[b.i].x - x) ? f : b);
// A creep reached her (or her drink), or you hit a bystander. She loses comfort; at 0 she calls it a night.
// Nothing is shown happening: her bar drops, she flinches, and a line says who it happened to.
function hurtFriend(f, amount, msg, why) {
  if (state !== 'play' || f.out) return;
  f.wellbeing = Math.max(0, f.wellbeing - Math.round(amount * (f.trait ? f.trait.hitScale : 1))); f.flashT = 0.5; game.combo = 0;
  if (why) game.events.push(why);
  buzz('hurt');
  S.cameras.main.flash(350, 224, 48, 43, true);
  if (!reduceMotion) {
    S.cameras.main.shake(300, 0.008, true);
    const pv = S.patronViews[f.i];
    S.tweens.add({ targets:pv, angle:{ from:-6, to:6 }, duration:60, yoyo:true, repeat:3, onComplete:() => pv.setAngle(0) });
  }
  floatText(W / 2, H * 0.5, msg, '#FFF1E0', true);
  if (f.wellbeing <= 0) { f.out = true; endGame(false); return; }
  narrate('Your friend is shaken. Only hit flagged creeps.');
  if (f.wellbeing <= 66) maybeCard('youok');
}
// A short speech bubble over a friend's head.
function friendSays(f, text) {
  const x = drinks[f.i].x - 20;
  const t = S.add.text(x, friendHeadY() - 34, text, { fontFamily:'Rubik, system-ui, sans-serif', fontStyle:'800', fontSize:'12px', color:'#1A0E1D',
    backgroundColor:'#F4B942', padding:{ x:6, y:3 }, align:'center', wordWrap:{ width:150 }, resolution:TEXT_RES }).setOrigin(0.5, 1).setDepth(9400);
  t.x = clamp(x, t.width / 2 + 6, W - t.width / 2 - 6);
  S.tweens.add({ targets:t, alpha:0, delay:1300, duration:300, onComplete:() => t.destroy() });
}
// The nearest friend who pays attention spots a creep a moment before his flag and says so.
// A hint only: he isn't flagged yet, so hitting him now still costs points.
function noticeCheck(c) {
  if (c.noticed || game.simple) return;
  const live = game.friends.filter(f => !f.out && f.trait.notice > 0);
  if (!live.length) return;
  const f = live.reduce((b, o) => Math.abs(drinks[o.i].x - c.x) < Math.abs(drinks[b.i].x - c.x) ? o : b);
  if (c.tellT > f.trait.notice) return;
  c.noticed = true;
  maybeCard('callout');
  friendSays(f, pick(f.trait.lines));
  ringFx(c.x, c.y - 45 * sc(c.y), 30 * sc(c.y) + 8, COLORS.amber);
}
// A nervous friend now and then points at someone harmless, in the same words. So a callout is a reason to look, never proof.
function falseAlarm() {
  const fs = game.friends.filter(f => !f.out && f.trait.falseAlarm);
  const people = game.chars.filter(c => c.kind === 'bystander' && c.state === 'wander' && !c.assist && !c.gone);
  if (!fs.length || !people.length) return;
  // Whom she points at is balanced by skin tone too: always someone from the tone she's pointed at least, so a
  // run of false alarms can't keep landing on one group.
  const seen = game.alarmSkins, least = Math.min(...people.map(p => seen[p.skin] || 0));
  const f = pick(fs), c = pick(people.filter(p => (seen[p.skin] || 0) === least));
  seen[c.skin] = (seen[c.skin] || 0) + 1;
  maybeCard('callout');
  friendSays(f, pick(f.trait.lines));
  ringFx(c.x, c.y - 45 * sc(c.y), 30 * sc(c.y) + 8, COLORS.amber);
}
const friendCatches = f => Math.random() < f.trait.stepIn;
// An assertive friend handles it herself: he backs off, she loses nothing, and you get no points for it.
function friendShutsItDown(c, f, text) {
  game.selfSaves++; tally('friend');
  friendSays(f, 'Back off.');
  floatText(c.x, c.y - 100 * sc(c.y), text, '#7CFF6B');
  c.state = 'bail'; c.tx = c.x < W / 2 ? -40 : W + 40;
  S.tweens.killTweensOf(c.view.flag); c.view.flag.setVisible(false);
}
function healFriend(amount) {
  const live = game.friends.filter(f => !f.out && f.wellbeing < 100);
  if (!live.length) return null;
  const f = live.reduce((b, o) => o.wellbeing < b.wellbeing ? o : b);
  f.wellbeing = Math.min(100, f.wellbeing + amount);
  return f;
}
// Which friend, if any, is under a tap. Generous on purpose: fingers are bigger than a half-size patron.
function friendAt(px, py) {
  if (!game.friends) return null;
  let best = null, bd = Infinity;
  for (const f of game.friends) {
    if (f.out) continue;
    const cx = drinks[f.i].x - 20, dx = Math.abs(px - cx);
    if (dx < 36 * barK() && py > friendHeadY() - 24 && py < horizonY + 22 * barK() && dx < bd) { bd = dx; best = f; }
  }
  return best;
}
// Check in: tap a friend, ask if she's okay. Restores comfort but doesn't touch any creep, so it costs you a beat.
function useCheckIn() {
  const w = WPN('checkin'), f = friendAt(pointer.x, pointer.y);
  if (!f) { toast('Tap one of your friends at the bar.'); return; }
  const x = drinks[f.i].x - 20, y = friendHeadY() - 20;
  if (game.cool.checkin > 0) { floatText(x, y, 'Give her a sec.', '#FFF1E0'); return; }
  if (f.wellbeing >= 100) { floatText(x, y, 'She\u2019s good.', '#FFF1E0'); return; }
  game.cool.checkin = w.cooldown;
  f.wellbeing = Math.min(100, f.wellbeing + w.heal);
  game.checkins++; game.score += w.points; checkUnlocks();
  floatText(x, y - 46, '+' + w.points, '#F4B942');
  ringFx(x, horizonY - 40 * barK(), 34 * barK(), COLORS.spiked);
  buzz('tag');
  floatText(x, y - 24, 'You okay? \u2665', '#7CFF6B');
}

// Comfort bars over each friend's head: green when fine, amber, then red as it runs out.
function drawFriendBars(f) {
  if (!game.friends) return;
  for (const fr of game.friends) {
    const cx = drinks[fr.i].x - 20, y = friendHeadY() - 16, w = Math.round(29 * barK()), k = clamp(fr.wellbeing / 100, 0, 1);
    const col = k > 0.5 ? lerpHex(COLORS.amber, COLORS.spiked, (k - 0.5) * 2) : lerpHex(COLORS.flag, COLORS.amber, k * 2);
    if (fr.flashT > 0) fr.flashT -= S.game.loop.delta / 1000;
    f.fillStyle(0x000000, 0.55).fillRoundedRect(cx - w / 2 - 2, y - 2, w + 4, 9, 3);
    f.fillStyle(0x3A2A40, 1).fillRect(cx - w / 2, y, w, 5);
    f.fillStyle(col, 1).fillRect(cx - w / 2, y, w * k, 5);
    if (fr.flashT > 0) f.lineStyle(2, COLORS.cream, clamp(fr.flashT * 2, 0, 1)).strokeRoundedRect(cx - w / 2 - 2, y - 2, w + 4, 9, 3);
  }
}
function useKnee() {
  const w = WPN('knee');
  if (game.cool.knee > 0) return;
  game.cool.knee = w.cooldown;
  const c = charAt(pointer.x, pointer.y);
  game.streaks.push({ star:true, x2:pointer.x, y2:pointer.y, life:0.15, color:COLORS.cream });
  if (c) {
    const before = c.hp, wasFlagged = c.flagged;
    applyHit(c, w.dmg);
    if (c.kind !== 'bystander' && wasFlagged && before !== undefined) floatText(c.x, c.y - 96 * sc(c.y), 'OOF!', '#FFF1E0');
  }
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
    else { c.stun = 0.5; c.hp -= w.dps * dt * dmgMult(c); if (c.hp <= 0) ko(c, 'spray'); else buzz('hit'); }
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
  if (first) tally('glitter');
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
// A flagged creep gives up and walks off for half points (a Spiker who bails counts as a save).
function scareOff(c, by = 'help') {
  tally(by);
  const s = sc(c.y), v = VILLAINS[c.kind];
  const save = c.kind === 'spiker';
  const pts = Math.round(v.points / 2) + (save ? Math.round(v.saveBonus / 2) : 0);
  game.score += pts; if (save) game.saves++;
  c.state = 'bail'; c.tx = c.x < W / 2 ? -40 : W + 40;
  S.tweens.killTweensOf(c.view.flag); c.view.flag.setVisible(false);
  floatText(c.x, c.y - 100 * s, (save ? 'SAVED HER ' : 'Scattered. ') + '+' + pts, save ? '#FF4F9A' : '#F4B942');
  checkUnlocks();
}
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
    scareOff(c, 'call');
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

/* ---------- crews and bystander helpers ---------- */
// A crew is villains working together (CREW in data.js). While it's linked, none of them flags, so weapons
// can't touch them. Bystanders you ask for help break the link. If the plan runs out they all flag together
// and act as usual. If the link breaks they bolt. Nothing here shows anyone being separated or led anywhere.
// The engine is in src/crew.js and src/bystander.js. Here we only connect it to the bar.
CREW_TUNING.staffBreaks = false;          // in the real game, staff take a bite out of the link, not the whole thing
CREW_TUNING.staffHit = CREW.staffHit;

function pickAbility() {
  let r = Math.random();
  for (const k in HELPERS) { r -= HELPERS[k].weight; if (r <= 0) return k; }
  return Ability.DISTRACT;
}
const liveMembers = k => k.creeps.filter(c => c.state !== 'ko' && c.state !== 'bail' && !c.gone);
function nearestMember(k, c) {
  let best = null, bd = Infinity;
  for (const m of liveMembers(k)) { const d = Math.hypot(m.x - c.x, m.y - c.y); if (d < bd) { bd = d; best = m; } }
  return best;
}

function spawnCrew() {
  const g = game, depth = playerY - horizonY;
  if (g.chars.filter(c => c.state !== 'ko').length > 9 - CREW.size) return false;   // room is full; try again next frame
  const kinds = [...CREW.kinds].sort(() => Math.random() - 0.5).slice(0, CREW.size);
  const fromLeft = Math.random() < 0.5, y0 = horizonY + rand(0.1, 0.28) * depth;
  const members = kinds.map((kind, i) => {
    const c = makeChar(kind);
    c.x = fromLeft ? -24 - i * 46 : W + 24 + i * 46; c.y = y0 + (i % 2 ? 8 : -6); c.dir = fromLeft ? 1 : -1;
    c.off = { x:(i - (kinds.length - 1) / 2) * 58, y:i % 2 ? 10 : -6 };
    g.chars.push(c);
    return c;
  });
  // Seconds a fully linked plan takes at paceScale 1, so CREW.planSeconds can say what we actually want.
  const idle = PHASE_ORDER.reduce((a, p) => a + PHASE_DURATION[p], 0) / 1000 / (CREW_TUNING.planPace * 1.5);
  const friend = pick(g.friends.filter(f => !f.out));   // the friend this crew is after
  const crew = new Crew(S, members, friend, { depth:7000, paceScale:idle / CREW.planSeconds,
    anchor:c => ({ x:c.x, y:c.y - 55 * sc(c.y) }) });
  crew.gx = W * 0.5; crew.gy = horizonY + 0.2 * depth;   // where the group is wandering to
  crew.hud = S.add.text(0, 0, 'TEAM', { fontFamily:'Rubik, system-ui, sans-serif', fontStyle:'800', fontSize:'9px', color:'#FFF1E0',
    align:'right', lineSpacing:-2, resolution:TEXT_RES * 2 }).setOrigin(1, 0.5).setDepth(8001);
  for (const c of members) {
    c.crew = crew;
    c.view.tag = S.add.text(0, -90, 'weak to: ' + HELPERS[ROLE_WEAKNESS[c.role]].name, { fontFamily:'Rubik, system-ui, sans-serif',
      fontStyle:'800', fontSize:'11px', color:'#F4B942', stroke:'rgba(26,14,29,0.85)', strokeThickness:3, resolution:TEXT_RES * 2 }).setOrigin(0.5, 1);
    c.view.add(c.view.tag);
  }
  g.crew = crew; g.crewsMade++; g.focus = null;
  toast('Crew after your friend ' + FRIENDS.labels[friend.i] + '. Split them up.');
  if (!maybeCard('crew')) narrate('A crew: matching shirts, and they can\u2019t be hit yet. Pick Ask, then tap a bystander.', 5000);
  return true;
}
function killCrew(k) {
  k.destroy(); if (k.hud) k.hud.destroy();
  for (const c of k.creeps) { if (c.baseOutfit !== undefined && c.view && c.view.scene && c.state !== 'ko') { setOutfit(c, c.baseOutfit); c.view.torso.clear(); } c.crew = null; if (c.view && c.view.tag) { c.view.tag.destroy(); c.view.tag = null; } }
  if (game.crew === k) { game.crew = null; game.focus = null; }
}
function crewBroken(k) {
  const live = liveMembers(k);
  let pts = CREW.breakPoints, cx = 0, cy = 0;
  for (const c of live) {
    pts += Math.round(VILLAINS[c.kind].points / 2);
    cx += c.x / live.length; cy += (c.y - 100 * sc(c.y)) / live.length;
    c.state = 'bail'; c.tx = c.x < W / 2 ? -40 : W + 40;
  }
  game.score += pts; game.crewsBroken++;
  const x = live.length ? cx : W / 2, y = live.length ? cy : H * 0.4;
  buzz('save');
  floatText(x, y, 'CREW BROKEN +' + pts, '#F4B942', true);
  narrate('Crew broken. They\u2019re on their own now.');
  S.fx.gold.explode(20, x, y + 50);
  killCrew(k);
  checkUnlocks();
}
function crewSucceeds(k) {
  const members = liveMembers(k);
  let cx = 0, cy = 0;
  for (const c of members) { cx += c.x / members.length; cy += (c.y - 110 * sc(c.y)) / members.length; }
  killCrew(k);                                 // unlinks them, so flag() below goes through
  for (const c of members) {                   // they all flag together and go for the friend they were after
    flag(c);
    if (k.target.out) continue;
    if (c.kind === 'spiker') { if (!drinks[k.target.i].spiked) c.drink = k.target.i; }
    else c.target = k.target;
  }
  if (members.length) floatText(cx, cy, 'Their plan’s ready.', '#FF8A80');
}
function updateCrew(dt) {
  const k = game.crew;
  if (!k) return;
  k.update(dt * 1000);
  if (k.isActive && !k.target.out) {   // the closer the plan gets, the worse she feels, but never past the floor
    const floor = Math.min(k.target.wellbeing, CREW.drainFloor);
    k.target.wellbeing = Math.max(floor, k.target.wellbeing - CREW.drainPerSec * crewDanger(k) * dt);
  }
  if (k.phase === Phase.SUCCEEDED) crewSucceeds(k);
  else if (k.phase === Phase.BROKEN) crewBroken(k);
  else if (!liveMembers(k).length) killCrew(k);
}
// Linked members wander as a group and never flag on their own.
function groupWander(c, dt, depth) {
  const k = c.crew;
  if (moveToward(c, k.gx + c.off.x, k.gy + c.off.y, 0.07 * W, dt) && c === k.creeps[0]) {
    const spot = friendSpot(k.target.i), pull = 0.8 * k.planProgress;   // drift toward her as the plan advances
    k.gx = lerp(rand(0.18, 0.82) * W, spot.x, pull); k.gy = lerp(horizonY + rand(0.08, 0.4) * depth, spot.y + 30, pull);
  }
}

/* ---------- ask for help ---------- */
// Solo creeps a bystander could help with: flagged, still a threat, not part of a crew.
const isThreat = c => c && c.kind !== 'bystander' && c.flagged && !['ko', 'bail'].includes(c.state) && !c.gone && !(c.crew && c.crew.isActive);
function nearestThreat(from) {
  let best = null, bd = Infinity;
  for (const c of game.chars) { if (!isThreat(c)) continue; const d = Math.hypot(c.x - from.x, c.y - from.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function useAsk() {
  const c = charAt(pointer.x, pointer.y), k = game.crew;
  if (!c) return;
  const s = sc(c.y);
  if (c.kind !== 'bystander') {
    if ((k && c.crew === k) || isThreat(c)) {   // aim at this one
      game.focus = c;
      ringFx(c.x, c.y - 45 * s, 34 * s + 8, COLORS.amber);
      floatText(c.x, c.y - 150 * s, 'Now ask someone', '#FFF1E0');
    }
    return;
  }
  const h = c.helper;
  if (!h || c.assist) return;
  if (h.ability === Ability.DELAY && !game.friends.some(f => f.wellbeing < 100)) { floatText(c.x, c.y - 100 * s, 'No need yet.', '#FFF1E0'); return; }
  if (!k && h.ability !== Ability.DELAY && !nearestThreat(c)) { floatText(c.x, c.y - 100 * s, 'All quiet.', '#FFF1E0'); return; }
  h.specificAsk();
  const effect = h.tryAct(S.time.now);
  if (!effect) { floatText(c.x, c.y - 100 * s, 'Hang on…', '#FFF1E0'); return; }
  helperAct(c, effect);
}
// Help against one creep who isn't part of a crew.
function soloHelp(c, effect) {
  const h = c.helper, info = HELPERS[h.ability];
  const t = game.focus && isThreat(game.focus) ? game.focus : nearestThreat(c);
  game.focus = null;
  if (!t) return;
  const s = sc(t.y);
  const walk = { x:t.x + (c.x < t.x ? -48 : 48), y:t.y, t:2.4 };
  switch (h.ability) {
    case Ability.DIRECT:   scareOff(t); floatText(t.x, t.y - 118 * s, 'Scared off', '#7CFF6B'); break;
    case Ability.DISTRACT: t.stun = Math.max(t.stun, 2.5); floatText(t.x, t.y - 118 * s, 'Distracted', '#7CFF6B'); break;
    case Ability.DOCUMENT:
      t.marked = true; S.time.delayedCall(5000, () => { t.marked = false; });
      floatText(t.x, t.y - 118 * s, 'Filmed: slower, easier to hit', '#7CFF6B'); break;
    case Ability.DELEGATE:
      floatText(W / 2, H * 0.32, 'Staff on the way', '#FFF1E0');
      S.time.delayedCall(effect.arrivalMs, () => { if (isThreat(t)) { scareOff(t); floatText(t.x, t.y - 118 * sc(t.y), 'Staff stepped in', '#7CFF6B'); } });
      c.assist = { x:c.x < W / 2 ? -40 : W + 40, y:c.y, t:6, leave:true };
      return;
  }
  c.assist = walk;
}
function helperAct(c, effect) {
  const h = c.helper, info = HELPERS[h.ability], s = sc(c.y), k = game.crew;
  floatText(c.x, c.y - 100 * s, info.line, '#F4B942');
  narrate(k && k.isActive ? 'The ' + info.name + ' steps in. Watch the TEAM bar.' : 'The ' + info.name + ' steps in.');
  ringFx(c.x, c.y - 48 * s, 30 * s + 10, COLORS.amber);
  buzz('tag');
  if (effect.type === 'heal') {
    const healed = healFriend(effect.amount);
    floatText(W / 2, H * 0.5, healed ? 'Someone checked in on your friend ' + FRIENDS.labels[healed.i] + '.' : 'A friend checked in.', '#7CFF6B', true);
    c.assist = { x:c.x, y:c.y, t:1.2 };
    return;
  }
  if (!k || !k.isActive) { soloHelp(c, effect); return; }
  const target = game.focus && game.focus.crew === k && liveMembers(k).includes(game.focus) ? game.focus : nearestMember(k, c);
  if (!target) return;
  const match = ROLE_WEAKNESS[target.role] === h.ability;   // read before applyEffect, which clears roles if the crew breaks
  k.applyEffect(effect, target.role);
  if (effect.type === 'staff') {
    c.assist = { x:c.x < W / 2 ? -40 : W + 40, y:c.y, t:6, leave:true };
    floatText(W / 2, H * 0.32, 'Staff on the way', '#FFF1E0');
  } else c.assist = { x:target.x + (c.x < target.x ? -48 : 48), y:target.y, t:2.4 };
  if (match) floatText(target.x, target.y - 118 * sc(target.y), 'Good match', '#7CFF6B');
}
// The crew wears one shirt colour, and it reddens as the plan nears its end (calmer again as the team weakens).
function crewDanger(k) { return clamp(k.planProgress * (0.55 + 0.45 * k.cohesion / 100), 0, 1); }
function crewShirts(k) {
  const d = Math.round(crewDanger(k) * 16) / 16;
  const a = [0xF4, 0xEC, 0xDE], b = [0xB0, 0x10, 0x1A];
  const col = (a[0] + (b[0] - a[0]) * d << 16) | (a[1] + (b[1] - a[1]) * d << 8) | (a[2] + (b[2] - a[2]) * d);
  for (const c of liveMembers(k)) {
    if (c.outfit === col) continue;
    if (c.baseOutfit === undefined) c.baseOutfit = c.outfit;
    setOutfit(c, col);
  }
}
function setOutfit(c, col) {
  const v = c.view, pose = v.armPose;
  c.outfit = col;
  v.torso.clear().fillStyle(col, 1);
  if (c.male) v.torso.fillRoundedRect(-15, -62, 30, 38, 5).lineStyle(1.3, COLORS.cyan, 0.85).strokeRoundedRect(-15, -62, 30, 38, 5);
  else v.torso.fillRoundedRect(-12, -62, 24, 38, 9).lineStyle(1.3, COLORS.cyan, 0.85).strokeRoundedRect(-12, -62, 24, 38, 9);
  v.armPose = null; setArms(v, pose || 'down');
}
function drawCrewHud(f) {
  const k = game.crew;
  if (!k || !k.isActive) return;
  const live = liveMembers(k);
  if (!live.length) return;
  let cx = 0, top = Infinity;
  for (const c of live) { cx += c.x / live.length; top = Math.min(top, c.y - 104 * sc(c.y)); }
  const w = 70, x = cx - w / 2 + 16, y = top - 28;
  f.fillStyle(0x000000, 0.45).fillRoundedRect(x - 2, y - 3, w + 4, 12, 4);
  f.fillStyle(0x3A2A40, 1).fillRect(x, y, w, 6);
  f.fillStyle(COLORS.cream, 1).fillRect(x, y, w * clamp(k.cohesion / 100, 0, 1), 6);
  k.hud.setVisible(true).setPosition(x - 5, y + 3);
  crewShirts(k);
  if (!k.target.out) {   // a red ring under the friend they're after
    const fx = drinks[k.target.i].x - 20, pulse = 0.55 + 0.35 * Math.sin(S.time.now / 220);
    f.lineStyle(2, COLORS.flag, pulse).strokeEllipse(fx, horizonY + 8 * barK(), 40 * barK(), 12 * barK());
  }
  const t = game.focus;
  if (t && t.crew === k && liveMembers(k).includes(t)) {
    const s = sc(t.y);
    f.lineStyle(2, COLORS.amber, 0.95).strokeEllipse(t.x, t.y + 2, 50 * s, 15 * s);
  }
}

function checkUnlocks() {
  for (const w of WEAPONS) {
    if ((game.simple && !EASY.tools.includes(w.id)) || toolHidden(w)) continue;
    if (!game.unlocked.has(w.id) && game.score >= w.unlock) { game.unlocked.add(w.id); toast(w.name + ' unlocked.'); if (!maybeCard('unlock-' + w.id)) narrate(w.name + ': ' + w.hint, 4000); renderBar(); }
  }
}
function floatText(x, y, text, color, big) {
  const t = S.add.text(x, y, text, { fontFamily:'Rubik, system-ui, sans-serif', fontStyle:'800', fontSize:(big ? 24 : 15) + 'px',
    color, stroke:'rgba(26,14,29,0.85)', strokeThickness:4, resolution:TEXT_RES }).setOrigin(0.5).setDepth(9500);
  t.x = Phaser.Math.Clamp(x, t.width / 2 + 6, W - t.width / 2 - 6);   // stay on screen when someone walks in from the edge
  const life = big ? 1300 : 900;
  S.tweens.add({ targets:t, y:y - (big ? 26 : 36), duration:life });
  S.tweens.add({ targets:t, alpha:0, delay:life * 0.35, duration:life * 0.65, onComplete:() => t.destroy() });
}

/* ---------- run lifecycle (called from ui.js) ---------- */
function newGame() {
  if (game) {
    for (const c of game.chars) if (c.view && c.view.active) c.view.destroy();
    if (game.crew) killCrew(game.crew);
  }
  skinBags.villain.length = 0; skinBags.bystander.length = 0;
  game = { score:0, kosBy:{}, outcomes:{}, checkins:0, earlyHits:0, bystanderHits:0, friends:makeFriends(), selfSaves:0, alarmSkins:{}, alarmT:firstRun() ? 1e9 : rand(FRIENDS.falseAlarmEvery[0], FRIENDS.falseAlarmEvery[1]), simple:firstRun(), time:CONFIG.levelSeconds, chars:[], streaks:[],
    spawnT:0.6, combo:0, kos:0, saves:0, cool:{}, unlocked:new Set(['knee', 'ask', 'checkin']), events:[], faced:new Set(), seenEpi:new Set(), slowT:0, used:new Set(), seenTells:new Set(), introSeen:new Set(), spawned:new Set(), beats:{}, narrFlagAt:0, t:0, spraying:0, sprayAng:0,
    crew:null, crewsMade:0, crewsBroken:0, focus:null, nextCrewAt:rand(CREW.firstAt[0], CREW.firstAt[1]) };
  drinks.forEach(d => { d.spiked = false; d.resetT = 0; });
  selected = Math.max(0, WEAPONS.findIndex(w => w.id === 'knee')); renderBar(); updateHUD();
}

/* ---------- per-frame logic ---------- */
function step(dt) {
  const g = game;
  g.t += dt; g.time -= dt;
  if (g.time <= 0) { g.time = 0; endGame(true); return; }
  for (const [at, line] of [[40, 'Forty seconds to closing.'], [20, 'Twenty seconds. Guard her drink.'], [10, 'Ten seconds. Almost home.']])
    if (g.time <= at && !g.beats[at]) { g.beats[at] = true; narrate(line, 2500); }
  const prog = 1 - g.time / CONFIG.levelSeconds, depth = playerY - horizonY;
  const pace = PACE.start + (PACE.end - PACE.start) * prog;   // creeps start slow and speed up as the night goes on
  g.spawnT -= dt;
  const crewDue = CREW.enabled && !g.crew && g.crewsMade < CREW.maxPerRun && g.t >= g.nextCrewAt && g.time >= CREW.minTimeLeft;
  if (g.spawnT <= 0 && !crewDue) { spawn(); g.spawnT = rand(0.8, 1.2) * (1.7 - 0.95 * prog); }
  for (const d of drinks) if (d.spiked) { d.resetT -= dt; if (d.resetT <= 0) d.spiked = false; }
  g.alarmT -= dt; if (g.alarmT <= 0) { g.alarmT = rand(FRIENDS.falseAlarmEvery[0], FRIENDS.falseAlarmEvery[1]); falseAlarm(); }

  // Crew: shows up once per run, a while in, if there's time for it to play out.
  if (crewDue) spawnCrew();   // if the room is full this waits, and ordinary spawns are paused so it clears
  const helpers = g.chars.filter(c => c.helper && c.state !== 'ko').map(c => c.helper);
  for (const h of helpers) h.update(dt, helpers);
  updateCrew(dt);

  for (const c of g.chars) {
    if (state !== 'play') break;
    c.hitCool = Math.max(0, c.hitCool - dt);
    if (c.bombT > 0) c.bombT -= dt;
    if (c.state === 'ko') continue;
    if (c.stun > 0) { c.stun -= dt; continue; }
    if (c.kind === 'bystander') {
      if (c.assist) {                           // stepping in to help: walk over, hold, then wander again
        const a = c.assist; a.t -= dt;
        const arrived = moveToward(c, a.x, a.y, 0.22 * W, dt);
        if (a.leave && arrived) c.gone = true;
        if (a.t <= 0) { c.assist = null; c.tx = rand(0.1, 0.9) * W; c.ty = horizonY + rand(0.06, 0.55) * depth; }
        continue;
      }
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
      if (c.crew) { groupWander(c, dt, depth); continue; }   // linked: waits with the crew, never flags alone
      c.tellT -= dt;
      noticeCheck(c);
      if (moveToward(c, c.tx, c.ty, 0.07 * W, dt)) { c.tx = rand(0.12, 0.88) * W; c.ty = horizonY + rand(0.06, 0.4) * depth; }
      if (c.tellT <= 0) flag(c);
      continue;
    }
    if (c.kind === 'follower') {
      const spot = friendSpot(c.target.i);
      if (moveToward(c, spot.x + (c.x < spot.x ? -34 : 34), spot.y, v.speed * pace * slowMult(c) * depth * FRIENDS.approachScale, dt)) {
        if (friendCatches(c.target)) friendShutsItDown(c, c.target, 'She told him to leave.');
        else { c.gone = true; hurtFriend(c.target, v.hit, v.reachedText, 'followed'); }
      }
    } else if (c.kind === 'grabber') {
      if (c.state === 'windup') { c.windup -= dt; if (c.windup <= 0) c.state = 'lunge'; }
      else {
        const spot = friendSpot(c.target.i);
        if (moveToward(c, spot.x + (c.x < spot.x ? -30 : 30), spot.y, v.speed * pace * slowMult(c) * depth * FRIENDS.approachScale, dt)) {
          if (friendCatches(c.target)) friendShutsItDown(c, c.target, 'She stepped away and shut it down.');
          else { c.gone = true; hurtFriend(c.target, v.hit, v.reachedText, 'grabbed'); }
        }
      }
    } else if (c.kind === 'spiker') {
      const d = drinks[c.drink];
      if (c.state === 'spiking') {
        c.spikeT -= dt;
        if (c.spikeT <= 0) {
          c.state = 'leave'; c.tx = c.x < W / 2 ? -40 : W + 40;
          if (friendCatches(game.friends[c.drink])) { game.selfSaves++; friendSays(game.friends[c.drink], 'Hey, that\u2019s mine.'); floatText(c.x, c.y - 100 * sc(c.y), 'She caught him.', '#7CFF6B'); }
          else { d.spiked = true; d.resetT = 4; hurtFriend(game.friends[c.drink], v.hit, v.reachedText, 'spiked'); }
        }
      } else if (c.state === 'leave') { if (moveToward(c, c.tx, c.y, 0.1 * W, dt)) c.gone = true; }
      else if (moveToward(c, d.x + 18, horizonY + 10, v.speed * pace * slowMult(c) * W, dt)) { c.state = 'spiking'; c.spikeT = v.spikeTime; }
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
  const ask = WEAPONS[selected].mode === 'ask';
  for (const c of game.chars) {
    if (c.state === 'ko') continue;
    const s = sc(c.y), v = c.view;
    const shake = c.state === 'windup' && !reduceMotion ? Math.sin(game.t * 60) * 2.2 : 0;
    v.setPosition(c.x + shake, c.y).setScale(s).setDepth(c.y);
    if (c.helper) syncHelper(c, ask);
    setArms(v, c.bombT > 0 ? 'wipe' : c.state === 'lunge' ? 'grab' : (c.kind === 'spiker' && c.flagged && (c.state === 'act' || c.state === 'spiking')) ? 'vial' : 'down');
    v.stunFx.setVisible(c.stun > 0);
    if (c.tagged) v.sparkles.forEach((p, i) => { const a = game.t * 3 + i * 1.26; p.setVisible(true).setPosition(Math.cos(a) * 20, -50 + Math.sin(a) * 28); });
  }
}

// With Ask selected, each bystander shows who they are and a small bar for how willing they are.
// The white tick is where they'll step in; the bar goes green once they're past it.
function syncHelper(c, ask) {
  const v = c.view, h = c.helper;
  if (!v.helperLabel) {
    v.helperLabel = S.add.text(0, -108, HELPERS[h.ability].name, { fontFamily:'Rubik, system-ui, sans-serif', fontStyle:'800', fontSize:'11px',
      color:'#FFF1E0', stroke:'rgba(26,14,29,0.85)', strokeThickness:3, resolution:TEXT_RES * 2 }).setOrigin(0.5, 1);
    v.helperBar = S.add.graphics();
    v.add([v.helperLabel, v.helperBar]);
  }
  v.helperLabel.setVisible(ask); v.helperBar.setVisible(ask);
  if (!ask) return;
  const s = sc(c.y), half = Math.max(v.helperLabel.width, 36) * s / 2 + 4;   // keep label and bar on screen near the edges
  const shift = (Phaser.Math.Clamp(c.x, half, W - half) - c.x) / s;
  v.helperLabel.x = shift; v.helperBar.x = shift;
  const w = 34, ready = h.canAct(S.time.now);
  v.helperBar.clear()
    .fillStyle(0x000000, 0.5).fillRect(-w / 2 - 1, -106, w + 2, 7)
    .fillStyle(0x3A2A40, 1).fillRect(-w / 2, -105, w, 5)
    .fillStyle(ready ? COLORS.spiked : 0x9A8CC0, 1).fillRect(-w / 2, -105, w * h.willingness, 5)
    .fillStyle(COLORS.cream, 1).fillRect(-w / 2 + w * h.config.threshold - 0.5, -107, 1.5, 9);
}

function drawFx() {
  const f = S.fxLayer, g = game;
  f.clear();
  if (!g) return;
  drawFriendBars(f);
  if (g.crew) {
    if (state === 'play') drawCrewHud(f);
    else { g.crew.tether.clear(); if (g.crew.hud) g.crew.hud.setVisible(false); }   // run is over: hide the link
  }
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
  r.fillGradientStyle(0x1C0E32, 0x1C0E32, 0x0A0512, 0x0A0512, 1).fillRect(-10, -10, W + 20, horizonY + 10);
  const shelves = [counterTop - horizonY * 0.34, counterTop - horizonY * 0.14];
  r.fillStyle(0x2A1C3A, 1); shelves.forEach(y => r.fillRect(W * 0.06, y, W * 0.88, 4));
  for (const b of bottles) {
    const x = W * 0.08 + b.x * W * 0.84, y = shelves[b.row];
    const c = b.row ? COLORS.cyan : COLORS.neon;
    r.fillStyle(c, 0.28).fillRect(x - 4, y - b.h, 8, b.h);      // glow halo
    r.fillStyle(c, 0.95).fillRect(x - 1.5, y - b.h, 3, b.h);    // bright core
  }
  for (const lx of [0.2, 0.5, 0.8]) {
    const x = W * lx, ly = horizonY * 0.1;
    r.lineStyle(2, 0x120a14, 1).lineBetween(x, 0, x, ly);
    r.fillStyle(COLORS.amber, 1).fillCircle(x, ly + 4, 5);
  }
  r.fillGradientStyle(0x16092A, 0x16092A, 0x07030E, 0x07030E, 1).fillRect(-10, horizonY, W + 20, H - horizonY + 10);
  r.lineStyle(1, COLORS.neon, 0.18);
  for (let i = -10; i <= 10; i++) r.lineBetween(W / 2 + i * W * 0.06, horizonY, W / 2 + i * W * 0.22, H);
  for (let k = 1; k <= 7; k++) { const yy = horizonY + (k * k) * (H - horizonY) * 0.021; if (yy < H) r.lineStyle(1, COLORS.neon, Math.max(0.05, 0.2 - k * 0.02)).lineBetween(0, yy, W, yy); }
  r.fillStyle(0x120A20, 1).fillRect(-10, counterTop, W + 20, horizonY - counterTop);
  r.fillStyle(COLORS.neon, 0.22).fillRect(-10, counterTop - 3, W + 20, 6);   // glow
  r.fillStyle(COLORS.neon, 1).fillRect(-10, counterTop, W + 20, 3);          // bright edge
  r.fillStyle(0x000000, 0.18);
  for (let x = 0; x < W; x += 48) r.fillRect(x, counterTop + 9, 2, horizonY - counterTop - 9);
  // A bar stool under each friend: seat, pole and a neon-rimmed base, seen from behind. Mostly hidden by her; the seat peeks out at her hips.
  const s0 = sc(horizonY);
  for (const d of drinks) {
    const cx = d.x - 20, seatY = horizonY + 2 - 22 * s0;
    r.lineStyle(3 * s0, 0x2A1C3A, 1).lineBetween(cx, seatY, cx, horizonY + 4);
    r.fillStyle(0x120A20, 1).fillEllipse(cx, horizonY + 5, 30 * s0, 7 * s0);
    r.lineStyle(1.2, COLORS.neon, 0.45).strokeEllipse(cx, horizonY + 5, 30 * s0, 7 * s0);
    r.fillStyle(0x2A1C3A, 1).fillEllipse(cx, seatY, 46 * s0, 11 * s0);
    r.lineStyle(1.2, COLORS.neon, 0.5).strokeEllipse(cx, seatY, 46 * s0, 11 * s0);
  }

  S.glows.forEach((gl, i) => gl.setPosition(W * [0.2, 0.5, 0.8][i], horizonY * 0.1).setDisplaySize(W * 0.5, W * 0.5));
  S.neon.setPosition(W / 2, horizonY * 0.3).setFontSize(Math.round(clamp(W * 0.075, 22, 44)) + 'px');
  S.patronViews.forEach((v, i) => v.setPosition(drinks[i].x - 20, horizonY + 2).setScale(sc(horizonY)));
}
function drawDrinks() {
  const g = S.drinkLayer, t = S.time.now / 1000, k = barK();
  g.clear();
  drinks.forEach(d => {
    const gx = d.x + 12 * k, gy = counterTop, P = (x, y) => ({ x:gx + x * k, y:gy + y * k });
    g.fillStyle(COLORS.cream, 0.55).fillPoints([P(-7,-18), P(7,-18), P(4,0), P(-4,0)], true);
    g.fillStyle(d.spiked ? COLORS.spiked : COLORS.amber, 1).fillPoints([P(-5.5,-12), P(5.5,-12), P(3.5,-1), P(-3.5,-1)], true);
    if (d.spiked) g.fillStyle(COLORS.spiked, 1).fillCircle(gx + 2 * k, gy + (-22 - ((t * 20) % 8)) * k, 1.8 * k);
  });
}
function layout() {
  const old = W ? { W, horizonY, depth:playerY - horizonY } : null;
  W = window.innerWidth; H = window.innerHeight;
  const barH = $('bar').offsetHeight || 70;
  horizonY = Math.round(H * VIEW.horizon); playerY = H - barH - 12; counterTop = horizonY - Math.round(92 * sc(horizonY));
  // Keep people in the same relative spot on the floor when the screen rotates or resizes.
  if (old && game) {
    const fx = W / old.W, fy = (playerY - horizonY) / old.depth;
    for (const c of game.chars) {
      c.x *= fx; c.tx *= fx;
      c.y = horizonY + (c.y - old.horizonY) * fy;
      c.ty = horizonY + (c.ty - old.horizonY) * fy;
    }
    if (game.crew) { game.crew.gx *= fx; game.crew.gy = horizonY + (game.crew.gy - old.horizonY) * fy; }
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
      .setOrigin(0.5).setShadow(0, 0, '#FF4F9A', 30, false, true).setDepth(-980);
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
      if (w.mode === 'tap') useKnee(); else if (w.mode === 'area') useGlitter(); else if (w.mode === 'call') fakeCall(); else if (w.mode === 'ask') useAsk(); else if (w.mode === 'checkin') useCheckIn();
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
      if (state === 'play') { const slow = game.slowT > 0 ? EPILOGUE.slowScale : 1; if (game.slowT > 0) game.slowT -= dt; step(dt * slow); updateHUD(); }
      syncViews();
    }
    drawFx();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0C0714',
  scale: { mode: Phaser.Scale.NONE, width: window.innerWidth * DPR, height: window.innerHeight * DPR, zoom: 1 / DPR },
  input: { activePointers: 1 },
  banner: false,
  scene: BarScene
});
