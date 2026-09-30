# RedFlag: Level Design

_As of 2026-09-28. Living copy: the "RedFlag: Level Design" doc in the Merry Band project. This file is the snapshot for the repo. (The game was renamed from "Keys Out" to "RedFlag" on 2026-09-28.)_

## Overview

The game is one bad night, played leg by leg: the bar, the walk home, the garage. Levels 4 and 5 leave the street for the places predators hide in daylight: the office and the phone. Level 1 is built and live in the repo; everything after it is design.

Every level follows the same rules:

- Villains look like everyone else until they act. Then a red flag shows on his clothing — sometimes obvious, sometimes easy to miss — and you strike. Hitting early costs points; hitting a bystander shakes the nearest friend. You look out for three friends at the counter and are never the target.
- Assaults are never shown. The tell signals intent and the player always interrupts.
- Each level adds one new villain behavior and one new weapon, so a new player learns one thing at a time.
- The end screen carries one real-world action tied to that level's villain. Villains stay fictional.

| # | Level | Setting | New villain | New weapon | Cause card | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Last Call | Bar at closing | Spiker, Follower, Grabber | Keys, Lipstick, Pepper, Glitter, Fake Call | Drink-spiking laws | Built |
| 2 | The Walk Home | Street at night | The Wolf | Stiletto boomerang | Stalking protections | Design |
| 3 | The Garage | Parking garage | The Lurker | Paper trail | Rape kit backlog | Design |
| 4 | The Office | Workplace, boss fight | The Mogul (boss) | The Receipts | NDA reform | Design |
| 5 | The DMs | Phone screen | Cyberflasher, Catfish | Block, Screenshot | Cyberflashing laws | Design |

## Level 1: Last Call, as built today

A 60-second survival round in a bar at closing time, built on Phaser with no image assets and no saved state. Three friends sit at the counter, each with a comfort bar and a trait (see [FRIENDS.md](FRIENDS.md)). (It was plain canvas code until the Phaser port on 2026-09-28.) You survive the minute to win; you lose when any friend's bar hits zero.

**The room.** (Framing is set by `VIEW` in `src/data.js`: the counter sits at 46% of the screen height and people at the counter are drawn at 0.8x, so the bar, friends and their bars fill more of the screen. Raise `minScale` to zoom in further, then retune `FRIENDS.approachScale`.) A back bar with bottle shelves, three hanging lamps and a flickering LAST CALL neon sign. Three women sit at the counter with their backs to you, each with a drink in front of her. The floor fills with people walking in from both sides.

**Crowd.** A new person arrives roughly every second, and the pace nearly doubles by the final seconds. At most 9 people are on the floor and at most 2 Spikers at once. The mix is 50% bystanders, 20% Spikers, 15% Followers, 15% Grabbers.
**Creep pace.** Flagged creeps close in at 65% of their listed speed at the start of the night and ramp up to 135% by the last second (`PACE` in `src/data.js`).

**Villains.** Each one wanders like a bystander until his tell timer runs out, then a red flag appears on his clothing and he acts. How obvious the flag is varies per spawn (a `subtlety` range per villain in `src/data.js`): the Grabber wears an obvious one, the Spiker often a subtle one. A first-time text callout above him still names the tell.

| Villain | HP | Flag after | What he does once flagged | A friend loses comfort (34) when | Points |
| --- | --- | --- | --- | --- | --- |
| The Spiker | 2 | 1.2–2.2 s | Walks to an unspiked drink, spends 1.4 s spiking it | He finishes: the drink glows green for 4 s | 150, +100 save bonus |
| The Follower | 3 | 1.4–2.4 s | Walks slowly and steadily toward the friend who's had the worst night | He reaches her | 100 |
| The Grabber | 2 | 1.0–2.0 s | Shakes for 0.9 s, then lunges fast at that friend | He reaches her | 120 |

**Weapons.** Knee is free (and the bar is Help, then Knee (Fake Call, Glitter and Pepper are parked)); the rest unlock by score within a run and reset on the next run. Number keys switch weapons on a keyboard.

| Weapon | Input | Effect | Unlocks at |
| --- | --- | --- | --- |
| Fake Call | Tap | Your friend calls, 15 s recharge. Flagged Followers and Spikers walk off for half points (a Spiker counts as a save); flagged Grabbers freeze for 1.5 s | 1,700 |
| Glitter bomb | Tap | Area blast, 5 s recharge. Villains in it are covered in glitter, stunned for 0.7 s, flag immediately and take double damage | 1,200 |
| Pepper spray | Hold and aim | Cone that damages and stuns flagged villains, stuns unflagged ones, and shakes the nearest friend if it hits a bystander | 700 |
| Knee | Tap | 2 damage, 0.55 s cooldown. One tap drops a Spiker or Grabber, two a Follower | Start |
| Help | Tap a friend, or a bystander | Friend: "You okay?" restores 30 of her comfort bar and earns 40 points (8 s reload, doesn't touch creeps). Bystander: ask for backup (see CREW.md) | Start |

**Scoring.** Hitting a villain before his flag costs 50 points and resets the combo. Every 3 knockouts in a row add 1 to the multiplier, up to 4x. Stopping a Spiker before he finishes counts as a save.

**End screen.** Score, creeps down and saves, then the cause card: "The Spiker is fiction. Spiking isn't." The petition link is still blank, and the copy is placeholder. Tapping the button unlocks gold lipstick for the next run in that browser tab. The start and end screens both link to RAINN.

**Gaps in what's built**

- No petition URL or final cause copy.
- No sound or haptics.
- Nothing persists: best score, gold lipstick and unlocks are lost on reload.
- Villains and weapons are config objects inside the HTML, not the separate data files the original design called for.
- Characters are drawn from shapes, so villains and bystanders differ only by the worn flag (whose subtlety now varies). That's intentional for fairness but gives each villain little personality.
- No onboarding. A first-time player learns the "wait for the flag" rule by losing points.
- The Wolf and the Mogul from the original villain list aren't in yet.

## Level 1: how it should evolve

Level 1 is the tutorial and the thing people share, so it needs to be the most polished level, not just the first one. The changes fall into three waves.

**Before sharing widely**

- Real petition link and cause copy in `CAUSE`, checked against the partner org's own wording.
- A 10-second guided opening: one Spiker, a prompt to wait for the flag, a prompt to strike. Normal spawning starts after the first knockout.
- Sound: a key jingle on hit, a KO sting, a glass clink when a drink is saved, a low hum when a flag goes up. Short vibration on phones when a friend loses comfort.
- Save best score and the gold lipstick in the browser so they survive a reload.

**Make the bar feel alive**

- Three phases inside the minute: happy hour (slow, mostly bystanders), last call (full mix), lights up (fast, Grabbers weighted up). The neon sign and lighting change with each.
- Cover a drink: tap a glass to slide a coaster over it for a few seconds. A defensive move that shows players a real habit.
- The bartender as an ally. Tapping her once per run triggers "Ask for Angela," a real bar-safety code phrase: she escorts one flagged villain out. The end screen can explain the real campaign.
- The three women at the counter react. They turn when their drink is saved and cheer on a combo, which makes saves feel personal.
- A Wolf cameo in the last 10 seconds as a teaser for Level 2.

**Make it extensible**

- Move villains, weapons and causes into `villains.json`, `weapons.json` and `levels.json` so new villains need no code, as originally planned.
- Replace drawn shapes with simple sprites so each villain has a silhouette players remember, while keeping the flag as the only reliable tell.
- Add a level select that shows Level 2 locked until Level 1 is cleared.

**Balance questions to test with players**

- Pepper spray stuns unflagged villains for free, which makes it a safe way to scout. Keep it, or make it cost points like a keys hit?
- Glitter flags villains early. That's strong at 1,200 points; it may need a longer recharge once the Wolf exists.

## Level 2: The Walk Home

You leave the bar and walk six blocks home. The level teaches reading people at a distance and in the dark.

**Setting.** A city street after midnight: storefronts, a bus shelter, doorways, a late-night bodega, streetlights with dark gaps between them. The street scrolls slowly as you walk, and a distance meter replaces the timer. You win when you reach your door.

**New mechanic: light and dark.** Under a streetlight you see everyone clearly. In the gaps, people are silhouettes and red flags are dimmer. Players learn to strike in the light and watch the shadows.

**Villains**

- **The Wolf (new).** Walks with the crowd and never flags from a distance. He flags only when he's close, with the shortest tell in the game. Glitter tags him early, which is what makes Glitter matter here.
- **The Follower (returns).** Now the main threat. He trails you block after block and speeds up in the dark gaps.
- **The Curb Crawler (new, optional).** A car that slows alongside a woman on the sidewalk. Hitting the car door stops it.

**Saves.** Other women walk alone on the same street. Keep a villain off one until she reaches the bus shelter or a lit doorway.

**New weapon: Stiletto boomerang.** Swipe to throw a heel. It bounces between up to three flagged villains and returns. A miss leaves you without it for a few seconds.

**Ultimate: The Group Chat.** Unlocked by clearing Level 2. Three friends appear for 8 seconds and fight alongside you. It carries into every later level.

**Cause card: stalking protections.** The Follower is the level's villain. The card links to a stalking-law petition or a stalking-victim legal aid donation.

## Level 3: The Garage

You drove tonight, and your car is on level P3. This level is about what you can't see, and ends in a holdout.

**Setting.** Low concrete ceilings, fluorescent tubes that buzz and flicker, pillars and parked cars that block your view. An elevator on one side, your car on the far side.

**New mechanic: cover and alarms.** Pillars and cars hide people. Tap any parked car to set off its alarm: headlights flash, everyone near it is revealed, and flagged villains nearby are stunned. Each car works once, so players choose when to spend them.

**Villains**

- **The Lurker (new).** Waits behind a car or pillar and never walks in the open. He pops out with a short tell. The car alarm is the counter to him.
- **The Grabber (returns).** Shorter windup in the tight space.
- **The Wolf (returns).** Mixed in with people heading to their cars.

**Saves.** A woman loading groceries into her trunk. Protect her until she drives off.

**Finale.** You reach your car, and the engine won't turn over. Survive 10 seconds of the heaviest spawns while it starts. This is the level's peak.

**New weapon: Paper trail.** Swipe to draw a line of documents on the floor. Flagged villains who cross it get stuck and shredded. It's the first weapon about blocking a route, not hitting a person, and it sets up the evidence theme for the cause card.

**Cause card: rape kit backlog.** Evidence that sits untested lets repeat offenders keep going. The card links to a backlog-testing petition or a legal aid donation.

## Level 4: The Office (boss)

The first daytime level and the first boss. The threat shifts from strangers to a powerful man protected by money and paperwork.

**Setting.** An open-plan office on the top floor: desks, a glass-walled corner office, a break room, the elevator. Fluorescent daylight instead of neon.

**The Mogul.** A fictional executive who can't be hurt at the start. He fights in three phases:

1. **Shields up.** NDA shields float around him and block every weapon. Coworkers across the floor each hold a receipt. Protect them from his creepy middle managers, and each save drops a receipt you collect.
2. **Spin.** Once his shields break, his PR team floods the floor with decoys who look like him. Only the real Mogul flags. Glitter sticks to the real one.
3. **The exit.** He runs for the elevator. Stop him before the doors close.

**Enablers.** His lawyers and his PR team aren't predators and never flag, but they block shots and shield him. Paper trail pins them in place. Hitting them does nothing, so they're obstacles, not targets.

**New weapon: The Receipts.** A receipt-printer minigun, the only thing that breaks NDA shields. It fires only as long as you have collected receipts, which ties the weapon to saving coworkers.

**Ultimate: NO.** Unlocked by beating the Mogul. A shockwave from the player; holding longer makes it bigger.

**Cause card: NDA reform.** Silencing agreements let workplace abusers move on to the next job. The card links to an NDA-reform petition or a workplace harassment legal fund.

## Level 5: The DMs, and what comes after

Level 5 changes the frame: the screen becomes a phone. It's the level most players have lived, and the cheapest to build because it needs no scene art.

**Setting.** A messaging inbox. Message requests slide in and scroll up. Friends, coworkers and a group chat mix in with the villains.

**Villains**

- **The Cyberflasher.** Sends an unsolicited image. It always arrives blurred and is never shown. The tell is a "sent you a photo" preview from a stranger.
- **The Catfish.** Looks like a friend of a friend and flags only after a few messages, when he asks to move to another app or meet alone.
- **The Reply Guy.** Harmless alone, but a swarm of them buries real messages from friends you're supposed to answer.

**Weapons.** Block (tap), Screenshot (collects receipts from flagged messages for a multiplier), Report (hold; slow but removes a sender's whole thread). Hitting a real friend's message costs a heart, same as a bystander.

**Cause card: cyberflashing laws.** Links to a petition to criminalize sending unsolicited explicit images where it's still legal.

**Later levels and modes**

- **The Party.** A house party with rooms and stairs; a second ally who can be spiked if you're slow.
- **The Ride.** A rideshare level where you check the plate before you get in.
- **Hunt mode.** Tips from the community lead you to one villain's hangouts across earlier levels.
- **Villain editor.** A page where players describe a villain behavior and submit it for review. Submissions stay fictional.
- **Nickname leaderboard.** Per level, no login.

## Build order and open questions

Polish Level 1 before building Level 2; a strong first minute matters more than a fifth level.

1. Level 1 "before sharing" wave: petition link, guided opening, sound, saved best score.
2. Split config into `villains.json`, `weapons.json` and `levels.json`, and add a level select.
3. Level 2, with the Wolf and the Group Chat ultimate.
4. Level 1 "feel alive" wave, informed by what players say in the feedback page.
5. Level 5 (cheap, no scene art), then Level 3, then the Level 4 boss.

**Open questions**

- [ ] Separate 60-to-90-second levels, or one continuous night where finishing the bar drops you onto the street?
- [ ] Do weapon unlocks carry across levels, or does each level restart at Keys?
- [x] Move to Phaser. Done 2026-09-28.
- [ ] Which partner org backs each level's cause card, and have they seen the game?
- [x] Game name. Renamed to "RedFlag" on 2026-09-28 (was the placeholder "Keys Out").

## Branding vs. levels

RedFlag's brand is the red flag mark, the wordmark in flag red (#E0302B) with cream, and the line "Spot the red flag. Make him regret it." It stays the same on every level. Each level gets its own name chip ("Level 1 · Last Call") and its own scene styling (Level 1's neon pink and cyan belong to the bar). Never put a level's name or look in the wordmark.

## Level 1 pacing (two minutes)
The level runs 120 s. The Follower comes first, so players learn Knee, Help and swipe on the gentlest villain; the Spiker joins at 30 s (`STAGES`). The Grabber is parked for a later level. The Spiker wanders and flags only in the lower half of the floor, never closer to the bar than halfway, so there is always time to reach him. Help is the same for every helper: it scares the creep off.
