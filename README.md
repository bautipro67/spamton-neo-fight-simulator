# Spamton NEO Fight Simulator

**▶ Play now: https://bautipro67.github.io/spamton-neo-fight-simulator/**

Play the Spamton NEO boss fight from **DELTARUNE Chapter 2** for free in your browser, on PC or mobile. No download needed.

![Spamton NEO Fight Simulator](og.png)

- Fight alongside Susie and Ralsei: FIGHT, ACT (Check, Snap, SnapAll), Susie's Snap / Supercharge, Ralsei's Snap / FluffyGuard, MAGIC, ITEM and DEFEND.
- The yellow SOUL: shoot with Z, hold and release to fire a BIG SHOT. Shoot the bullets Spamton NEO throws at you.
- The battle logic is ported from the original game's code, so it plays like the real fight.
- Every attack of his normal-route fight, in order: Flying Heads, the RECREW columns, the heart on a wire, the phone call, the phone hands, the face attack and the NEO finale.
- **The Weird Route fight** (BEGIN → WEIRD ROUTE, or [`?weird`](https://bautipro67.github.io/spamton-neo-fight-simulator/?weird)): Kris alone against Spamton NEO in front of the Dark Fountain, with no sparing, his lines, Kris's X-Slash and FriedPipis ACTs, and the route's own ending.
- **The scenes around the fight**: Spamton NEO drops in on Kris, Susie and Ralsei arrive and the coaster ride begins; after the battle, his last words and the items (the ShadowCrystal, then the PuppetScarf or the Dealmaker, depending on how you won). The Weird Route has its own scenes at the Dark Fountain. Turn them off with SCENES in OPTIONS.
- **Practice mode** (Bad Time Simulator style): dodge the attacks in order; lose your HP bar and the attack restarts, survive it and you move on. Pick the starting attack and 90 / 45 / 1 HP. Scores with ranks and a saved best for full runs. Direct link: [`?practice`](https://bautipro67.github.io/spamton-neo-fight-simulator/?practice).
- **EQUIPMENT**: pick each character's weapon and armors (any Chapter 2 gear they can use) and the items you bring into the fight.
- **Codes**: type a secret code in the Codes box under the game to unlock extras.
- **OPTIONS**: volume, easy mode (half damage), scenes on/off, **SOUL hats** and **CONTROLS** to remap every button on keyboard and gamepad. Options are remembered in the browser.
- **Pause** with Esc / P (Start on a gamepad): continue, restart, volume, quit to title.
- **Sandbox mode** to repeat any attack freely: [`?sandbox&attack=0`](https://bautipro67.github.io/spamton-neo-fight-simulator/?sandbox&attack=0) (`[` / `]` switch attacks, `I` invincibility).
- Touch controls on phones and tablets, fullscreen button.

Also by the same fan: [Jevil](https://bautipro67.github.io/jevil-fight-simulator/), [Roaring Knight](https://bautipro67.github.io/roaring-knight-fight-simulator/) and [Gerson](https://bautipro67.github.io/gerson-fight-simulator/) fight simulators. See [all the DELTARUNE fight simulators](https://bautipro67.github.io/).

## Controls

| Key | Action |
|---|---|
| Z / Enter | Confirm |
| Z (hold and release) | BIG SHOT (yellow SOUL) |
| X / Shift | Cancel |
| Arrow keys | Move |
| Esc / P | Pause |

**Gamepad** (Xbox, PlayStation, Switch): A / Cross confirms, B / Circle cancels, D-pad or left stick moves, Start pauses. Browsers only turn on sound after a click or key press, so click the page once.

## Run it locally

```
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Self test

```
node tools/selftest/run.mjs
```

Plays the whole simulator by itself in a headless Chrome or Edge and lists what passed and what broke (an error, a missing file or sound, a scene or fight that never reaches its end): the scenes, the normal and Weird Route fights with and without them, practice mode, every attack in the sandbox, the title menus (options, controls, equipment), a gamepad, the pause menu, the game over, the Codes box, every weapon, armor, item and SOUL hat, and a fight using every battle option. Then it checks the page at desktop, phone and tablet sizes, touch controls included. Nothing to install, only Node 22 or newer and Chrome or Edge. `--quick` skips the sandbox runs and the screen checks, `--only <text>` runs the scenarios whose name has that text (`screen` for the screen checks), `--list` lists them, `--url <address>` tests a published copy such as the GitHub Pages site, and `--shots <folder>` saves the last frame of each. The scenarios are in `tools/selftest/sim.js`.

## How it was made

- `tools/datawin.py` reads GameMaker `data.win` files (sprites, fonts, sounds).
- `tools/gmdis.py` decompiles the game's bytecode so the fight could be studied.
- `tools/extract_assets.py --chapter 2` extracts only the assets this fight uses into `assets/`.
- `tools/render_rooms.py` draws the mansion rooms (their tile and asset layers) into pictures for the scenes.
- `tools/stamp_version.py` stamps a version on every file before publishing, so browsers never mix old and new files.
- `src/runtime/` is a small GameMaker-like engine in JavaScript; `src/battle/` and `src/sneo/` are the ported fight.

## Credits

DELTARUNE and all its characters, graphics, music and sounds are © Toby Fox. This is a free, non-commercial fan project, not affiliated with Toby Fox or 8-4. If you enjoy it, get the real game: https://deltarune.com

---

*Simulador de la pelea contra Spamton NEO de DELTARUNE, jugable gratis en el navegador.*
