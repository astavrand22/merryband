# Content layer

The legal education layer for the game. Data, not code — so it can be reviewed
by people who don't read JavaScript, and so it can be made to expire.

```
docs/
  FICTIONALIZATION.md      how scenarios are built without using anyone's real story
  SAFETY.md                tone rules, content warnings, off-ramps, petition boundaries
content/
  README.md                this file
  armor/armor-layers.json  the law as his armor — 12 layers
  codex/tier1-stable.json  principles that don't move
  codex/tier2-federal.json federal frameworks, annual review
  codex/tier3-volatile.json state law and live deadlines, hard expiry
  scenarios/               three hand-written composites
  registry/                invented-name registry
tools/validate.mjs         build gate
```

None of this is wired into `src/` yet. It is content and rules only — the armor
layers describe mechanics that `src/game.js` does not implement. Integration is
a separate piece of work and should not start until the ship blocks below clear.

## The central design rule

**The law is his armor, not her sword.** Legal mechanisms appear as protection
the player has to strip. They are never weapons she picks up, because that would
tell her something false about how this actually goes.

Weapons stay unbound by realism — creative, absurd, cathartic. The armor carries
the entire education. Fusing the two registers made the revenge less satisfying
*and* the law less accurate.

The spine of the armor system is `the_one_voice`: he is functionally invulnerable
against a single accuser and vulnerable against eleven. That is both the truest
mechanic available and the emotional argument for the petition layer.

## Running the gate

```
node tools/validate.mjs           # errors fail, warnings print
node tools/validate.mjs --strict  # warnings fail too
VALIDATE_AS_OF=2027-01-15 node tools/validate.mjs   # test future expiry
```

Wire it into CI and into the build. It currently **fails**, on purpose.

## What it enforces

- Every codex card has sources with real URLs. No unattributed claims.
- Tier 3 cards carry `expires_on` and the build **fails** when one passes.
- Lookback windows expire independently of their card — a closed window can
  never render as open.
- Cards flagged `CONFLICTING` / `CONTESTED` / `STALE-DATA` must say what to do
  about it, and are blocked from shipping.
- Scenarios need ≥3 unrelated pattern sources (the composite rule).
- Scenarios need a **named human reviewer**. A tool cannot sign off.
- Scenario prose is checked against a depiction denylist and against calendar
  years, which are the usual route to accidental identifiability.
- Every gap-teaching level must declare its action beat (SAFETY.md §2).
- Armor layers can't reference codex cards that don't exist.

## The 7 current blocks

These are real, not placeholders. The build stays red until they clear.

| Block | What's needed |
|---|---|
| CA lookback window | Sources describe two different adult-survivor windows (AB 2777, filing through end of 2026; AB 250, two-year revival into 2027). Both appear to exist with different eligibility. Read the statute text or the California Courts self-help site — law-firm marketing pages are not adequate for a live filing deadline. |
| NYC GMVA window | Sources give two different open/close date pairs. Verify against the Administrative Code amendment. |
| `lookback-windows` card | Blocked until both instances resolve. |
| `title-ix-status` | Genuinely contested; the 2024 rule was vacated and secondary sources already disagree about 2026. Not suitable for a mechanic. Federal Register only. |
| 3 scenarios | Need `reviewed_by` filled in by a person. |

Two more cards ship with constraints rather than blocks: `spousal-exemptions`
(mechanism only, no state count — the circulating numbers trace to a survey from
around 2020) and `kit-backlog-economics` (range with year attached, no single
headline figure — per-kit costs are stale and have almost certainly risen).

## Getting a legal reviewer

`legal_review: "pending"` appears on all three scenarios and it should not stay
that way. Law school clinics and the advocacy orgs already in the donation flow
are plausible volunteers, and that relationship is also a far better route to
prominence for partner orgs than synthetic traffic would have been.

## What's not built yet

- Jurisdiction profiles (`content/jurisdictions/`) — the abstract state profiles
  the conditional armor layers read from. Needs the RAINN state-law database
  mapped to conduct tags first.
- JSON schemas in `content/schema/` — referenced by `$schema` keys, not yet
  written. The validator does the real checking; schemas are for editor support.
- `content/registry/org-denylist.json` — real organisation names that must never
  appear in scenario text.
- The action-beat content itself: for each gap, the actual bill, the org working
  it, the funding ask.
