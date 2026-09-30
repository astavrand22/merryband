# Pause and pop-up cards

**Pause.** The Pause button (top right), `Esc` or `P` pauses instantly, and so does leaving the tab. The pause screen
lists what you have met so far (red flag rule, friends, unlocked tools, creeps and tips seen) as a refresher, and
always shows the RAINN line (SAFETY.md: pause is always available). Resume with the button, `Esc`, `P` or `Enter`.

**Pop-up cards.** The first time something new matters, the game holds and a card explains it: a new creep
(`VILLAINS[k].intro`), a newly unlocked tool (`WEAPONS`), a friend's bar getting low ("You ok?"), two flagged creeps
at once (Ask), the first friend call-out, and a crew when crews are on. Text for the last four lives in `CARDS`
in `src/data.js`. Cards queue if one is already up, and are never stacked over the pause screen.

**Seen once.** Cards are remembered per browser in `localStorage` (`redflag.seen.v1`, no login, nothing sent
anywhere). "Show pop-up tips again" on the pause screen clears it. `INTRO.everyRun = true` brings creep cards
back every run; `INTRO.enabled = false` turns cards off (tests do this).

While held, tweens and the scene clock are paused. Helper cooldowns and staff arrival times are shifted by the
time held, since the Phaser clock's `now` keeps advancing while paused.

## Simple first run
A player's first run is kept light (`EASY` in `src/data.js`): the bar shows only Ask, You ok? and Knee, friends
have no call-outs or false alarms. From the second run everything is on, tools
unlock by score as before, and the cards introduce each one. Runs finished are counted in this browser only
(`redflag.runs.v1`). Set `EASY.enabled = false` to skip this. Live narration is one short line at a time (the
next action); longer explanations live in the pop-up cards and the pause screen.

## Result pop-up
When a run ends, a celebration pop-up (confetti on a win) sits over the end page: score, "Who you took out"
(creeps by type, then one line per way you dealt with them: knee, pepper spray, glitter, fake call, bystander
help, friend handled it), and one "Try next time" suggestion. Lines only appear for what you actually used
(`TALLY_LINES`, `NEXT_TIME` in `src/data.js`). "Continue" reveals the page behind it: tips, share, donation
and play again. Checking in on a friend (You ok?) now earns points (`points` on the tool, 40).
