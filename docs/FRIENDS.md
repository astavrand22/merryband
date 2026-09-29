# Friends

You aren't the one being targeted. Three friends sit at the counter and you look out for them. This is the whole player-facing loop of Level 1, so it's worth knowing where each knob is.

## Comfort

Each friend has a comfort bar (0-100), stored as `wellbeing` on `game.friends[i]` (the same name `Crew.applyEffect('heal')` writes to). A creep who reaches her, or her drink, takes that villain's `hit` (`VILLAINS[kind].hit`) off it, scaled by her trait's `hitScale`. Hitting a bystander shakes the nearest friend (`FRIENDS.bystanderHit`). If any friend's bar reaches 0 the night is over.

Nothing is ever shown happening. Her bar drops, she flinches, and a line says who it happened to (`reachedText`).

Ways her bar goes back up: the Friend helper you can Ask for, and the **You ok?** weapon (`WEAPONS`, id `checkin`).

## Who they go for

Followers and Grabbers pick the friend with the lowest comfort when they flag (`weakestFriend()`). Ties are random. The Spiker goes for a drink, and each drink belongs to one friend.

`FRIENDS.approachScale` slows their walk, because the counter is a shorter trip than the old walk to the player.

## Traits

`FRIEND_TRAITS` in `src/data.js`. Traits are shuffled across the three seats every run, and each friend's trait shows as a small label over her bar.

| Trait | Notices a creep | Contact costs her | Shuts a creep down herself | False alarms |
| --- | --- | --- | --- | --- |
| Nervous | 1.4 s before his flag | x1.3 | never | yes |
| Oblivious | never | x1.15 | never | no |
| Assertive | 0.6 s before his flag | x0.8 | 35% of the time | no |

- **Notice** is a hint, not a flag. A friend says something ("Something's off about him.") and a ring shows on the creep, but he hasn't flagged, so hitting him still costs points. Only the red flag is proof.
- **False alarm**: every `FRIENDS.falseAlarmEvery` seconds a nervous friend points at someone harmless, in the same words. That's on purpose: a call-out is a reason to look, never a reason to hit.
- **Shuts it down**: when a creep reaches an assertive friend she may handle it. He backs off, she loses nothing, you get no points. It's counted in `self_saves` (see `docs/ANALYTICS.md`).

## Crews

A crew picks one friend, drains her bar as its plan advances (never below `CREW.drainFloor`), and goes for her if the plan finishes. See `docs/CREW.md`. Crews are still off in Level 1 (`CREW.enabled = false`).

## Content rules

Friend lines are about a person being worth watching, never about what he would do. No line and no animation depicts contact. See `docs/SAFETY.md` and `CONTRIBUTING.md`.

## Not built yet

- Friends who move around the room.
