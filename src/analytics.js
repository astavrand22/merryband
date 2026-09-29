/* Privacy-first play analytics. Off unless ANALYTICS.endpoint is set in data.js.

   What it sends: one small JSON summary per run (score, how it ended, which weapons were used,
   crew outcomes, what cost hearts) plus a "run_start". No cookies, no local ids, no fingerprinting,
   no free text, no user-submitted content. It respects Do Not Track and Global Privacy Control.
   It never sends anything from the donation, petition or feedback flows.

   Add ?analytics=debug to the URL to print what would be sent to the console instead. */

function analyticsOn() {
  if (typeof ANALYTICS === 'undefined') return false;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return false;
  return !!ANALYTICS.endpoint;
}
function track(name, props) {
  const body = JSON.stringify({ e:name, v:ANALYTICS.version, p:props || {} });
  if (/[?&]analytics=debug\b/.test(location.search)) { console.log('[analytics]', body); return; }
  if (!analyticsOn()) return;
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(ANALYTICS.endpoint, new Blob([body], { type:'text/plain' }));
    else fetch(ANALYTICS.endpoint, { method:'POST', body, keepalive:true, mode:'no-cors' }).catch(() => {});
  } catch (e) { /* analytics must never break the game */ }
}
function trackRunEnd(g, win) {
  const lost = {};
  for (const w of g.events) lost[w] = (lost[w] || 0) + 1;
  track('run_end', {
    win, score:g.score, kos:g.kos, saves:g.saves, hearts_left:Math.max(0, g.hearts),
    seconds:Math.round(CONFIG.levelSeconds - g.time),
    weapons_used:[...g.used], faced:[...g.faced], hearts_lost_by:lost,
    crews_made:g.crewsMade, crews_broken:g.crewsBroken
  });
}
