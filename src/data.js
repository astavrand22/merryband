/* ============ RedFlag tuning: edit these to add villains, weapons, causes ============
   Plain JavaScript (not JSON) so the game still runs when index.html is opened straight from disk. */
const CONFIG = { levelSeconds: 60, hearts: 3 };

// Who the characters look like. Villains are men 99 times in 100; bystanders are a mix,
// so looking like a man is never a reason to hit someone. Only the red flag is.
const LOOKS = { villainFemaleChance: 0.01, bystanderMaleChance: 0.5, beardChance: 0.35 };

// behavior: 'target-drink' | 'approach' | 'lunge'
// tell: seconds [min,max] before the red flag shows on his clothes. speed is relative to room size.
// tellText: a few words shown above him the first time this villain flags in a run, so new players
//   learn what the flag means. Describe the intent, never the act.
// outfit: the shirt colour every villain of this type wears, so players learn who is who by colour.
// epilogue: one cartoonish line about what happens to him afterward, shown on the end screen.
//   Keep it under about 45 characters so it also fits on the share card.
// subtlety: [min,max], 0 = a glaring flag you can't miss, 1 = a small dark one that's easy to miss.
//   Picked per spawn in that range. Leave it off to use FLAG.subtlety below.
const VILLAINS = {
  spiker:   { name:'The Spiker',   behavior:'target-drink', hp:2, tell:[1.2,2.2], speed:0.11, spikeTime:1.4, points:150, saveBonus:100,
              outfit:'#A070FF', icon:'🍸', who:'went for her drink', tellText:'Going for a drink', epilogue:'Banned from every bar in town.', subtlety:[0.4,0.9] },
  follower: { name:'The Follower', behavior:'approach',     hp:3, tell:[1.4,2.4], speed:0.075, points:100,
              outfit:'#F2B233', icon:'👣', who:'followed her', tellText:'Following her', epilogue:'Now follows a GPS that\u2019s always wrong.', subtlety:[0.15,0.7] },
  grabber:  { name:'The Grabber',  behavior:'lunge',        hp:2, tell:[1.0,2.0], windup:0.9, speed:0.9, points:120,
              outfit:'#38B6FF', icon:'✋', who:'lunged at her', tellText:'About to grab', epilogue:'Glitter in both hands. It never comes off.', subtlety:[0.1,0.55] }
};
// The takedown beat: a short slow-mo plus the villain's epilogue as a caption. Never pauses the game.
const EPILOGUE = { enabled:true, slowScale:0.3, slowSeconds:0.35, captionMs:2200 };
// PACE: how fast flagged creeps close in, as a multiplier on their speed below. Starts gentle and
// ramps linearly to `end` by the last second. 1 = the speed written on the villain.
const PACE = { start: 0.65, end: 1.35 };
const SPAWN_WEIGHTS = { bystander:0.5, spiker:0.2, follower:0.15, grabber:0.15 };

// The red flag shows ON the villain's clothing when he makes his move, not above his head.
// subtlety = the default range when a villain has none of its own. obvious/subtle = the two ends
// of the colour: a bright flag fades toward a small dark one as subtlety rises.
const FLAG = { subtlety: [0.2, 0.85], obvious: '#FF2E2A', subtle: '#9E1B1B' };

// mode: 'tap' | 'cone' | 'area' | 'mark' | 'call' | 'ask'. unlock = score needed.
const WEAPONS = [
  { id:'ask',      name:'Ask',       icon:'🙋', mode:'ask',                           unlock:0,    how:'Tap a bystander to ask them for help. Tap a crew member first to aim the help at him.', hint:'Tap a bystander to ask for help. Tap a crew member first to aim it.' },
  { id:'knee',     name:'Knee',      icon:'🦵', mode:'tap',  dmg:2,   cooldown:0.55, unlock:0,    how:'One hard hit on a flagged creep: drops a Spiker or Grabber in one tap, a Follower in two. Always ready. Best as your finisher.', hint:'One hard hit. Your finisher.' },
  { id:'call',     name:'Fake Call', icon:'📱', mode:'call', cooldown:15,             unlock:1700, how:'Phone rings: flagged Followers and Spikers back off (points!), Grabbers freeze. Best when a Spiker nears a drink or several close in. 15 s reload.', hint:'Scares them off.', freeze:1.5 },
  { id:'glitter',  name:'Glitter',   icon:'✨', mode:'area', cooldown:5,              unlock:1200, how:'Tap an area: creeps inside show their flag, freeze briefly, take double damage. Bystanders safe. Best to spot hidden creeps or set up a kill. 5 s reload.', hint:'Exposes and stuns.' },
  { id:'spray',    name:'Pepper',    icon:'🌶️', mode:'cone', dps:1.8,                unlock:700,  how:'Hold and drag to spray a cone: steady damage and stun on flagged creeps, but it hits bystanders too. Best on one creep with nobody near.', hint:'Hold to spray one creep.' }
];

// Crews: two or more villains working together. While they're linked none of them flags, so your
// weapons can't touch them. Break the link with help from bystanders before their plan finishes.
// If the plan finishes, they all flag together and act as usual. If you break it, they bolt.
// The plan is a countdown with a visible link, never a scene. Nobody is shown being led anywhere.
const CREW = {
  enabled: true,
  firstAt: [14, 22],      // seconds into the run before the crew shows up
  maxPerRun: 1,
  size: 2,                // villains per crew (2 or 3)
  kinds: ['follower', 'grabber', 'spiker'],   // who can be in a crew
  planSeconds: 30,        // how long a fully linked crew's plan takes if nobody helps
  minTimeLeft: 24,        // no crew starts with less than this many seconds left in the run
  breakPoints: 200,       // bonus for breaking a crew, on top of half of each member's usual points
  staffHit: 60            // how much of the link staff take off when they arrive (out of 100)
};

// The five bystander helpers (the "5 Ds"). The key is the ability. weight = how often a bystander is that type.
// line = what they say when they step in. Short, and about helping, never about the act.
const HELPERS = {
  direct:   { name:'Bouncer',  weight:0.15, line:'Leave them alone.' },
  distract: { name:'Regular',  weight:0.25, line:'Hey! Is this your jacket?' },
  delegate: { name:'Waiter',   weight:0.20, line:'I’ll get the manager.' },
  delay:    { name:'Friend',   weight:0.15, line:'You okay? Sit with us.' },
  document: { name:'Phone',    weight:0.25, line:'I’m filming.' }
};

// Haptics: a short buzz when you land a hit. Patterns are milliseconds (on, off, on...).
// Android browsers support this. iPhone Safari has no vibration API, so iPhones get
// the system "switch" tick instead (iOS 18+, taps only). minGap stops held weapons
// (pepper) from buzzing continuously.
const HAPTICS = {
  enabled: true,
  hit:    12,             // any damage to a flagged creep
  ko:     [18, 40, 30],   // knockout: double thump
  save:   [18, 30, 18, 30, 40], // KO'd a Spiker before he spiked a drink
  tag:    8,              // glitter bomb
  call:   [40, 60, 40, 60, 40], // fake call: phone ringing
  hurt:   [70, 50, 70],   // you lost a heart
  minGap: 0.09            // seconds between buzzes of the same kind
};

// Real-life tips. Shown on the start screen, on the end screen (picked by what happened in
// the run), and all together on tips.html. Every tip needs a source a reader can check.
// tags: what makes a tip relevant after a run.
//   hurt by:   spiked, followed, grabbed, bystander
//   faced:     spiker, follower, grabber
//   used:      a weapon id (knee, spray, glitter, call, ask)
//   general:   fine for anyone
const TIP_GROUPS = [
  { id:'drinks',   title:'At the bar' },
  { id:'followed', title:'If someone follows you' },
  { id:'grabbed',  title:'If someone grabs you' },
  { id:'carry',    title:'What you carry' },
  { id:'others',   title:'If it\u2019s happening to someone else' }
];
const TIPS = [
  { id:'drink-watch', group:'drinks', tags:['spiked','spiker'],
    title:'Keep your drink with you',
    text:'Hold onto it, or leave it with a friend you trust. If it\u2019s been out of sight, get a fresh one. Water and soda can be spiked too, so keep an eye on your friends\u2019 drinks as well.',
    source:'NPR, with RAINN', url:'https://www.npr.org/2024/09/05/nx-s1-5087871/safety-drink-spiking-tips-college' },
  { id:'drink-signs', group:'drinks', tags:['spiked','spiker'],
    title:'Know the signs of spiking',
    text:'Feeling much drunker than you should, dizziness, nausea, blurred vision, trouble breathing, or gaps in memory. Tell someone you trust and get medical help right away. It is never your fault.',
    source:'NPR, with RAINN', url:'https://www.npr.org/2024/09/05/nx-s1-5087871/safety-drink-spiking-tips-college' },
  { id:'drink-staff', group:'drinks', tags:['spiker','spiked','general'],
    title:'Tell the staff',
    text:'If you see someone mess with a drink, or you feel unsafe, tell the bartender or a manager. Some bars train staff on code phrases like \u201cAsk for Angela,\u201d but you never need a code. Just say it.',
    source:'Wikipedia: Ask for Angela', url:'https://en.wikipedia.org/wiki/Ask_for_Angela' },
  { id:'follow-route', group:'followed', tags:['followed','follower'],
    title:'Change your route',
    text:'Cross the street or change direction. Walk with confidence and keep checking where he is, so he knows you\u2019ve seen him.',
    source:'UCCS Police', url:'https://police.uccs.edu/prevention/crime-prevention/crime-prevention-tips/being-followed' },
  { id:'follow-home', group:'followed', tags:['followed','follower','call'],
    title:'Don\u2019t lead him home',
    text:'Go somewhere busy instead: an open caf\u00e9, a store, a full parking lot. Call a friend and stay on the line. If you feel you\u2019re in danger, call 911.',
    source:'SafeWise', url:'https://www.safewise.com/blog/what-to-do-if-you-think-youre-being-followed/' },
  { id:'follow-look', group:'followed', tags:['follower'],
    title:'Get a good look',
    text:'Notice his face, his clothes and which way he went. Those details are what police need for a report.',
    source:'UCCS Police', url:'https://police.uccs.edu/prevention/crime-prevention/crime-prevention-tips/being-followed' },
  { id:'grab-escape', group:'grabbed', tags:['grabbed','grabber'],
    title:'The goal is to get away',
    text:'Fighting back is about making an opening, not winning. Strike, then get away toward people and light as soon as you can.',
    source:'WebMD', url:'https://www.webmd.com/balance/features/basic-self-defense-moves' },
  { id:'grab-targets', group:'grabbed', tags:['grabbed','grabber'],
    title:'Aim for what\u2019s soft',
    text:'Up close, your strongest options are a knee to the groin, the heel of your palm up into his nose or chin, and his eyes.',
    source:'WebMD', url:'https://www.webmd.com/balance/features/basic-self-defense-moves' },
  { id:'grab-class', group:'grabbed', tags:['general','grabber'],
    title:'Practice on a person, not a screen',
    text:'Moves stick when you\u2019ve done them for real. Look for an in-person self-defense class near you.',
    source:'WebMD', url:'https://www.webmd.com/balance/features/basic-self-defense-moves' },
  { id:'carry-keys', group:'carry', tags:['keys'],
    title:'Hold your keys like you\u2019re unlocking a door',
    text:'Keys between your knuckles splay out and can hurt your own hand. Grip your biggest key the way you\u2019d put it in a lock, and have it out before you reach the door.',
    source:'Defend Yourself', url:'https://defendyourself.org/where-are-your-keys/' },
  { id:'carry-spray', group:'carry', tags:['spray'],
    title:'Check your pepper spray rules',
    text:'It\u2019s legal in all 50 states, but many limit canister size, who can buy it, or how. California caps it at 2.5 oz, and New York requires buying in person.',
    source:'SABRE', url:'https://www.sabrered.com/blog/pepper-spray-laws' },
  { id:'carry-code', group:'carry', tags:['call'],
    title:'Set up a code word',
    text:'Agree on a word or text with your friends that means \u201ccall me and get me out of here.\u201d It\u2019s the real version of the Fake Call.',
    source:'KPRC Click2Houston', url:'https://www.click2houston.com/news/local/2024/08/28/5-emergency-code-words-to-use-when-youre-in-danger-how-to-alert-friends-discreetly/' },
  { id:'others-5d', group:'others', tags:['glitter','bystander','general','ask'],
    title:'Use the 5Ds',
    text:'Distract (interrupt with something unrelated), Delegate (get staff or someone in charge), Document (only once they\u2019re getting help), Delay (check on them after), Direct (a short \u201cLeave them alone\u201d).',
    source:'Right To Be', url:'https://righttobe.org/guides/bystander-intervention-training/' },
  { id:'others-signal', group:'others', tags:['call','general'],
    title:'Know the Signal for Help',
    text:'A silent hand sign: palm out, thumb tucked in, then fingers folded down over the thumb. It means \u201ccheck in with me safely.\u201d If you see it, reach out quietly and let them say what they need.',
    source:'Canadian Women\u2019s Foundation', url:'https://canadianwomen.org/signal-for-help/' }
];

const CAUSE = {
  enabled: false, // set true once there is a live petition; shows the petition box on the end screen
  issue: 'The Spiker is fiction. Spiking isn\u2019t.',
  blurb: 'Back stronger drink-spiking laws. (Replace this with your petition copy.)',
  cta: 'Sign the petition',
  url: '' // paste the live petition link here
};

// Donations go through Every.org straight to the nonprofit; the game never touches money.
// id = Every.org slug or EIN. designation = earmark note (a recommendation, not binding).
// To add a recipient, add an entry. Max 4 looks best on phones.
const DONATE = {
  recipients: [
    { id:'02-0588944', name:'Victim Rights Law Center',
      blurb:'Free lawyers for sexual assault survivors: housing, school, work, privacy.' },
    { id:'52-1213010', name:'TIME\u2019S UP Legal Defense Fund',
      blurb:'Funds lawyers for people facing sexual harassment at work. Run by the National Women\u2019s Law Center.',
      designation:'TIME\u2019S UP Legal Defense Fund' },
    { id:'23-7085442', name:'Legal Momentum',
      blurb:'The oldest women\u2019s legal defense fund in the US. Litigates for survivors and against gender violence.' }
  ],
  amounts: [10, 25, 50, 100],
  defaultAmount: 25,
  suggestEmail: ''   // where "suggest a recipient" messages go, e.g. 'hello@yourdomain.com'
};

// "Share your score" on the end screen. Threads opens a prefilled post;
// Instagram gets a story-sized score card (1080x1920) through the phone's share sheet,
// or a download on desktop.
const SHARE = {
  url: '',        // live game link for posts and the card. Blank = the page's own web address
  tag: 'RedFlag'  // hashtag added to the Threads post and copied caption (no #). '' for none
};

// Play analytics (see src/analytics.js). Leave endpoint empty to keep it off. Summaries only, no ids or cookies.
const ANALYTICS = { endpoint:'', version:1 };
