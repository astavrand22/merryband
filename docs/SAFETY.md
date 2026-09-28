# Tone and safety rules

The audience includes survivors. Some of them will not know they are about to
encounter this material. Design for that reader first; she is the one with the
most to lose and the most to gain.

These are product constraints, not aspirations. Each one is testable and several
are enforced by `tools/validate.mjs`.

---

## 1. The game starts after

**Never depict the assault.** No flashback, no scene, no implied sequence, no
audio, no "tasteful" cut. Scenarios open in the aftermath: the complaint that
went nowhere, the transfer, the NDA on the table, the kit in the box.

This is a safety rule and a better creative constraint. The fight is against the
man and the system that kept him. Reenactment would make the player a spectator
of the thing she survived.

Enforced: scenario text is checked against a depiction denylist. Reviewer
confirms on sign-off.

---

## 2. Anger yes, despair no

Every level that teaches a gap must surface the corresponding action **before
the player can leave it.** Not a link buried in a menu — an explicit beat.

- Gap in the law → the actual bill or reform effort, and who is working on it
- Gap in resources → the funding ask, in units a person can grasp
- Gap in enforcement → the oversight body, the org that litigates it

A level that teaches a woman the system is rigged and then puts her down is a
harm we manufactured. If we cannot name an action for a gap, we do not ship that
gap as a level. It can live in the codex as a fact; it cannot be a set piece.

---

## 3. Entry and exit

- **Content warning before first play**, specific about what is and is not in
  the game: system obstruction, aftermath, stylised combat; no depiction of
  assault, no gore, no real people's stories.
- **Persistent off-ramp on every screen.** Low-key, always in the same place,
  never a modal. One tap to real help.
- **Pause is instant and always available**, including mid-combat and mid-cutscene.
- **Skip is available for every narrative beat.** Nobody is made to sit through
  anything to progress.
- **No autoplay** into a heavier scene from a lighter one.

Resource list (verify links quarterly; see `content/codex/`):

- RAINN National Sexual Assault Hotline — 800-656-4673, online chat at rainn.org
- Victim Rights Law Center — legal help for survivors
- Legal Momentum
- State and territory sexual assault coalitions (NSVRC maintains the directory)
- Local legal aid

---

## 4. Not legal advice, and we mean it

The codex explains how things generally work and points to lawyers. It never
tells a player whether she has a case, whether her deadline has passed, or what
to do.

Every tier 3 card carries a visible "verify this — it changes" marker and a
"talk to a lawyer" path. An expired lookback window presented as open is not a
stale fact; it is harmful misinformation to the one player who most needed it to
be right. See `tools/validate.mjs`.

---

## 5. Petitions target policy, never a person

Hard line. With a revenge-framed game attached to real petition and donation
tooling, a petition aimed at an individual is the thing that could genuinely
hurt someone and end the project.

- Petition targets: bills, appropriations, agencies, oversight bodies,
  institutional policies.
- Never: a named individual, a specific accused person, a private citizen, an
  employee of an institution.
- No user-generated petition text ships without review.
- The donation recipients stay as chosen (Victim Rights Law Center, Legal
  Momentum, and comparable orgs). Recipients are organisations, never
  individuals or legal funds for a specific case.

---

## 6. No targeting surface

The game must not become a tool for aiming at real people.

- No user-submitted villain names, likenesses, or descriptions.
- No free-text fields that render to other players.
- No "add your own predator" feature, however requested. This will be
  requested. The answer is no.
- If we ever add accounts, no public profiles and no player-to-player messaging.

---

## 7. Minors

Assume some players are under 18. Do not gate on self-reported age, but:

- No sexual content of any kind.
- Resource list includes youth-appropriate paths (Childhelp, RAINN).
- Scenarios involving institutional abuse of minors stay at the institutional
  level — the failure to act, the transfer, the ignored report. Never the child,
  never the act.

---

## 8. Review cadence

- Resource links and phone numbers: **quarterly**
- Tier 3 codex cards: **on expiry, build-enforced**
- Tier 2 codex cards: **annually**
- Safety copy and content warning: **on any change to scenario content**
- Whole-game tone pass: **before each public release**
