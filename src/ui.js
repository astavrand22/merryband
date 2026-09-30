/* RedFlag: screens, HUD, weapon bar, best score, sharing and donations. Game logic is in src/game.js. */
const $ = id => document.getElementById(id);
let game=null, state='start', selected=0, goldPin=false;
const pointer={x:0,y:0,down:false};
let toastT=null;
function toast(msg){const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2000)}

// A short line of narration near the bottom: what's happening and what to do about it. Replaces the last one.
let narrT=0, narrAt=0;
function narrate(msg,ms=3200){const t=$('narr'); if(!t||state!=='play') return; t.textContent=msg; t.classList.add('show'); clearTimeout(narrT); narrT=setTimeout(()=>t.classList.remove('show'),ms)}

function renderBar(){
  const bar=$('bar'); bar.innerHTML='';
  WEAPONS.forEach((w,i)=>{
    if(game&&game.simple&&!EASY.tools.includes(w.id)) return;   // first run: only the basics
    const unlocked=!game||game.unlocked.has(w.id);
    const b=document.createElement('button');
    b.className='wbtn'+(i===selected?' sel':'')+(unlocked?'':' locked');
    b.setAttribute('aria-label',unlocked?`${w.name} (${i+1})`:`${w.name}, unlocks at ${w.unlock} points`);
    b.innerHTML=`<span class="ic">${unlocked?w.icon:'🔒'}</span><span>${unlocked?w.name:w.unlock}</span><span class="cd" id="cd-${w.id}"></span>`;
    b.onclick=()=>selectWeapon(i);
    bar.appendChild(b);
    if(w.help&&!(WEAPONS[i+1]&&WEAPONS[i+1].help)){ const s=document.createElement('div'); s.className='sep'; s.setAttribute('aria-hidden','true'); bar.appendChild(s) }   // help | tools
  });
}
function selectWeapon(i){
  if(!game||!game.unlocked.has(WEAPONS[i].id)) return;
  selected=i; pointer.down=false; renderBar(); const q=/[?!]$/.test(WEAPONS[i].name); narrate(WEAPONS[i].name+(q?' ':': ')+WEAPONS[i].hint,3200);
}
function updateHUD(){
  const g=game; if(!g) return;
  // One heart per friend, coloured by how she's doing. Only touched when something changes.
  const key=g.friends.map(f=>Math.ceil(f.wellbeing/34)).join(''), pips=$('friends');
  if(pips.dataset.k!==key){
    pips.dataset.k=key; pips.innerHTML='';
    g.friends.forEach(f=>{ const s=document.createElement('span'); s.textContent='♥'; s.style.color=f.out?'#5A4A60':f.wellbeing>66?'#7CFF6B':f.wellbeing>33?'#F4B942':'#FF2D4A'; s.style.opacity=f.out?0.5:1; pips.appendChild(s) });
    pips.setAttribute('aria-label','Friends: '+g.friends.map((f,i)=>FRIENDS.labels[i]+' '+Math.round(f.wellbeing)+' percent').join(', '));
  }
  const t=Math.ceil(g.time); $('time').textContent=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
  $('score').textContent=g.score;
  const mult=Math.min(4,1+Math.floor(g.combo/3)); $('combo').textContent=mult>1?('Combo x'+mult):'';
  for(const w of WEAPONS){const el=$('cd-'+w.id); if(el&&w.cooldown){el.style.width=((g.cool[w.id]||0)/w.cooldown*100)+'%'}}
}
/* ---------- runs finished (saved in this browser only) ---------- */
const RUNS_KEY='redflag.runs.v1';
let runsMem=(()=>{ try{ return +localStorage.getItem(RUNS_KEY)||0 }catch(e){ return 0 } })();
function firstRun(){ return EASY.enabled&&runsMem<EASY.runs }
function countRun(){ runsMem++; try{ localStorage.setItem(RUNS_KEY,String(runsMem)) }catch(e){} }
/* ---------- best score (saved in this browser only, no login) ---------- */
const BEST_KEY='redflag.best.v1';
function loadBest(){
  try{ const v=JSON.parse(localStorage.getItem(BEST_KEY) || localStorage.getItem('keysout.best.v1')); return v&&Number.isFinite(v.score)?v:null }catch(e){ return null }
}
function saveBest(rec){ try{ localStorage.setItem(BEST_KEY,JSON.stringify(rec)) }catch(e){} }
let bestMem=loadBest(); // fallback if storage is blocked (private mode)
function showBestStart(){
  $('bestStart').textContent=bestMem&&bestMem.score>0?('Your best: '+bestMem.score):'';
}
function recordScore(){
  const prev=bestMem?bestMem.score:0;
  const isNew=game.score>prev;
  if(isNew){ bestMem={score:game.score,kos:game.kos,saves:game.saves,at:new Date().toISOString()}; saveBest(bestMem) }
  return {isNew:isNew&&prev>0, best:Math.max(prev,game.score)};
}
showBestStart();

/* ---------- real-life tips ---------- */
const rpick=a=>a[Math.floor(Math.random()*a.length)];
function tipEl(t){
  const d=document.createElement('div'); d.className='tip';
  const b=document.createElement('b'); b.textContent=t.title;
  const p=document.createElement('p'); p.textContent=t.text;
  const a=document.createElement('a'); a.href=t.url; a.target='_blank'; a.rel='noopener'; a.textContent='Source: '+t.source;
  d.append(b,p,a); return d;
}
// Two tips for what actually happened this run: what hurt you first, then who you fought,
// then what you used. Random within each, so repeat players see different ones.
let lastTipIds=[];
function pickTips(g,n=2){
  const order=[...new Set(g.events)].concat([...g.faced],[...g.used],['general']);
  const out=[];
  for(const tag of order){
    const pool=TIPS.filter(t=>t.tags.includes(tag)&&!out.includes(t));
    const fresh=pool.filter(t=>!lastTipIds.includes(t.id));
    const cand=fresh.length?fresh:pool;
    if(cand.length) out.push(rpick(cand));
    if(out.length>=n) break;
  }
  lastTipIds=out.map(t=>t.id);
  return out;
}
// One tip at a time. The first is the most relevant to this run; "Another tip" walks through
// the rest (other relevant ones first, then everything else, shuffled) and wraps around.
let tipQueue=[], tipIdx=0;
function showTip(){
  const list=$('tipList'); list.innerHTML='';
  if(tipQueue.length) list.appendChild(tipEl(tipQueue[tipIdx]));
  $('tipNext').hidden=tipQueue.length<2;
}
function showEndTips(){
  const first=pickTips(game,3);
  const rest=TIPS.filter(t=>!first.includes(t)).sort(()=>Math.random()-0.5);
  tipQueue=first.concat(rest); tipIdx=0; showTip();
}
$('tipNext').onclick=()=>{ tipIdx=(tipIdx+1)%tipQueue.length; showTip() };

/* ---------- pop-up cards, pause and refresher ---------- */
// Cards explain one new thing at the moment it matters and hold the game until closed. Each is shown once
// per browser (saved locally, no login); the pause screen lists everything seen so it can be reread, and
// "Show pop-up tips again" clears it.
const SEEN_KEY='redflag.seen.v1';
function loadSeen(){ try{ const a=JSON.parse(localStorage.getItem(SEEN_KEY)); return new Set(Array.isArray(a)?a:[]) }catch(e){ return new Set() } }
const seenMem=loadSeen();
function saveSeen(){ try{ localStorage.setItem(SEEN_KEY,JSON.stringify([...seenMem])) }catch(e){} }

function cardFor(id){
  if(id.startsWith('creep-')){ const v=VILLAINS[id.slice(6)]; return v&&v.intro?{label:'New creep',dot:v.outfit||'#fff',icon:v.icon,title:v.name,text:v.intro}:null }
  if(id.startsWith('unlock-')){ const w=WEAPONS.find(x=>x.id===id.slice(7)); return w?{label:'New tool',icon:w.icon,title:w.name,text:w.how||w.hint}:null }
  return CARDS[id]||null;
}
// The game is held (tweens, clock) while a card or the pause screen is up. The Phaser clock's `now` keeps running
// while paused, so anything timed against it is pushed forward by however long we were held.
let holdN=0, holdAt=0;
function holdGame(){
  if(holdN++>0||!S) return;
  holdAt=S.time.now; S.tweens.pauseAll(); S.time.paused=true;
}
function releaseGame(){
  if(holdN===0||--holdN>0) return;
  const d=S.time.now-holdAt; S.time.paused=false; S.tweens.resumeAll();
  if(game&&d>0){
    for(const c of game.chars){ const h=c.helper; if(h){ if(h.cooldownUntil>holdAt) h.cooldownUntil+=d; if(Number.isFinite(h.lastAskAt)) h.lastAskAt+=d } }
    const k=game.crew; if(k&&k.staffArrivesAt!==null) k.staffArrivesAt+=d;
  }
}
function resetHold(){ if(holdN>0&&S){ S.time.paused=false; S.tweens.resumeAll() } holdN=0 }

let cardQueue=[], cardOpen=null;
// Show a card if it hasn't been seen (or `again`). Returns true if it was shown or queued, so callers can skip their own narration.
function maybeCard(id,again){
  if(!INTRO.enabled||!game) return false;
  const c=cardFor(id); if(!c) return false;
  if(!again&&seenMem.has(id)) return false;
  if(state==='intro'||state==='pause'){ if(cardOpen!==id&&!cardQueue.includes(id)) cardQueue.push(id); return true }
  if(state!=='play') return false;
  openCard(id); return true;
}
function fillCard(c){
  $('introLabel').textContent=c.label;
  const t=$('introTitle'); t.innerHTML='';
  if(c.dot){ const d=document.createElement('span'); d.className='dot'; d.style.background=c.dot; t.append(d) }
  t.append(document.createTextNode((c.icon?c.icon+' ':'')+c.title));
  $('introHow').textContent=c.text;
}
function openCard(id){
  const c=cardFor(id); if(!c) return;
  cardOpen=id; state='intro'; pointer.down=false; holdGame();
  fillCard(c); $('introScreen').classList.remove('hidden'); $('introOk').focus();
}
function closeCard(){
  if(state!=='intro') return;
  $('introScreen').classList.add('hidden'); seenMem.add(cardOpen); saveSeen(); cardOpen=null; pointer.down=false;
  const next=cardQueue.shift();
  if(next){ state='play'; openCard(next); return }
  state='play'; releaseGame();
}
$('introOk').onclick=closeCard; $('introX').onclick=closeCard;

function buildPauseList(){
  const l=$('pauseList'); l.innerHTML='';
  const add=(icon,title,text,dot)=>{
    const d=document.createElement('div'); d.className='pitem';
    const b=document.createElement('b');
    if(dot){ const s=document.createElement('span'); s.className='dot'; s.style.background=dot; b.append(s) }
    b.append(document.createTextNode((icon?icon+' ':'')+title)); d.append(b,document.createTextNode(text)); l.appendChild(d);
  };
  add('🚩','Red flag','Creeps show a red flag on their clothes just before they act. Wait for it, then hit them. Hitting early loses points.');
  add('❤️','Your friends','Stop each creep before he reaches a friend or her drink. If a friend’s bar runs out, the night is over.');
  for(const w of WEAPONS) if(game&&game.unlocked.has(w.id)) add(w.icon,w.name,w.how||w.hint);
  if(game) for(const k of game.introSeen){ const c=cardFor('creep-'+k); if(c) add(c.icon,c.title,c.text,c.dot) }
  for(const id of Object.keys(CARDS)) if(seenMem.has(id)) add(CARDS[id].icon,CARDS[id].title,CARDS[id].text);
}
function pauseGame(){
  if(state!=='play') return;
  state='pause'; pointer.down=false; holdGame(); buildPauseList();
  $('pauseScreen').classList.remove('hidden'); $('resumeBtn').focus();
}
function resumeGame(){
  if(state!=='pause') return;
  $('pauseScreen').classList.add('hidden'); pointer.down=false;
  const next=cardQueue.shift();
  if(next){ state='play'; openCard(next); return }
  state='play'; releaseGame();
}
$('pauseBtn').onclick=pauseGame; $('resumeBtn').onclick=resumeGame;
$('tipsAgain').onclick=()=>{ seenMem.clear(); saveSeen(); $('tipsAgain').textContent='Pop-up tips will show again'; };
document.addEventListener('keydown',e=>{
  if(e.repeat) return;
  if(state==='intro'&&(e.key==='Escape'||e.key==='Enter'||e.key===' ')){ e.preventDefault(); closeCard() }
  else if(state==='pause'&&(e.key==='Escape'||e.key==='Enter'||e.key==='p'||e.key==='P')){ e.preventDefault(); resumeGame() }
  else if(state==='play'&&(e.key==='Escape'||e.key==='p'||e.key==='P')){ e.preventDefault(); pauseGame() }
});
// Switching tabs or apps pauses, so nothing happens while you're away.
document.addEventListener('visibilitychange',()=>{ if(document.hidden) pauseGame() });

function startGame(){
  resetHold(); cardQueue=[]; cardOpen=null; $('pauseScreen').classList.add('hidden'); $('introScreen').classList.add('hidden'); newGame(); state='play'; track('run_start'); narrate('Wait for the red flag, then hit him.',4000);
  $('startScreen').classList.add('hidden'); $('endScreen').classList.add('hidden'); closeResult();
  $('signNote').textContent='';
}
// Result pop-up. "Who you took out": creeps by type, then one line per way you dealt with them.
function fillTally(){
  const chips=$('rChips'); chips.innerHTML='';
  for(const k of Object.keys(VILLAINS)){ const n=game.kosBy[k]; if(!n) continue; const v=VILLAINS[k]; const c=document.createElement('span'); c.className='chip'; c.textContent=(v.icon?v.icon+' ':'')+v.name.replace(/^The /,'')+' ×'+n; chips.appendChild(c) }
  const list=$('rTally'); list.innerHTML='';
  for(const [k,t] of Object.entries(TALLY_LINES)){
    const n=game.outcomes[k]||0; if(!n) continue;
    const d=document.createElement('div'); d.className='epi';
    const b=document.createElement('b'); b.textContent=t.icon+' '+(n===1?t.one:t.many.replace('{n}',n));
    const f=document.createElement('div'); f.className='epif'; f.textContent=t.fate;
    d.append(b,f); list.appendChild(d);
  }
  const q=TALLY.filter(t=>game.kos>=t.min).pop();
  $('rQuip').textContent=q?q.text:'';
  $('rTakenOut').classList.toggle('hidden',!game.kos&&!Object.keys(game.outcomes).length);
}
// One thing to try next time, chosen from how the run went.
function nextTimeTip(g){
  const ck=WEAPONS.find(w=>w.id==='checkin'), fill=(t,o)=>t.replace(/\{(\w+)\}/g,(m,k)=>o[k]);
  const hurt=g.events.length>0||g.friends.some(f=>f.wellbeing<100);
  if(!g.checkins&&hurt) return fill(NEXT_TIME.checkin,{pts:ck.points});
  if(g.earlyHits>=1) return fill(NEXT_TIME.early,{n:g.earlyHits}).replace('creep(s)',g.earlyHits===1?'creep':'creeps');
  if(g.bystanderHits) return NEXT_TIME.bystander;
  if(!g.used.has('ask')&&g.kos+Object.keys(g.outcomes).length>0) return NEXT_TIME.ask;
  return NEXT_TIME.combo;
}
function confetti(){
  const box=$('rConfetti'); box.innerHTML='';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols=['#FF4F9A','#F4B942','#3AE7FF','#7CFF6B','#E0302B','#FFF1E0'];
  for(let i=0;i<46;i++){ const p=document.createElement('i'); p.style.left=Math.random()*100+'%'; p.style.background=cols[i%cols.length]; p.style.animationDelay=(Math.random()*0.9)+'s'; p.style.animationDuration=(2.2+Math.random()*1.6)+'s'; p.style.transform='rotate('+Math.random()*360+'deg)'; box.appendChild(p) }
}
function showResult(win,rec){
  $('rTitle').textContent=(win?'🎉 ':'')+(win?'Everyone got home.':'Rough night.');
  $('rSub').textContent=win?'You looked out for each other.':'A friend had to call it — and they’re still out there. Run it back.';
  $('rScore').textContent=game.score.toLocaleString('en-US');
  $('rNew').classList.toggle('hidden',!rec.isNew);
  $('rKos').textContent=game.kos; $('rSaves').textContent=game.saves; $('rBest').textContent=rec.best;
  fillTally(); $('rNext').textContent=nextTimeTip(game);
  $('resultScreen').classList.toggle('win',win); confetti();
  $('resultScreen').classList.remove('hidden'); $('rContinue').focus();
}
function closeResult(){ $('resultScreen').classList.add('hidden') }
$('rContinue').onclick=closeResult;
document.addEventListener('keydown',e=>{ if(!$('resultScreen').classList.contains('hidden')&&(e.key==='Escape'||e.key==='Enter')){ e.preventDefault(); closeResult() } });
function endGame(win){
  if(state!=='play') return; state='end'; countRun(); pointer.down=false; $('narr').classList.remove('show');
  $('endTitle').textContent=win?'Everyone got home.':'Rough night.';
  $('endSub').textContent=win?'You looked out for each other.':'A friend had to call it \u2014 and they\u2019re still out there. Run it back.';
  const rec=recordScore();
  trackRunEnd(game,win); showBestStart(); showEndTips();
  $('causeTitle').textContent=CAUSE.issue; $('causeBlurb').textContent=CAUSE.blurb; $('signBtn').textContent=CAUSE.cta;
  lastRun={win,score:game.score,kos:game.kos,saves:game.saves,epi:[...game.faced].map(k=>VILLAINS[k]&&VILLAINS[k].epilogue).filter(Boolean)}; $('shareNote').textContent=''; prepCard();
  setTimeout(()=>{ $('endScreen').classList.remove('hidden'); showResult(win,rec) },700);
}
$('startBtn').onclick=startGame;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&state!=='play'&&!$('startScreen').classList.contains('hidden')) startGame() });
$('againBtn').onclick=startGame;
$('signBtn').closest('.cause').hidden=!CAUSE.enabled;
$('signBtn').onclick=()=>{
  if(CAUSE.url) window.open(CAUSE.url,'_blank','noopener');
  goldPin=true;
  $('signNote').textContent=CAUSE.url?'Thanks for signing.':'No petition link yet. Add it to CAUSE.url.';
};

/* ---------- share your score ---------- */
let lastRun=null, card=null;
function gameLink(){ return SHARE.url || (/^https?:/.test(location.protocol)?location.origin+location.pathname:'') }
const plural=(n,one,many)=>n+' '+(n===1?one:many);
function shareText(withLink){
  const r=lastRun, pts=r.score.toLocaleString('en-US');
  const bits=[]; if(r.kos) bits.push(plural(r.kos,'creep','creeps')+' down'); if(r.saves) bits.push(plural(r.saves,'drink','drinks')+' saved');
  let t=r.win?'Got my friends through Last Call':'Took on Last Call';
  if(bits.length) t+=' \u2014 '+bits.join(', ');
  t+=`. ${pts} points in RedFlag. Your turn.`;
  const link=gameLink();
  if(withLink&&link) t+='\n'+link;
  if(SHARE.tag) t+=(withLink&&link?' ':'\n')+'#'+SHARE.tag;
  return t;
}
function drawCard(){
  const r=lastRun, c=document.createElement('canvas'); c.width=1080; c.height=1920;
  const x=c.getContext('2d'), cx=540, BG="Bungee, 'Arial Black', Impact, sans-serif", RB='Rubik, system-ui, sans-serif';
  let g=x.createLinearGradient(0,0,0,1920); g.addColorStop(0,'#3F2446'); g.addColorStop(0.55,'#1F1024'); g.addColorStop(1,'#120914');
  x.fillStyle=g; x.fillRect(0,0,1080,1920);
  const glow=x.createRadialGradient(cx,420,20,cx,420,700); glow.addColorStop(0,'rgba(224,48,43,.24)'); glow.addColorStop(1,'rgba(224,48,43,0)');
  x.fillStyle=glow; x.fillRect(0,0,1080,1100);
  x.textAlign='center'; x.textBaseline='alphabetic';
  // title
  x.font=`150px ${BG}`; x.fillStyle='#EAF7FF'; x.fillText('REDFLAG',cx+8,408);
  x.fillStyle='#E0302B'; x.fillText('REDFLAG',cx,400);
  x.font=`800 44px ${RB}`; x.fillStyle='#F4B942'; x.fillText('LEVEL 1  ·  LAST CALL',cx,480);
  // red flag
  x.strokeStyle='#FFF1E0'; x.lineWidth=8; x.lineCap='round'; x.beginPath(); x.moveTo(cx-40,720); x.lineTo(cx-40,590); x.stroke();
  x.fillStyle='#E0302B'; x.beginPath(); x.moveTo(cx-40,590); x.lineTo(cx+60,618); x.lineTo(cx-40,648); x.closePath(); x.fill();
  // result + score
  x.font=`64px ${BG}`; x.fillStyle='#FFF1E0'; x.fillText(r.win?'WE ALL GOT HOME.':'ROUGH NIGHT.',cx,830);
  const pts=r.score.toLocaleString('en-US');
  x.font=`${pts.length>5?210:260}px ${BG}`; x.fillStyle='#F4B942'; x.fillText(pts,cx,1090);
  x.font=`800 40px ${RB}`; x.fillStyle='rgba(255,241,224,.75)'; x.fillText('POINTS',cx,1150);
  // stat tiles
  [[r.kos,r.kos===1?'CREEP DOWN':'CREEPS DOWN',150],[r.saves,r.saves===1?'DRINK SAVED':'DRINKS SAVED',570]].forEach(([n,label,tx])=>{
    x.fillStyle='#2A1830'; x.beginPath(); x.roundRect(tx,1230,360,220,32); x.fill();
    x.strokeStyle='#5a3a60'; x.lineWidth=4; x.stroke();
    x.font=`110px ${BG}`; x.fillStyle='#F4B942'; x.fillText(String(n),tx+180,1360);
    x.font=`800 32px ${RB}`; x.fillStyle='rgba(255,241,224,.8)'; x.fillText(label,tx+180,1415);
  });
  // epilogue: one line about what happened to him
  if(r.epi&&r.epi.length){ x.font=`600 34px ${RB}`; x.fillStyle='rgba(255,241,224,.85)'; x.fillText(r.epi[Math.floor(Math.random()*r.epi.length)],cx,1510) }
  // call to action
  x.font=`72px ${BG}`; x.fillStyle='#E0302B'; x.fillText('YOUR TURN.',cx,1580);
  const link=gameLink().replace(/^https?:\/\//,'').replace(/\/$/,'');
  x.font=`600 40px ${RB}`; x.fillStyle='#FFF1E0'; x.fillText(link||('#'+(SHARE.tag||'RedFlag')),cx,1650);
  return c;
}
function toBlobSync(canvas){
  const [head,b64]=canvas.toDataURL('image/png').split(','), bin=atob(b64), a=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i);
  return new Blob([a],{type:head.split(':')[1].split(';')[0]});
}
// Build the card before the end screen shows, so the share tap still counts as a user tap on iOS.
function prepCard(){
  card=null; const run=lastRun;
  const go=()=>{ if(lastRun!==run) return; drawCard().toBlob(b=>{ if(lastRun===run) card=b },'image/png') };
  (document.fonts&&document.fonts.load)?Promise.all([document.fonts.load("150px Bungee"),document.fonts.load("800 40px Rubik")]).then(go,go):go();
}
function shareNote(msg){ $('shareNote').textContent=msg }
$('shareThreads').onclick=()=>{
  if(!lastRun) return;
  window.open('https://www.threads.net/intent/post?text='+encodeURIComponent(shareText(true)),'_blank','noopener');
  shareNote('Opened Threads with your post ready.');
};
$('shareInsta').onclick=async()=>{
  if(!lastRun) return;
  const file=new File([card||toBlobSync(drawCard())],'redflag-score.png',{type:'image/png'});
  const caption=shareText(true);
  try{ navigator.clipboard&&navigator.clipboard.writeText(caption).catch(()=>{}) }catch(_){}
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file]}); shareNote('Pick Instagram, then Story or Post. Caption’s copied if you want it.'); return }
    catch(e){ if(e&&e.name==='AbortError') return }
  }
  const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  shareNote('Score card saved. Post it to your Instagram story from your phone. Caption’s copied.');
};

/* ---------- donations ---------- */
let giveOrg=0, giveAmt=DONATE.defaultAmount, giveFrom=null;
function renderGive(){
  $('orgs').innerHTML=''; $('amts').innerHTML='';
  DONATE.recipients.forEach((r,i)=>{
    const b=document.createElement('button');
    b.className='org'+(i===giveOrg?' sel':''); b.setAttribute('aria-pressed',i===giveOrg);
    b.innerHTML='<b></b><span></span>'; b.querySelector('b').textContent=r.name; b.querySelector('span').textContent=r.blurb;
    b.onclick=()=>{giveOrg=i; renderGive()};
    $('orgs').appendChild(b);
  });
  DONATE.amounts.forEach(a=>{
    const b=document.createElement('button');
    b.className='amt'+(a===giveAmt?' sel':''); b.setAttribute('aria-pressed',a===giveAmt); b.textContent='$'+a;
    b.onclick=()=>{giveAmt=a; renderGive()};
    $('amts').appendChild(b);
  });
  $('donateBtn').textContent='Donate $'+giveAmt+' to '+DONATE.recipients[giveOrg].name.split(' (')[0];
}
function donateUrl(r,amt){
  const q=new URLSearchParams({amount:amt, suggestedAmounts:DONATE.amounts.join(','), frequency:'ONCE', theme_color:'F4B942'});
  if(r.designation) q.set('designation',r.designation);
  if(/^https?:/.test(location.protocol)){
    const back=location.origin+location.pathname;
    q.set('success_url',back+'?thanks='+encodeURIComponent(r.id));
    q.set('exit_url',back);
  }
  return 'https://www.every.org/'+encodeURIComponent(r.id)+'?'+q.toString()+'#donate';
}
function openGive(from){
  giveFrom=from; renderGive(); $('donateNote').textContent='';
  from.classList.add('hidden'); $('giveScreen').classList.remove('hidden'); $('giveClose').focus();
}
function closeGive(){ $('giveScreen').classList.add('hidden'); if(giveFrom) giveFrom.classList.remove('hidden') }
$('giveBtn').onclick=()=>openGive($('endScreen'));
$('giveClose').onclick=closeGive;
$('donateBtn').onclick=()=>{
  const r=DONATE.recipients[giveOrg];
  window.open(donateUrl(r,giveAmt),'_blank','noopener');
  $('donateNote').textContent='Opened Every.org in a new tab. Thank you.';
};
$('sgSend').onclick=()=>{
  const name=$('sgName').value.trim(), link=$('sgLink').value.trim(), why=$('sgWhy').value.trim();
  if(!name){ $('suggestNote').textContent='Add the nonprofit\u2019s name first.'; $('sgName').focus(); return }
  if(!DONATE.suggestEmail){ $('suggestNote').textContent='Suggestions aren\u2019t set up yet. Add an address to DONATE.suggestEmail.'; return }
  const body='Nonprofit: '+name+'\nWebsite: '+(link||'-')+'\n\nWhat they do:\n'+(why||'-');
  location.href='mailto:'+DONATE.suggestEmail+'?subject='+encodeURIComponent('RedFlag recipient suggestion: '+name)+'&body='+encodeURIComponent(body);
  $('suggestNote').textContent='Your email app should open with the message ready to send.';
};
(function thanksFromDonation(){
  const id=new URLSearchParams(location.search).get('thanks'); if(!id) return;
  const r=DONATE.recipients.find(x=>x.id===id);
  history.replaceState(null,'',location.pathname);
  setTimeout(()=>toast('Thank you'+(r?' for backing '+r.name:'')+'. Receipt\u2019s in your inbox.'),400);
})();
addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('giveScreen').classList.contains('hidden')) closeGive() });

addEventListener('keydown',e=>{ if(state!=='play') return; const n=+e.key; if(n>=1&&n<=WEAPONS.length) selectWeapon(n-1) });

renderBar();
