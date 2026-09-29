# Play analytics

Sent to `/a` (`ANALYTICS.endpoint` in `src/data.js`). Set it empty to turn it off.
Try it without an endpoint by opening the game with `?analytics=debug`; events print to the console.

## What is sent
- `run_start`: no data.
- `run_end`: `win`, `score`, `kos`, `saves`, `hearts_left`, `seconds`, `weapons_used`, `faced` (villain types),
  `hearts_lost_by` (`spiked` / `followed` / `grabbed` / `bystander` counts), `crews_made`, `crews_broken`.

## What is never sent
Cookies, local ids, fingerprints, free text, anything from the donation, petition or feedback flows.
Nothing is sent if the browser sends Do Not Track or Global Privacy Control.

## What's left
The collector is `worker.mjs`, a tiny Cloudflare Worker that only handles POST /a. It
validates and whitelists fields, then writes to Workers Analytics Engine. To start storing: enable Analytics Engine in the Cloudflare dashboard, then uncomment `analytics_engine_datasets` in `wrangler.jsonc`. Until then events are accepted and discarded.
It stores no IP address or user agent. Query the `redflag_play` dataset with SQL (blob1 event, blob2 win/loss, blob3 weapons, blob4 villains faced, blob5 hearts lost by reason; double1..8 version, score, kos, saves, hearts left, seconds, crews made, crews broken).

## Related fix
`hurt(msg, why)` now takes a reason code (`spiked`, `followed`, `grabbed`, `bystander`) so the end-of-run tips
respond to what cost you hearts. Before, it matched on the message text and never matched.
