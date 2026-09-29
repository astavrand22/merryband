# Contributing to RedFlag

Thanks for wanting to help. There are two ways in.

## 1. Suggest something

No code needed. Use the in-game [feedback page](feedback.html) or [open an issue](https://github.com/astavrand22/merryband/issues/new/choose) and pick a template: new villain, new weapon, cause to feature, bug, or general idea.

## 2. Propose a change (pull request)

1. **Fork** this repo and create a branch (`villain-fake-caller`, `fix-spray-hitbox`, etc.).
2. **Make your change.** The game uses Phaser, loaded from a CDN, with no build step. Most tuning lives in `src/data.js`; game logic is in `src/game.js` and screens in `src/ui.js`:
   - `VILLAINS` and `SPAWN_WEIGHTS`: new villains need an entry here (with a `tellText` and an `epilogue`) plus behavior in `step()` in `src/game.js` if they don't reuse `target-drink`, `approach` or `lunge`
   - `WEAPONS`: new weapons need an entry here plus a handler if they don't reuse `tap`, `hold`, `cone` or `area`
   - `CAUSE`: the end-screen petition
3. **Test it** by opening `index.html` in a phone browser and a desktop browser. Play a full 60-second round.
4. **Open a pull request** against `main` and fill in the template. Screenshots or a short clip help a lot.

Keep PRs small and focused: one villain, one weapon or one fix per PR.

## Content guidelines

This game is about fighting back, not about showing harm.

- Villains are fictional. No real people, no identifiable groups, no stereotypes by race, religion, nationality, class or body type.
- No depictions of assault. Villains are stopped *before* they act; the red flag is the tell.
- Violence stays cartoonish: knockouts, stars, glitter. No blood or gore.
- Causes and petitions must be real, verifiable, and focused on survivors, prevention or legal reform.
- Real-life tips must link to a credible source (a safety org, police department, health site or major news outlet). Keep them practical and never blame the person it happened to.
- Keep the RAINN support line on any screen that deals with the subject.

## Contribution terms

This project is **not open source**. The code and assets are © astavrand22, all rights reserved (see [LICENSE](LICENSE)). Forking on GitHub to prepare a pull request is fine; publishing or reusing the game elsewhere is not.

By opening a pull request, you confirm that:

- the contribution is your own original work, or you have the right to submit it, and
- you grant astavrand22 a perpetual, worldwide, royalty-free, irrevocable license to use, modify, distribute and relicense your contribution as part of this project.

If you're not comfortable with those terms, open an issue with your idea instead.

## Conduct

Be kind. Assume good intent. Many people here have lived experience with this subject; don't ask anyone to share it, and don't share anyone else's.
