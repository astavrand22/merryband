# Weapons

Reference for the current arsenal and a backlog of proposed weapons. The live definitions are in the `WEAPONS` array in the `CONFIG` block of `index.html`.

## Shared rules

These apply to every weapon:

- Hitting a **bystander** costs a heart (1.2s grace before the same bystander can cost another).
- Hitting a **villain before his red flag** costs 50 points and resets the combo.
- **Tagged** villains (see Glitter) take double damage from everything.
- Weapons unlock at a score threshold (`unlock`) and are selected from the bottom bar or with number keys.

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
- **Adding a 5th weapon needs code.** Number hotkeys are hardcoded to 1–4 (`keydown` handler), and each `mode` has its own handler function (`useKeys`, `firePin`, `sprayTick`, `useGlitter`).

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

## Suggested priority

1. **Umbrella**, **Group Chat**, **Coaster Shield**: add new mechanics (defense, detection, protection).
2. **Fake Boyfriend Call**, **Water Bottle**: the ones people will screenshot.
3. Everything else.

## Adding a weapon

1. Add an entry to `WEAPONS` in `CONFIG` (`id`, `name`, `icon`, `mode`, stats, `unlock`, `hint`).
2. If it uses a new `mode`, add a handler and wire it into the pointer handlers and `update()`.
3. Extend the number-key handler past 4 if the bar grows.
4. Update this file.
