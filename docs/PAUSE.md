# Pause and pop-up cards

**Pause.** The Pause button (top right), `Esc` or `P` pauses instantly, and so does leaving the tab. The pause screen
lists what you have met so far (red flag rule, friends, unlocked tools, creeps and tips seen) as a refresher, and
always shows the RAINN line (SAFETY.md: pause is always available). Resume with the button, `Esc`, `P` or `Enter`.

**Pop-up cards.** The first time something new matters, the game holds and a card explains it: a new creep
(`VILLAINS[k].intro`), a newly unlocked tool (`WEAPONS`), a friend's bar getting low ("You ok?"), two flagged creeps
at once (Help), the first friend call-out, and a crew when crews are on. Text for the last four lives in `CARDS`
in `src/data.js`. Cards queue if one is already up, and are never stacked over the pause screen.

**Seen once.** Cards are remembered per browser in `localStorage` (`redflag.seen.v1`, no login, nothing sent
anywhere). "Show pop-up tips again" on the pause screen clears it. `INTRO.everyRun = true` brings creep cards
back every run; `INTRO.enabled = false` turns cards off (tests do this).

While held, tweens and the scene clock are paused. Helper cooldowns and staff arrival times are shifted by the
time held, since the Phaser clock's `now` keeps advancing while paused.

## Simple first run
A player's first run is kept light (`EASY` in `src/data.js`): the bar shows only Help and Knee, friends
have no call-outs or false alarms. From the second run everything is on, tools
unlock by score as before, and the cards introduce each one. Runs finished are counted in this browser only
(`redflag.runs.v1`). The three-tool bar now stays that way in every run (`EASY.toolsAlways`); Pepper, Glitter and Fake Call are parked in `WEAPONS` and come back by setting it to false. Set `EASY.enabled = false` to skip all of this. Live narration is one short line at a time (the
next action); longer explanations live in the pop-up cards and the pause screen.

## Swipe to part the crowd
Drag a finger across the floor and bystanders in the path step aside (each person once per swipe; they drift
on again afterward). A quick tap still uses the selected tool, but it now fires when you lift your finger, so a
swipe never hits anyone. Tuning is `SWIPE` in `src/data.js`. A one-time "Crowded? Swipe" card shows when six or
more bystanders are on screen. Hold-to-spray and Fake Call (parked tools) still act on touch-down.

## Result pop-up
When a run ends, a celebration pop-up (confetti on a win) sits over the end page: score, "Who you took out"
(creeps by type, then one line per way you dealt with them: knee, bystander
help, friend handled it), and one "Try next time" suggestion. Lines only appear for what you actually used
(`TALLY_LINES`, `NEXT_TIME` in `src/data.js`). "Continue" reveals the page behind it: tips, share, donation
and play again. Checking in on a friend (You ok?) now earns points (`points` on the tool, 40).

## Less live text
One message at a time. The bottom line (`narrate`) carries only the next action; flag narration, duplicate toasts, "OOF!" and the takedown caption are gone. A flag's tell text ("Following her") shows once per browser, tool hints once per tool per run, and helpers show one line each. The takedown jokes now live on the result pop-up.

## Big-face takedowns
**Parked.** Switched off for Level 1 (`BIGFACE.enabled = false` in `src/data.js`), saved for a later level. The code and lines are all still there; set it back to `true` to bring it back.

Now and then a knee or spray takedown fills the screen with the creep's pained face (his own skin, hair and beard, squeezed eyes, sweat, orbiting stars) and a petty line in a speech bubble, while the game slows to a crawl for about two seconds. Lines are `BIGFACE.lines` plus per-villain `pain` lists in `src/data.js`; lines don't repeat within a run. `BIGFACE.chance` and `ramp` set how often (about once or twice a run: never before your third takedown (`minKos`) and never within `minGap` seconds of the last one), and it is calmer with reduced-motion (static, smaller). `BIGFACE.enabled = false` turns it off.
