/* ============ Keys Out tuning: edit these to add villains, weapons, causes ============
   Plain JavaScript (not JSON) so the game still runs when index.html is opened straight from disk. */
const CONFIG = { levelSeconds: 60, hearts: 3 };

// Who the characters look like. Villains are men 99 times in 100; bystanders are a mix,
// so looking like a man is never a reason to hit someone. Only the red flag is.
const LOOKS = { villainFemaleChance: 0.01, bystanderMaleChance: 0.5, beardChance: 0.35 };

// behavior: 'target-drink' | 'approach' | 'lunge'
// tell: seconds [min,max] before the red flag goes up. speed is relative to room size.
// tellText: a few words shown by the flag the first time this villain flags in a run, so new players
//   learn what the flag means. Describe the intent, never the act.
// epilogue: one cartoonish line about what happens to him afterward, shown on the end screen.
//   Keep it under about 45 characters so it also fits on the share card.
const VILLAINS = {
  spiker:   { name:'The Spiker',   behavior:'target-drink', hp:2, tell:[1.2,2.2], speed:0.11, spikeTime:1.4, points:150, saveBonus:100,
              tellText:'Going for a drink', epilogue:'Banned from every bar in town.' },
  follower: { name:'The Follower', behavior:'approach',     hp:3, tell:[1.4,2.4], speed:0.075, points:100,
              tellText:'Following her', epilogue:'Got lost in a corn maze. Still in there.' },
  grabber:  { name:'The Grabber',  behavior:'lunge',        hp:2, tell:[1.0,2.0], windup:0.9, speed:0.9, points:120,
              tellText:'About to grab', epilogue:'Glitter in both hands. It never comes off.' }
};
const SPAWN_WEIGHTS = { bystander:0.5, spiker:0.2, follower:0.15, grabber:0.15 };

// mode: 'tap' | 'cone' | 'area' | 'mark' | 'call'. unlock = score needed.
const WEAPONS = [
  { id:'keys',     name:'Keys',      icon:'🔑', mode:'tap',  dmg:1,   cooldown:0.22, unlock:0,    hint:'Tap to swing. Aim low.' },
  { id:'lipstick', name:'Lipstick',  icon:'💄', mode:'mark', dmg:1,   cooldown:0.5,  unlock:300,  hint:'Brand CREEP on his forehead. Marked men move slow and bruise easy.', slow:0.65 },
  { id:'spray',    name:'Pepper',    icon:'🌶️', mode:'cone', dps:1.8,                unlock:700,  hint:'Hold and aim. She\u2019ll catch it too.' },
  { id:'glitter',  name:'Glitter',   icon:'✨', mode:'area', cooldown:5,              unlock:1200, hint:'Glitter-bomb them. Never comes off. Double damage.' },
  { id:'call',     name:'Fake Call', icon:'📱', mode:'call', cooldown:15,             unlock:1700, hint:'Phone lights up. Followers and Spikers bolt; Grabbers freeze.', freeze:1.5 }
];

// Haptics: a short buzz when you land a hit. Patterns are milliseconds (on, off, on...).
// Android browsers support this. iPhone Safari has no vibration API, so iPhones get
// the system "switch" tick instead (iOS 18+, taps only). minGap stops held weapons
// (pepper) from buzzing continuously.
const HAPTICS = {
  enabled: true,
  hit:    12,             // any damage to a flagged creep
  ko:     [18, 40, 30],   // knockout: double thump
  save:   [18, 30, 18, 30, 40], // KO'd a Spiker before he spiked a drink
  tag:    8,              // glitter bomb or lipstick mark
  call:   [40, 60, 40, 60, 40], // fake call: phone ringing
  hurt:   [70, 50, 70],   // you lost a heart
  minGap: 0.09            // seconds between buzzes of the same kind
};

// Sound: every effect is synthesized in src/audio.js, so there are no audio files to load.
// volume is 0 to 1. minGap stops the same effect stacking into a buzz when hits land back to back.
// Players can mute from the speaker button; that choice is saved in the browser.
const SOUND = { volume: 0.8, minGap: 0.06 };

// Feel: small beats that make a knockout land. Hit-stop briefly pauses the action (seconds),
// the shake is milliseconds and strength, and the women at the counter cheer for cheerSeconds
// on a save or every third knockout in a row. Hit-stop, shake and hopping are skipped when the
// player has reduced motion turned on.
const FEEL = { hitStopKo: 0.06, hitStopSave: 0.1, koShakeMs: 80, koShakeAmt: 0.002, cheerSeconds: 1.3 };

// Real-life tips. Shown on the start screen, on the end screen (picked by what happened in
// the run), and all together on tips.html. Every tip needs a source a reader can check.
// tags: what makes a tip relevant after a run.
//   hurt by:   spiked, followed, grabbed, bystander
//   faced:     spiker, follower, grabber
//   used:      a weapon id (keys, lipstick, spray, glitter, call)
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
  { id:'follow-look', group:'followed', tags:['lipstick','follower'],
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
  { id:'others-5d', group:'others', tags:['glitter','bystander','general'],
    title:'Use the 5Ds',
    text:'Distract (interrupt with something unrelated), Delegate (get staff or someone in charge), Document (only once they\u2019re getting help), Delay (check on them after), Direct (a short \u201cLeave them alone\u201d).',
    source:'Right To Be', url:'https://righttobe.org/guides/bystander-intervention-training/' },
  { id:'others-signal', group:'others', tags:['call','general'],
    title:'Know the Signal for Help',
    text:'A silent hand sign: palm out, thumb tucked in, then fingers folded down over the thumb. It means \u201ccheck in with me safely.\u201d If you see it, reach out quietly and let them say what they need.',
    source:'Canadian Women\u2019s Foundation', url:'https://canadianwomen.org/signal-for-help/' }
];

const CAUSE = {
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
  tag: 'KeysOut'  // hashtag added to the Threads post and copied caption (no #). '' for none
};
