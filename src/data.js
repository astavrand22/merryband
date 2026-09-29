/* ============ RedFlag tuning: edit these to add villains, weapons, causes ============
   Plain JavaScript (not JSON) so the game still runs when index.html is opened straight from disk. */
const CONFIG = { levelSeconds: 60, hearts: 3 };

// behavior: 'target-drink' | 'approach' | 'lunge'
// tell: seconds [min,max] before the red flag shows on his clothes. speed is relative to room size.
// subtlety: [min,max], 0 = a glaring flag you can't miss, 1 = a small dark one that's easy to miss.
//           Picked per spawn in that range. Leave it off to use FLAG.subtlety below.
const VILLAINS = {
  spiker:   { name:'The Spiker',   behavior:'target-drink', hp:2, tell:[1.2,2.2], speed:0.11, spikeTime:1.4, points:150, saveBonus:100, subtlety:[0.4,0.9] },
  follower: { name:'The Follower', behavior:'approach',     hp:3, tell:[1.4,2.4], speed:0.075, points:100, subtlety:[0.15,0.7] },
  grabber:  { name:'The Grabber',  behavior:'lunge',        hp:2, tell:[1.0,2.0], windup:0.9, speed:0.9, points:120, subtlety:[0.1,0.55] }
};
const SPAWN_WEIGHTS = { bystander:0.5, spiker:0.2, follower:0.15, grabber:0.15 };

// The red flag now shows ON the villain's clothing when he makes his move, not above his head.
// subtlety = the default range when a villain has none of its own. obvious/subtle = the two ends
// of the colour: a bright flag fades toward a small dark one as subtlety rises.
const FLAG = { subtlety: [0.2, 0.85], obvious: '#FF2E2A', subtle: '#9E1B1B' };

// mode: 'tap' | 'hold' | 'cone' | 'area'. unlock = score needed.
const WEAPONS = [
  { id:'keys',    name:'Keys',    icon:'🔑', mode:'tap',  dmg:1,   cooldown:0.22, unlock:0,    hint:'Tap to swing.' },
  { id:'hatpin',  name:'Hatpins', icon:'📌', mode:'hold', dmg:0.5, rate:0.11,     unlock:300,  hint:'Hold to fire.' },
  { id:'spray',   name:'Pepper',  icon:'🌶️', mode:'cone', dps:1.8,               unlock:700,  hint:'Hold and aim. Bystanders feel it too.' },
  { id:'glitter', name:'Glitter', icon:'✨', mode:'area', cooldown:5,             unlock:1200, hint:'Tap to tag creeps. Tagged take double damage.' }
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
  tag: 'RedFlag'  // hashtag added to the Threads post and copied caption (no #). '' for none
};
