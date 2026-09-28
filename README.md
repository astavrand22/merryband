# Keys Out

A short arcade game for the browser. You walk home through the city at night and take out fictional predators with everyday objects before they make their move.

Level 1, *Last Call*, is a 60-second night at a bar with three villains (the Spiker, the Follower and the Grabber), five weapons (Keys, Lipstick, Pepper, Glitter and a Fake Call), and a petition card on the end screen.

## Play

Open `index.html` in any browser. It works on phones and desktops, with no install and no login.

## Edit

The game runs on [Phaser](https://phaser.io), a free JavaScript game library loaded from a CDN, so there's still no build step. The code is split three ways:

- `src/data.js`: everything you'd tune (below)
- `src/game.js`: the Phaser scene, meaning the bar, characters, weapons and scoring
- `src/ui.js`: the start and end screens, HUD, weapon bar, best score, score sharing and donation panel

Tuning in `src/data.js`:

- `VILLAINS`: add a villain by adding an entry
- `WEAPONS`: add or adjust weapons
- `CAUSE`: the end-screen petition. Paste the live link into `url`
- `TIPS`: real-life safety tips. One shows on the start screen, two on the end screen (picked by what happened in the run), and all of them on `tips.html`. Each tip needs a source link
- `LOOKS`: how often villains are women (1 in 100) and bystanders are men (1 in 2)
- `DONATE`: the donation panel (on the start and end screens). Each recipient is an Every.org slug or EIN; add or remove entries to change who players can give to. Set `suggestEmail` to the address that should receive "suggest a recipient" messages
- `SHARE`: the end-screen "Share your score" buttons. Threads opens a prefilled post; Instagram shares a story-sized score card through the phone's share sheet (desktop downloads it). Set `url` to the live game link once it has one

## Donations

Gifts go through [Every.org](https://www.every.org), a 501(c)(3), directly to the chosen nonprofit. The game never handles money, and donors get a tax receipt from Every.org. When the game is hosted on a web address, donors land back in the game with a thank-you after giving. Test the flow without real money by changing `www.every.org` to `staging.every.org` in `donateUrl` and paying with card 4242 4242 4242 4242.

## Roadmap

[docs/LEVELS.md](docs/LEVELS.md) documents Level 1 as built, how it should evolve, the designs for Levels 2–5, the build order and open questions.

A prototype of creeps teaming up into crews is in [docs/CREW.md](docs/CREW.md). Open `crew-test.html` to try it.

## Feedback and contributing

- Players can send ideas from `feedback.html`, linked on the start and end screens. It opens a pre-filled GitHub issue. To also offer a private email option, set `FEEDBACK_EMAIL` at the top of its script.
- Developers can propose changes by pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the steps, content guidelines and contribution terms.

## Support

If this subject brings something up, RAINN is there 24/7: [rainn.org](https://rainn.org) or 800-656-4673.
