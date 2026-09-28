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
| `radius` | A circle around the player | Anything inside it |
| `close` | Only once a villain is on top of you | **Grabbers only** (lunge or windup, inside the close zone) |

Only Grabbers ever reach the player fast enough for close range to matter. Followers arrive slowly and Spikers never leave the bar, so close-range moves don't apply to them.

## Current weapons (Level 1, *Last Call*)

| # | Weapon | `id` | Unlock | `mode` | Stats | Behavior |
|---|---|---|---|---|---|---|
| 1 | 🔑 Keys | `keys` | 0 | `tap` | `dmg:1`, `cooldown:0.22` | Hits the character under the pointer. |
| 2 | 📌 Hatpins | `hatpin` | 300 | `hold` | `dmg:0.5`, `rate:0.11` | Auto-fires at the pointer while held. Single target. |
| 3 | 🌶️ Pepper | `spray` | 700 | `cone` | `dps:1.8` | Cone from the player, ~0.52 rad wide. Damages and stuns every flagged villain in it. Stuns unflagged villains with no penalty. Hurts bystanders. |
| 4 | ✨ Glitter | `glitter` | 1200 | `area` | `cooldown:5` | No damage. Tags every villain in a radius and **force-flags** them. |

**Gold Hatpins:** pressing the petition button on the end screen sets `goldPin`, which turns hatpin streaks gold. Cosmetic only.

### Known issues / balance notes

- **Hatpins outdamage everything.** Held, they do ~4.5 dmg/sec vs Pepper's 1.8. Pepper only wins when creeps cluster.
- **Glitter force-flags.** An unflagged Grabber you glitter starts his lunge immediately and a Spiker heads for a drink. Good risk/reward, but the hint text doesn't say so.
- **No defensive options.** Every weapon is offense; the only answer to a Grabber lunge is killing him first.
- **Adding a 5th weapon needs code.** Number hotkeys are hardcoded to 1–4 (`keydown` handler in `src/ui.js`), and each `mode` has its own handler function (`useKeys`, `firePin`, `sprayTick`, `useGlitter`).

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

### 📞 Fake Boyfriend Call
- **Mode:** `tap`, 15s cooldown
- **Behavior:** "Oh hey babe, I'm almost at the bar." Every Follower on screen loses interest and leaves. Half points. Toast: *"He respected the imaginary man."*
- **New code:** villain-type filter; "give up and leave" state for Followers.

### ☂️ Umbrella
- **Mode:** new `block` (hold)
- **Behavior:** Hold it open and a Grabber's lunge bounces off, stunning him for 2 seconds. You can't attack while it's open. Tapping it closed jabs for 1 damage.
- **Why:** First defensive weapon.
- **New code:** `block` mode; intercept the Grabber's `hurt('Grabbed.')` path.

### 💄 Lipstick
- **Mode:** `tap`
- **Behavior:** Writes CREEP across his forehead. He's permanently tagged, and bystanders near him boo and slow him down.
- **Why:** Turns the crowd into a mechanic.
- **New code:** label rendering on the character; proximity slow from bystanders.

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

Added from Abi's notes: realistic self-defense moves, a loud whistle, and a swinging bag. The close-range moves are **Grabber-only**, and the bag works inside a radius around the player.

### 🦵 Knee Strike (self-defense)
- **Range:** `close` (Grabbers only)
- **Mode:** `tap`
- **Behavior:** Only becomes tappable once a Grabber's lunge carries him into the close zone right in front of the player, which is the moment that currently costs a heart (`hurt('Grabbed.')`). A well-timed tap stops him, deals heavy damage (KO on a full-health Grabber) and stuns him for 1.5 seconds. Miss the window and he grabs you as usual.
- **Feel:** A last-chance counter, not a primary weapon. Hitting it before the zone does nothing. Toast: *"Not today."*
- **New code:** a `closeZone` distance from the player origin; a check in the Grabber lunge branch of `step()` (`src/game.js`) that offers the counter before `hurt('Grabbed.')` fires; a "counter window" indicator on the Grabber.

### Other realistic close-range moves
Same `close` rules as the Knee Strike (Grabber-only, inside the zone), each with a different trade-off so the player has a reason to pick between them:

| Move | Behavior | Trade-off |
|---|---|---|
| 🖐️ **Heel-palm strike** | Stuns for 2s, no damage | Safe, but the Grabber survives to try again |
| 💪 **Elbow** | 1 damage, no cooldown, fast | Weakest; good for chaining a combo |
| 🦶 **Stomp** | Stuns and slows the Grabber for 3s | Works only if he's already in windup (before he lunges) |
| 🤸 **Wrist escape** | Cancels a grab that already happened and refunds the heart | Once per run |

The wrist escape is the only one that acts after the grab. It gives the game a way to model "getting out of it" without inventing a new loss state.

### 📣 Personal Alarm Whistle
- **Range:** `any` (screen-wide)
- **Mode:** `tap`, 10s cooldown
- **Behavior:** A screen-shaking blast. Every villain on screen is startled and stunned for 1.5 seconds. A Grabber in windup has it canceled, and a Spiker mid-spike loses his progress. It does no damage. Bystanders wince but take no penalty and turn to look, so villains that stay flagged are easier to spot.
- **Feel:** The panic button for when three things are happening at once. Toast: *"Everybody heard that."*
- **Overlap:** This is close to Dry Shampoo Cloud (a defensive, no-damage clear). The difference is scope: the whistle is screen-wide and short, the cloud is local and lingering. They may not both survive playtesting.
- **New code:** a global `stun` applied to all villains; cancel logic for Grabber windup and Spiker `spiking`; screen shake (respect `reduceMotion`).

### 👜 Bag Swing
- **Range:** `radius`
- **Mode:** `tap`, ~0.6s cooldown
- **Behavior:** Swing your bag in a full circle around the player. Anything inside the radius takes 2 damage and is knocked back. Radius is about a quarter of the play-field depth, so it only matters when things get close (Followers that make it near, Grabbers mid-lunge).
- **Trade-off:** Radius attacks hit bystanders too. If a bystander is inside the ring, it costs a heart like any other bystander hit. That makes it strong late in a crowded level and risky when the bar is full.
- **Variants to try:**
  - **Tote:** larger radius, less damage.
  - **Heavy bag (laptop inside):** smaller radius, 3 damage, longer cooldown.
  - **Contents fly out:** each swing scatters a random item (water bottle, phone, receipt) that hits the nearest creep for a bonus tick of damage. Funny, and hooks into the Water Bottle and Pharmacy Receipt ideas.
- **New code:** a `radius` mode with a circle hit test around `origin()` (`src/game.js`); knockback; a ring/arc animation.

### Open questions
- Should `close` moves auto-trigger when a Grabber enters the zone, or always require a tap? Auto-trigger is easier on phones, but a tap keeps it a skill.
- How big is the close zone on small screens? It should scale with `playerY - horizonY`, like the Follower and Grabber speeds do.
- Should the bag hit bystanders in the ring (risky) or spare them (easier)? Currently written as risky, to match the other weapons.

## Suggested priority

1. **Umbrella**, **Group Chat**, **Coaster Shield**: add new mechanics (defense, detection, protection).
2. **Bag Swing** and **Knee Strike**: they add the two range classes (`radius`, `close`), so building them also builds the `range` field the other close-range moves need.
3. **Fake Boyfriend Call**, **Water Bottle**, **Alarm Whistle**: the ones people will screenshot.
4. Everything else.

## Adding a weapon

1. Add an entry to `WEAPONS` in `src/data.js` (`id`, `name`, `icon`, `mode`, stats, `unlock`, `hint`, and `range` once that field exists).
2. If it uses a new `mode`, add a handler and wire it into the pointer handlers in `BarScene.create()` and `step()` in `src/game.js`.
3. Extend the number-key handler past 4 if the bar grows.
4. Update this file.
