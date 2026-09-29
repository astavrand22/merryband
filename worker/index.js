// Keys Out: donation tracking.
// Every.org calls POST /api/everyorg-webhook/<WEBHOOK_SECRET> after each completed gift.
// We store amounts and recipients only (no donor names or emails) and serve totals.
//
//   GET /api/donations/summary          public totals for the game (cached 60s)
//   GET /api/donations.csv?key=ADMIN_KEY full list for you
//
// Everything else falls through to the static game files.

const SCHEMA = `CREATE TABLE IF NOT EXISTS donations (
  charge_id TEXT PRIMARY KEY,
  partner_donation_id TEXT,
  nonprofit_slug TEXT,
  nonprofit_ein TEXT,
  nonprofit_name TEXT,
  amount_cents INTEGER NOT NULL,
  net_amount_cents INTEGER,
  currency TEXT,
  frequency TEXT,
  payment_method TEXT,
  source TEXT,
  donation_date TEXT,
  received_at TEXT NOT NULL
)`;

let schemaReady = false;
async function db(env) {
  if (!env.DB) return null;
  if (!schemaReady) { await env.DB.prepare(SCHEMA).run(); schemaReady = true; }
  return env.DB;
}

const cents = v => { const n = Math.round(parseFloat(v) * 100); return Number.isFinite(n) ? n : null; };
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...extra } });

function metadata(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(atob(raw)); } catch {}
  return {};
}

async function webhook(request, env, secret) {
  if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) return new Response('Not found', { status: 404 });
  const d = await db(env);
  if (!d) return new Response('Database not configured', { status: 503 });
  let p;
  try { p = await request.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const amount = cents(p.amount);
  if (!p.chargeId || amount === null) return new Response('Missing chargeId or amount', { status: 400 });
  const meta = metadata(p.partnerMetadata);
  const np = p.toNonprofit || {};
  await d.prepare(`INSERT OR IGNORE INTO donations
      (charge_id, partner_donation_id, nonprofit_slug, nonprofit_ein, nonprofit_name, amount_cents, net_amount_cents,
       currency, frequency, payment_method, source, donation_date, received_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(String(p.chargeId), p.partnerDonationId || null, np.slug || null, np.ein || null, np.name || null,
          amount, cents(p.netAmount), (p.currency || 'USD').toUpperCase(), p.frequency || null,
          p.paymentMethod || null, meta.screen || null, p.donationDate || null, new Date().toISOString())
    .run();
  return new Response('ok');
}

async function summary(env, ctx, request) {
  const cache = caches.default, key = new Request(new URL('/api/donations/summary', request.url));
  const hit = await cache.match(key); if (hit) return hit;
  const d = await db(env);
  if (!d) return json({ configured: false, totalCents: 0, count: 0, byRecipient: [] });
  const total = await d.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS t, COUNT(*) AS n FROM donations WHERE currency='USD'`).first();
  const rows = (await d.prepare(`SELECT nonprofit_ein AS ein, nonprofit_slug AS slug, MAX(nonprofit_name) AS name,
      SUM(amount_cents) AS totalCents, COUNT(*) AS count FROM donations WHERE currency='USD'
      GROUP BY nonprofit_ein, nonprofit_slug ORDER BY totalCents DESC`).all()).results;
  const res = json({ configured: true, totalCents: total.t, count: total.n, byRecipient: rows }, 200,
                   { 'cache-control': 'public, max-age=60' });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

async function csv(env, url) {
  if (!env.ADMIN_KEY || url.searchParams.get('key') !== env.ADMIN_KEY) return new Response('Not found', { status: 404 });
  const d = await db(env);
  if (!d) return new Response('Database not configured', { status: 503 });
  const rows = (await d.prepare(`SELECT donation_date, nonprofit_name, nonprofit_ein, amount_cents, net_amount_cents,
      currency, frequency, payment_method, source, charge_id, partner_donation_id, received_at
      FROM donations ORDER BY received_at DESC`).all()).results;
  const cols = ['donation_date','nonprofit_name','nonprofit_ein','amount','net_amount','currency','frequency',
                'payment_method','source','charge_id','partner_donation_id','received_at'];
  const esc = v => v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const lines = rows.map(r => [r.donation_date, r.nonprofit_name, r.nonprofit_ein, (r.amount_cents / 100).toFixed(2),
      r.net_amount_cents == null ? '' : (r.net_amount_cents / 100).toFixed(2), r.currency, r.frequency,
      r.payment_method, r.source, r.charge_id, r.partner_donation_id, r.received_at].map(esc).join(','));
  return new Response([cols.join(','), ...lines].join('\n'), {
    headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="keys-out-donations.csv"',
               'cache-control': 'no-store' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hook = url.pathname.match(/^\/api\/everyorg-webhook\/([^/]+)$/);
    if (hook && request.method === 'POST') return webhook(request, env, hook[1]);
    if (url.pathname === '/api/donations/summary' && request.method === 'GET') return summary(env, ctx, request);
    if (url.pathname === '/api/donations.csv' && request.method === 'GET') return csv(env, url);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
