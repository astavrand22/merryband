# Status: the doc vs what's built

_As of 2026-09-28. Compares `docs/LEVELS.md` against `main` at PR #20 (Neon Noir merged). Read `LEVELS.md` first; this is the delta._

## The short version

Level 1 has moved well past what `LEVELS.md` describes, but in a different direction than the doc's own roadmap. Instead of the doc's "before sharing" polish (petition link, guided opening, sound), the work went into **real-world action** (a donation panel, safety tips, sharing) and a whole **legal-education content layer** the doc doesn't mention. Three things are now true that the doc doesn't capture:

1. `LEVELS.md` is stale. Its "Level 1 as built" and "gaps" sections predate ~15 merged PRs.
2. A parallel architecture exists — codex, armor system, scenarios, a validation gate, a crew prototype — none of it wired into the game, and its build gate currently **fails**.
3. The two tracks pull in opposite directions on one design question (below), and nothing reconciles them yet.

## Level 1: the doc's gap list, rechecked

The doc's "Gaps in what's built" list, against `main` today:

| Doc says | Now | Note |
|---|---|---|
| No petition URL or cause copy | **Still open** | `CAUSE.url` is `''`; copy is placeholder |
| No sound or haptics | **Half done** | Haptics shipped (PR #6). No sound |
| Nothing persists (best score, gold lipstick, unlocks) | **Half done** | Best score saved to `localStorage`; gold lipstick and weapon unlocks still reset every run |
| Config in HTML, not data files | **Half done** | Split to `src/data.js`, and a real `content/*.json` layer exists — but villains/weapons are still JS objects, not the `villains.json`/`weapons.json` the doc wanted |
| Villains differ only by the flag | **Improved** | Tell-text callouts ("Following her"), per-villain end-screen epilogues, and male/female looks (creeps 99% men) add personality |
| No onboarding | **Still open** | The tips page is education, not the guided opening the doc specced |
| Wolf and Mogul not in | **Still open** | As designed |

Shipped since the doc that it doesn't list at all: donation panel (Every.org, 3 legal-aid orgs), share-your-score card (Threads/Instagram), feedback page + `CONTRIBUTING.md`, real-life safety tips, the copy rewrite, Neon Noir restyle, and Cloudflare deploy config.

## The doc's evolution waves, scored

- **Before sharing:** petition link ❌, guided opening ❌, sound ❌ (haptics ✅), save best score ✅. **1 of 4.**
- **Feel alive:** phases ❌, coaster ❌, bartender/"Ask for Angela" ally ❌ (it exists only as a tip), women-at-bar react ❌, Wolf cameo ❌. **0 of 5.**
- **Extensible:** split to data ⚠️ (partial), sprites ❌, level select ❌.

## What the doc doesn't cover

Four tracks now exist that `LEVELS.md` predates or ignores:

- **Content legal layer** (`content/`, PR #10). A codex of 17 cards across three tiers (stable / federal / volatile), 12 armor layers, 3 composite scenarios, an invented-name registry. Data, not code, so non-engineers can review it.
- **Fictionalization + safety gates** (`docs/FICTIONALIZATION.md`, `docs/SAFETY.md`). Hard content rules: scenarios are composites of ≥3 unrelated sources, no real people, the assault is never depicted, a named human must sign off.
- **Validation gate** (`tools/validate.mjs` + CI). Enforces the above. **Currently fails on purpose** — see blockers below.
- **Crew mechanic** (`src/crew.js`, `src/bystander.js`, `crew-test.html`, PR #8). Creeps team up; bystanders break the link via the five Ds. Prototype only, not wired into `game.js`.

The governing rule of the content layer — **"the law is his armor, not her sword"** — is a real design decision the level doc never states. It says legal mechanisms appear as protection to strip, never as weapons the player picks up. That directly shapes how the codex could ever surface in the game.

## Ship blockers (from `node tools/validate.mjs`)

The content gate reports **7 blockers**. None are code; all are review/legal:

- **3 scenarios** (`sc-001`, `sc-002`, `sc-003`) have no named reviewer. A tool can't sign off (`FICTIONALIZATION.md` §6).
- **4 tier-3 codex cards** carry unresolved conflicts on live legal deadlines: California and NYC lookback windows (sources disagree on filing dates), the lookback-windows card overall, and Title IX status (contested, fast-moving). These need primary-source verification, not law-firm marketing pages.

Until these clear, no content ships, and `content/README.md` says integration shouldn't begin.

## Proposed next steps

Ordered by what unblocks the most:

1. **Update `LEVELS.md`.** It's the single biggest gap — it no longer matches the game and doesn't mention the content layer, armor system, crew, or validator. Reconcile the two tracks in the doc so the roadmap is real again. (Cheap, and everything else is easier once the map is right.)
2. **Finish the "before sharing" wave for Level 1**, since it's the tutorial and the thing people share:
   - Real petition link + cause copy in `CAUSE` (needs the partner org's wording).
   - A 10-second guided opening: one Spiker, "wait for the flag," "strike."
   - Sound (haptics already done).
   - Persist gold lipstick and unlocks like best score already is.
3. **Clear the 7 validator blockers** in parallel — they're the gate for anything from the content layer. Name reviewers on the 3 scenarios; verify or park the 4 tier-3 cards against primary sources.
4. **Decide the integration question before building more of it.** The content layer and the game meet at "law is his armor." Pick one: (a) a codex the player unlocks between levels, (b) the armor/"one voice" system as the Level 4 boss, or (c) keep content as a companion and don't fuse it. This decision blocks the armor work and the crew wiring.
5. **Then** the doc's build order resumes: split villains/weapons to data, level select, Level 2 (the Wolf, Group Chat ultimate).

## Open questions still open

From the doc, still unanswered:

- Separate levels, or one continuous night?
- Do unlocks carry across levels, or restart at Keys each time?
- Which partner org backs each cause card, and have they seen the game? (Blocks step 2's petition copy and the donation recipients.)
- Game name — renamed to "RedFlag" on 2026-09-28 (was the placeholder "Keys Out").

New ones this comparison surfaces:

- Who is the named reviewer for scenarios, and do they need legal counsel for tier-3? (Blocks the content layer entirely.)
- Does the codex/armor track ship as part of RedFlag, or become its own thing? The two have different tones, audiences, and review burdens.
