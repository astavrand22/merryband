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
