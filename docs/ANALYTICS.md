# Play analytics

Off by default. To turn on, set `ANALYTICS.endpoint` in `src/data.js` to a URL that accepts a POST.
Try it without an endpoint by opening the game with `?analytics=debug`; events print to the console.

## What is sent
- `run_start`: no data.
- `run_end`: `win`, `score`, `kos`, `saves`, `hearts_left`, `seconds`, `weapons_used`, `faced` (villain types),
  `hearts_lost_by` (`spiked` / `followed` / `grabbed` / `bystander` counts), `crews_made`, `crews_broken`.

## What is never sent
Cookies, local ids, fingerprints, free text, anything from the donation, petition or feedback flows.
Nothing is sent if the browser sends Do Not Track or Global Privacy Control.

## What's left
There is no collector yet. The site is static. The simplest option is a small Cloudflare Worker that
receives the POST and writes it to Workers Analytics Engine (that needs a change to `wrangler.jsonc`, so it should be a deliberate step).
Keep whatever collector is used from storing IP addresses.

## Related fix
`hurt(msg, why)` now takes a reason code (`spiked`, `followed`, `grabbed`, `bystander`) so the end-of-run tips
respond to what cost you hearts. Before, it matched on the message text and never matched.
