// Collector for play analytics (see docs/ANALYTICS.md). Only /a comes here; everything else is served
// as static files. Stores no IP address, user agent, cookie or id: just the summary the game sends.
const EVENTS = new Set(['run_start', 'run_end']);
const WEAPONS = new Set(['keys', 'lipstick', 'spray', 'glitter', 'call', 'ask']);
const VILLAINS = new Set(['spiker', 'follower', 'grabber']);
const REASONS = new Set(['spiked', 'followed', 'grabbed', 'bystander']);
const num = (v, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0; };
const list = (v, allowed) => (Array.isArray(v) ? v : []).filter(x => allowed.has(x)).sort().join(',');

export function summarize(body) {
  let m;
  try { m = JSON.parse(body); } catch { return null; }
  if (!m || !EVENTS.has(m.e)) return null;
  const p = m.p && typeof m.p === 'object' ? m.p : {};
  const lostBy = p.hearts_lost_by && typeof p.hearts_lost_by === 'object' ? p.hearts_lost_by : {};
  const lost = [...REASONS].filter(r => lostBy[r]).map(r => r + ':' + num(lostBy[r], 9)).join(',');
  return {
    indexes: [m.e],
    blobs: [m.e, p.win === true ? 'win' : p.win === false ? 'loss' : '', list(p.weapons_used, WEAPONS), list(p.faced, VILLAINS), lost],
    doubles: [num(m.v, 99), num(p.score, 100000), num(p.kos, 999), num(p.saves, 999), num(p.hearts_left, 9), num(p.seconds, 600), num(p.crews_made, 9), num(p.crews_broken, 9)]
  };
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const body = await request.text();
    if (body.length > 2048) return new Response(null, { status: 413 });
    const point = summarize(body);
    if (!point) return new Response(null, { status: 400 });
    try { if (env.PLAY) env.PLAY.writeDataPoint(point); } catch { /* never fail the player over analytics */ }
    return new Response(null, { status: 204 });
  }
};
