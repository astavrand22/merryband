# Crews

Sometimes creeps team up. A crew is two or three villains sharing one plan. While they're linked they're stronger than the sum of their parts, and you can't win by out-fighting them. You break the link: separate them, expose the plan, or get enough bystanders moving that the plan falls apart.

This is a prototype. It isn't wired into `index.html` yet. Try it by opening `crew-test.html`.

## Files

- `src/bystander.js`: bystander willingness and the five abilities
- `src/crew.js`: the crew's plan, link strength and roles
- `src/crew-test.js` and `crew-test.html`: a circles-only test scene (kept out of the live site by `.assetsignore`)

Load order matters: `bystander.js` before `crew.js`. Both are plain scripts like the rest of the game.

## How a crew works

The plan runs on its own: `approach → separate → isolate → exit`. If it reaches the end before the crew is broken, the round is lost. The crew is broken when its **link** hits 0 or the plan's **exposure** hits 1. A stronger link speeds the plan up; exposure slows it down.

Each creep has a role, and each role has one weakness:

| Role | Job | Weak to |
| --- | --- | --- |
| Distractor | Pulls the target's friend away | Document |
| Isolator | Works on the target | Distract |
| Blocker | Runs interference on bystanders | Direct |

Aiming the matching ability at the right role does 1.6x. In the test scene an ability is aimed at the creep nearest to the bystander, so where people stand matters.

## Bystanders and the five Ds

| Ability | Needs willingness | Effect |
| --- | --- | --- |
| Direct | 0.75 | Big hit to the link |
| Distract | 0.40 | Medium hit to the link |
| Document | 0.35 | Exposes the plan, some link damage |
| Delegate | 0.30 | Staff arrive after 4s and break the crew outright |
| Delay | 0.20 | Checks in on the target afterward (heals) |

Willingness isn't fixed:

- **Ask them by name** (+0.35). Asking the same person again within 2.5s adds nothing.
- **Eye contact** (+0.10).
- **Social proof**: each nearby person who is helping raises willingness, up to +0.36.
- **A generic shout** ("someone help!") barely works, and works less the bigger the crowd. This is the bystander effect, on purpose: pointing at a specific person with a specific ask is what works.

## Tuning

Everything is a constant at the top of each file: `ABILITY_CONFIG` and `BYSTANDER_TUNING` in `bystander.js`; `ROLE_WEAKNESS`, `PHASE_DURATION`, `WEAKNESS_MULTIPLIER` and `CREW_TUNING` in `crew.js`. All numbers are first-pass guesses.

The one dial for difficulty is `CREW_TUNING.planPace` in `crew.js`. It scales how fast the plan runs. It starts at 0.4 (a fully linked crew finishes in about a minute); raise it toward 1 for a harder round, lower it for an easier one.

## Content rules still apply

Crews follow [CONTRIBUTING.md](../CONTRIBUTING.md). The plan is an abstract state machine, not a playbook, and nothing depicts harm: a failed round just ends. Keep the RAINN line on any screen that deals with the subject.

## Not built yet

- Wiring crews into `game.js` (spawns via `shouldSpawnCrew(level)`, real characters instead of circles)
- Anything that lowers the target's wellbeing, so Delay's heal currently has nothing to heal
- Sound and haptics for a broken crew

## In the game (branch `crew-in-game`)

The real game now has crews and an **Ask** weapon slot (🙋, unlocked from the start).

- **Ask**: select it, then tap a bystander to ask for help. Tap a crew member first to aim the help at them.
  Bystanders show a name (Bouncer, Regular, Waiter, Friend, Phone), and a willingness bar with a tick at the point they'll act.
  Each crew member is tagged "weak to: <Helper>". Matching the helper to the tag hits harder.
- **Crew**: one per run (`CREW` in `src/data.js`), arriving after `firstAt` seconds. Members wander as a group and never flag while linked,
  so weapons can't hit them (the old unflagged penalty applies). Break the link with helpers, or the plan bar runs out and they all flag together and act like normal villains.
- **Pace**: the test page uses `CREW_TUNING.planPace` (0.4, about 57 s idle). The game gives each crew its own `paceScale` so the plan takes `CREW.planSeconds` (30 s) and fits in a 60 s level.
- **Staff (Waiter)** take `CREW.staffHit` (60) off the link instead of ending the crew (`CREW_TUNING.staffBreaks = false` in game).
- **Friend (Delay)** restores some of your most shaken friend's comfort bar, only when one is hurt.
- Ordinary spawns pause while a crew is due, so a full room can't block it.

## Level 1 status
Crews are switched off for Level 1 (`CREW.enabled = false` in `src/data.js`) and saved for a later level.
The Ask button stays: helpers act on single flagged creeps (see `WEAPONS.md`). Creeps also arrive by stage
(`STAGES`: Spiker at the start, Follower at 18 s, Grabber at 36 s), with a short pop-up the first time each
type appears (`INTRO`).
