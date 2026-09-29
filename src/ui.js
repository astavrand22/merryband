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
    const unlocked=!game||game.unlocked.has(w.id);
    const b=document.createElement('button');
    b.className='wbtn'+(i===selected?' sel':'')+(unlocked?'':' locked');
    b.setAttribute('aria-label',unlocked?`${w.name} (${i+1})`:`${w.name}, unlocks at ${w.unlock} points`);
    b.innerHTML=`<span class="ic">${unlocked?w.icon:'🔒'}</span><span>${unlocked?w.name:w.unlock}</span><span class="cd" id="cd-${w.id}"></span>`;
    b.onclick=()=>selectWeapon(i);
    bar.appendChild(b);
  });
}
function selectWeapon(i){
  if(!game||!game.unlocked.has(WEAPONS[i].id)) return;
  selected=i; pointer.down=false; renderBar(); toast(WEAPONS[i].name+'. '+WEAPONS[i].hint); narrate(WEAPONS[i].name+': '+(WEAPONS[i].how||WEAPONS[i].hint),6500);
}
function updateHUD(){
  const g=game; if(!g) return;
  $('hearts').textContent='♥'.repeat(Math.max(0,g.hearts))+'♡'.repeat(CONFIG.hearts-Math.max(0,g.hearts));
  const t=Math.ceil(g.time); $('time').textContent=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
  $('score').textContent=g.score;
  const mult=Math.min(4,1+Math.floor(g.combo/3)); $('combo').textContent=mult>1?('Combo x'+mult):'';
  for(const w of WEAPONS){const el=$('cd-'+w.id); if(el&&w.cooldown){el.style.width=((g.cool[w.id]||0)/w.cooldown*100)+'%'}}
}
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

function startGame(){
  newGame(); state='play'; narrate('2 a.m. Watch for the red flag on their clothes. That\u2019s your cue.',4500);
  $('startScreen').classList.add('hidden'); $('endScreen').classList.add('hidden');
  $('signNote').textContent='';
}
function showEpilogues(){
  const list=$('epiList'); list.innerHTML='';
  const seen=[...game.faced].filter(k=>VILLAINS[k]&&VILLAINS[k].epilogue);
  seen.forEach(k=>{ const d=document.createElement('div'); d.className='epi'; const v=VILLAINS[k]; const b=document.createElement('b'); b.textContent=(v.icon?v.icon+' ':'')+v.name+(v.who?' \u00b7 the one who '+v.who:''); d.appendChild(b); d.appendChild(document.createTextNode(VILLAINS[k].epilogue)); list.appendChild(d) });
  $('epiBox').classList.toggle('hidden',!seen.length);
}
function endGame(win){
  if(state!=='play') return; state='end'; pointer.down=false; $('narr').classList.remove('show');
  $('endTitle').textContent=win?'Made it home.':'Rough night.';
  $('endSub').textContent=win?'Keys in the lock. Deadbolt thrown.':'Out of hearts \u2014 and they\u2019re still out there.';
  $('stScore').textContent=game.score; $('stKos').textContent=game.kos; $('stSaves').textContent=game.saves;
  const rec=recordScore(); $('stBest').textContent=rec.best;
  if(rec.isNew){ const nb=document.createElement('span'); nb.className='newbest'; nb.textContent='New best'; $('endTitle').appendChild(nb) }
  showBestStart(); showEpilogues(); showEndTips();
  $('causeTitle').textContent=CAUSE.issue; $('causeBlurb').textContent=CAUSE.blurb; $('signBtn').textContent=CAUSE.cta;
  lastRun={win,score:game.score,kos:game.kos,saves:game.saves,epi:[...game.faced].map(k=>VILLAINS[k]&&VILLAINS[k].epilogue).filter(Boolean)}; $('shareNote').textContent=''; prepCard();
  setTimeout(()=>$('endScreen').classList.remove('hidden'),700);
}
$('startBtn').onclick=startGame;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&state!=='play'&&!$('startScreen').classList.contains('hidden')) startGame() });
$('againBtn').onclick=startGame;
$('signBtn').closest('.cause').hidden=!CAUSE.enabled;
$('signBtn').onclick=()=>{
  if(CAUSE.url) window.open(CAUSE.url,'_blank','noopener');
  goldPin=true;
  $('signNote').textContent=CAUSE.url?'Thanks. Gold lipstick unlocked for your next run.':'No petition link yet. Add it to CAUSE.url. Gold lipstick unlocked anyway.';
};

/* ---------- share your score ---------- */
let lastRun=null, card=null;
function gameLink(){ return SHARE.url || (/^https?:/.test(location.protocol)?location.origin+location.pathname:'') }
const plural=(n,one,many)=>n+' '+(n===1?one:many);
function shareText(withLink){
  const r=lastRun, pts=r.score.toLocaleString('en-US');
  const bits=[]; if(r.kos) bits.push(plural(r.kos,'creep','creeps')+' down'); if(r.saves) bits.push(plural(r.saves,'drink','drinks')+' saved');
  let t=r.win?'Walked home through Last Call':'Took on Last Call';
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
  x.font=`64px ${BG}`; x.fillStyle='#FFF1E0'; x.fillText(r.win?'I MADE IT HOME.':'ROUGH NIGHT.',cx,830);
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
  const file=new File([card||toBlobSync(drawCard())],'keys-out-score.png',{type:'image/png'});
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

addEventListener('keydown',e=>{ if(state==='play'&&e.key>='1'&&e.key<=String(WEAPONS.length)) selectWeapon(+e.key-1) });

renderBar();
