# Weapons

Reference for the current arsenal and a backlog of proposed weapons. The live definitions are in the `WEAPONS` array in `src/data.js`.

## Shared rules

These apply to every weapon:

- Hitting a **bystander** costs a heart (1.2s grace before the same bystander can cost another).
- Hitting a **villain before his red flag** costs 50 points and resets the combo.
- **Tagged** villains (see Glitter) take double damage from everything.
- Weapons unlock at a score threshold (`unlock`) and are selected from the bottom bar or with number keys.

### Range classes (proposed)

Nothing in the current game has a range limit: every weapon reaches anywhere on screen. The proposals below introduce three classes. A `range` field on the `WEAPONS` entry would carry it.

| `range` | Reach | Works on |
|---|---|---|
| `any` | Anywhere on screen (all current weapons) | Any flagged villain |
| `radius` | A circle around the player | Flagged villains inside it. Skips bystanders |
| `close` | Only once a villain is on top of you. Auto-triggers | **Grabbers only** (lunging, inside the close zone). Never hits bystanders |

Only Grabbers ever reach the player fast enough for close range to matter. Followers arrive slowly and Spikers never leave the bar, so close-range moves don't apply to them.

## Current weapons (Level 1, *Last Call*)

| # | Weapon | `id` | Unlock | `mode` | Stats | Behavior |
|---|---|---|---|---|---|---|
| 1 | 🔑 Keys | `keys` | 0 | `tap` | `dmg:1`, `cooldown:0.22` | Hits the character under the pointer. |
| 2 | 💄 Lipstick | `lipstick` | 300 | `mark` | `dmg:1`, `cooldown:0.5`, `slow:0.65` | Tap a flagged creep: CREEP is written across his forehead, letter by letter, with the lipstick moving along it. Marked creeps take double damage and move at 65% speed for the rest of their life. The mark stays on him through the KO. |
| 3 | 🌶️ Pepper | `spray` | 700 | `cone` | `dps:1.8` | Hold and aim a cone from the player. Damages and stuns every flagged villain in it. Stuns unflagged villains with no penalty. Hurts bystanders. |
| 4 | ✨ Glitter | `glitter` | 1200 | `area` | `cooldown:5` | Glitter bomb. Every villain in the radius gets a shower from above, ends up covered in glitter that stays on him, and spends 0.7s rubbing his eyes (stunned). Bombed creeps take double damage and are **force-flagged**. Bystanders are skipped. |
| 5 | 📱 Fake Call | `call` | 1700 | `call` | `cooldown:15`, `freeze:1.5` | Your friend calls ("OMG I'm literally right outside."). Every flagged Follower and Spiker gives up and walks off for half points; a Spiker who bails counts as a save. Flagged Grabbers freeze for 1.5s. Unflagged villains and bystanders aren't affected. |

Hatpins were removed on Sep 28. **Gold lipstick** replaces gold hatpins: pressing the petition button on the end screen makes the next run's CREEP marks gold.

Double damage doesn't stack: a creep who is both glitter-bombed and lipstick-marked still takes 2×.

### Known issues / balance notes

- **Pepper is now the only held weapon** and the only one that can hit bystanders by accident.
- **Glitter force-flags.** An unflagged Grabber you glitter starts his windup immediately and a Spiker heads for a drink. The 0.7s stun softens it.
- **Fake Call can trivialize a crowded screen.** The 15s cooldown and 1,700-point unlock keep it to about one or two uses a run. Watch this in playtesting.
- **Bar is 5 wide.** Number keys now go 1 to the number of weapons. Six buttons will get tight on small phones.

## Proposed weapons

Status for all of these: **idea**. Each notes the closest existing `mode` and what new code it needs.

### 👠 Stiletto
- **Mode:** `tap`
- **Behavior:** 2 damage per hit, the hardest-hitting tap. After 8 hits the heel snaps and it becomes **The Flat**: 0.5 damage, no cooldown. Toast on break: *"Worth it."*
- **New code:** hit counter per run; swap stats on break.

### 🥤 Emotional Support Water Bottle
- **Mode:** `tap`, thrown
- **Behavior:** 40oz tumbler lobbed in an arc. Slow to land, 4 damage, splash damage to adjacent creeps. You must tap the bottle on the floor to pick it back up. If a bystander walks over it first, they drink from it and you lose it for the level.
- **New code:** projectile with travel time; pickup object on the floor; bystander collision.

### 📱 The Group Chat
- **Mode:** `tap`, 12s cooldown
- **Behavior:** Drop a screenshot in the chat. Every villain on screen gets his red flag early, and for 3 seconds you can hit them without the -50 penalty.
- **Why:** The only weapon built around detection instead of damage. Strongest against Spikers.
- **New code:** global "no early-hit penalty" timer checked in `applyHit`.

### ☂️ Umbrella
- **Mode:** new `block` (hold)
- **Behavior:** Hold it open and a Grabber's lunge bounces off, stunning him for 2 seconds. You can't attack while it's open. Tapping it closed jabs for 1 damage.
- **Why:** First defensive weapon.
- **New code:** `block` mode; intercept the Grabber's `hurt('Grabbed.')` path.

### 🩴 Flying Flip-Flop
- **Mode:** `tap`, boomerang
- **Behavior:** Flies out, hits every flagged creep in a line, and comes back along the same line. Bystanders on the return path still count against you.
- **New code:** line hit test (outbound + return).

### 🧾 Pharmacy Receipt
- **Mode:** `hold`, whip
- **Behavior:** A four-foot receipt with coupons, cracked in a wide horizontal arc. Low damage, hits everyone in the row, knocks them back.
- **Why:** Counter to Follower packs.
- **New code:** horizontal-band hit test; knockback.

### 🫧 Dry Shampoo Cloud
- **Mode:** `area`, smokescreen
- **Behavior:** Creeps inside the cloud lose their target: Grabbers lunge at nothing, Spikers forget which drink was theirs. No damage. A panic button.
- **New code:** lingering area; retarget/cancel logic for Grabber and Spiker.

### 🎀 Scrunchie Slingshot
- **Mode:** `tap`, ricochet
- **Behavior:** Bounces between up to 4 flagged creeps, 0.75 damage each. With only one creep, it bounces off him and back into your hair.
- **New code:** nearest-flagged-villain chaining.

### 🍸 Coaster Shield
- **Mode:** `tap` on a drink
- **Behavior:** Covers a drink for 6 seconds. A Spiker who reaches it stands there looking foolish.
- **Why:** Gives the Spiker level a protective option instead of pure racing.
- **New code:** `covered` timer on `drinks[]`; Spiker checks it before spiking.

### 🗣️ "Text Me When You Get Home" (ultimate)
- **Mode:** meter, charged by saves
- **Behavior:** When full, every friend you saved this level shows up and walks you out. Screen clears, double points.
- **Why:** Ties to the petition theme: protecting people gets you protected.
- **New code:** charge meter; screen-clear event.

## Self-defense and close-range ideas

Added from Abi's notes: realistic self-defense moves, a loud whistle, and a swinging bag.

### Decisions (Sep 28)
- **Close moves auto-trigger.** No tap needed: when a lunging Grabber enters the close zone, your equipped close move fires on its own. The cost is a cooldown: if the move is still recharging, he grabs you as usual.
- **Close moves are passive, not bar slots.** You carry one equipped close move (Knee Strike by default), shown as a small badge by the hearts with a cooldown ring. It doesn't use a number key, which keeps the bar at 4 until the hotkey handler is extended.
- **Bystanders are never hit by 1:1 moves or the bag.** Close moves only ever target the Grabber. The Bag Swing skips bystanders in its ring. This is an exception to the shared bystander rule, on purpose: these are protective moves, not area weapons.
- **Sizes** (both scale with play-field depth, `depth = playerY - horizonY`, like villain speeds do):

| Zone | Formula | ~ on a phone (depth ≈ 450px) | ~ on a laptop (depth ≈ 280px) |
|---|---|---|---|
| Close zone (Grabber counter) | `max(56, 0.2 * depth)` px from `origin()` | 90px | 56px |
| Bag Swing radius | `clamp(0.3 * depth, 90, 170)` px from `origin()` | 135px | 90px |

A lunging Grabber moves at `0.9 * depth` per second, so he crosses the close zone in about a fifth of a second. That's too fast to react to, which is why auto-trigger is the right call.

### 🦵 Knee Strike (self-defense)
- **Range:** `close` (Grabbers only)
- **Mode:** passive, auto-trigger, 6s cooldown
- **Behavior:** When a lunging Grabber enters the close zone and the knee is ready, it fires automatically: heavy damage (KO on a full-health Grabber) and, if he somehow survives, a 1.5s stun. On cooldown, he grabs you as usual (`hurt('Grabbed.')`). Toast: *"Not today."*
- **Feel:** A safety net that rewards spacing out Grabbers. Two lunges in a row will still get you.
- **New code:** a `closeZone` distance from `origin()`; a check in the Grabber lunge branch of `step()` (`src/game.js`) that fires the equipped close move before `hurt('Grabbed.')`; the badge and cooldown ring in `src/ui.js`.

### Other realistic close-range moves
Alternatives to equip instead of the Knee Strike. Same rules: auto-trigger, Grabber-only, inside the close zone, never touches bystanders.

| Move | Behavior | Cooldown | Trade-off |
|---|---|---|---|
| 🦵 **Knee Strike** | KO (or heavy damage + 1.5s stun) | 6s | The default |
| 🖐️ **Heel-palm strike** | Stuns for 2.5s and knocks him back out of the zone, no damage | 3s | Recharges fast, but he survives and you still have to finish him |
| 💪 **Elbow** | 1 damage + 0.8s stun | 2s | Weakest, nearly always ready |
| 🦶 **Stomp** | Stuns and slows him to half speed for 4s | 5s | Sets up an easy kill for your main weapon |
| 🤸 **Wrist escape** | Fires after the grab: refunds the heart | Once per run | The only move that acts after he reaches you |

### 📣 Personal Alarm Whistle
- **Range:** `any` (screen-wide)
- **Mode:** `tap`, 10s cooldown
- **Behavior:** A screen-shaking blast. Every villain on screen is startled and stunned for 1.5 seconds. A Grabber in windup has it canceled, and a Spiker mid-spike loses his progress. It does no damage. Bystanders wince but take no penalty and turn to look, so villains that stay flagged are easier to spot.
- **Feel:** The panic button for when three things are happening at once. Toast: *"Everybody heard that."*
- **Overlap:** This is close to Dry Shampoo Cloud (a defensive, no-damage clear). The difference is scope: the whistle is screen-wide and short, the cloud is local and lingering. They may not both survive playtesting.
- **New code:** a global `stun` applied to all villains; cancel logic for Grabber windup and Spiker `spiking`; screen shake (respect `reduceMotion`); a long `buzz` pattern.

### 👜 Bag Swing
- **Range:** `radius` (`clamp(0.3 * depth, 90, 170)` px)
- **Mode:** `tap`, ~0.6s cooldown
- **Behavior:** Swing your bag in a full circle around the player. Every flagged villain inside the radius takes 2 damage and is knocked back. It only matters when things get close (Followers that make it near, Grabbers mid-lunge).
- **Bystanders:** skipped. The swing passes through them with no penalty. Unflagged villains in the ring are skipped too (no -50), so it's always safe to swing.
- **Variants to try:**
  - **Tote:** larger radius, less damage.
  - **Heavy bag (laptop inside):** smaller radius, 3 damage, longer cooldown.
  - **Contents fly out:** each swing scatters a random item (water bottle, phone, receipt) that hits the nearest creep for a bonus tick of damage. Funny, and hooks into the Water Bottle and Pharmacy Receipt ideas.
- **New code:** a `radius` mode with a circle hit test around `origin()` (`src/game.js`) that filters to flagged villains; knockback; a ring/arc animation.

## Haptics (built)

Landing a hit buzzes the phone. Tuning lives in `HAPTICS` in `src/data.js`; the `buzz(kind)` helper is in `src/game.js`.

| Event | `HAPTICS` key | Pattern (ms) | Fired from |
|---|---|---|---|
| Damage to a flagged creep | `hit` | 12 | `applyHit()`, `sprayTick()` |
| Knockout | `ko` | 18 on, 40 off, 30 on | `ko()` |
| Save (KO'd a Spiker before he spiked) | `save` | 18, 30, 18, 30, 40 | `ko()` |
| Glitter bomb or lipstick mark | `tag` | 8 | `useGlitter()`, `writeCreep()` |
| Fake call rings | `call` | 40, 60, 40, 60, 40 | `fakeCall()` |
| You lost a heart | `hurt` | 70, 50, 70 | `hurt()` |

- **Held weapons** (pepper) would buzz nonstop, so each kind is throttled by `minGap` (0.09s).
- **Early hits** (before the flag) don't buzz. The silence is part of the "wait for the flag" feedback.
- **Android** uses the Vibration API (`navigator.vibrate`).
- **iPhone** Safari has no vibration API. The fallback toggles a hidden iOS 18 "switch" checkbox, which plays the system haptic tick. It only works inside a tap, so on iPhone the keys, lipstick, glitter, call and anything that lands on a tap get a tick, while held weapons stay silent. Patterns all collapse to one tick on iPhone.
- **Off switch:** set `HAPTICS.enabled = false`. There's no in-game toggle yet; one belongs on the start screen if players ask.
- **New weapons:** call `buzz('hit')` wherever damage lands. A new kind (e.g. `whistle`) only needs a new key in `HAPTICS`.

## Suggested priority

1. **Umbrella**, **Group Chat**, **Coaster Shield**: add new mechanics (defense, detection, protection).
2. **Bag Swing** and **Knee Strike**: they add the two range classes (`radius`, `close`), so building them also builds the `range` field the other close-range moves need.
3. **Water Bottle**, **Alarm Whistle**: the ones people will screenshot.
4. Everything else.

## Adding a weapon

1. Add an entry to `WEAPONS` in `src/data.js` (`id`, `name`, `icon`, `mode`, stats, `unlock`, `hint`, and `range` once that field exists).
2. If it uses a new `mode`, add a handler and wire it into the pointer handlers in `BarScene.create()` and `step()` in `src/game.js`.
3. Extend the number-key handler past 4 if the bar grows.
4. Update this file.
