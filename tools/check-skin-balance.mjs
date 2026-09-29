// Checks that villains' skin tones can't cluster by luck. Run: node tools/check-skin-balance.mjs
// Pulls SKINS and dealSkin() straight out of src/game.js, so it tests the real code.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
const start = src.indexOf('const SKINS');
const endMarker = 'return bag.pop();\n}';
const end = src.indexOf(endMarker, start) + endMarker.length;
if (start < 0 || end < endMarker.length) { console.error('Could not find SKINS / dealSkin in src/game.js'); process.exit(1); }

const ctx = vm.createContext({ hex: s => parseInt(s.slice(1), 16), Math });
vm.runInContext(src.slice(start, end) + '\nthis.SKINS = SKINS; this.dealSkin = dealSkin; this.skinBags = skinBags;', ctx);
const { SKINS, dealSkin, skinBags } = ctx;

const RUNS = 5000, SIZES = [6, 8, 10, 12, 14, 18];
let worstGap = 0, overHalf = 0;
const share = SKINS.map(() => 0); let total = 0;
for (let r = 0; r < RUNS; r++) {
  skinBags.villain.length = 0;
  const n = SIZES[r % SIZES.length], counts = SKINS.map(() => 0);
  for (let i = 0; i < n; i++) counts[SKINS.indexOf(dealSkin('villain'))]++;
  counts.forEach((c, i) => share[i] += c); total += n;
  worstGap = Math.max(worstGap, Math.max(...counts) - Math.min(...counts));
  if (Math.max(...counts) / n > 0.5) overHalf++;
}
const pct = share.map(c => (c / total * 100).toFixed(1));
console.log(`${RUNS} simulated runs, ${SKINS.length} tones`);
console.log(`share of villains per tone: ${pct.join('%  ')}%`);
console.log(`biggest gap between any two tones in a run: ${worstGap}`);
console.log(`runs where one tone got more than half the villains: ${overHalf}`);
if (worstGap > 1 || overHalf > 0) { console.error('FAIL: skin tones are clustering'); process.exit(1); }
console.log('OK');
