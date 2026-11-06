# Spamton NEO Fight Simulator

**▶ Play now: https://bautipro67.github.io/spamton-neo-fight-simulator/**

Play the Spamton NEO boss fight from **DELTARUNE Chapter 2** for free in your browser, on PC or mobile. No download needed.

![Spamton NEO Fight Simulator](og.png)

- Fight alongside Susie and Ralsei: FIGHT, ACT (Check, Snap, SnapAll), Susie's Snap / Supercharge, Ralsei's Snap / FluffyGuard, MAGIC, ITEM and DEFEND.
- The yellow SOUL: shoot with Z, hold and release to fire a BIG SHOT. Shoot the bullets Spamton NEO throws at you.
- The battle logic is ported from the original game's code, so it plays like the real fight.
- Work in progress: Flying Heads is ported; Spamton NEO's other attacks are still being ported, and until then those turns play Flying Heads.
- **Practice mode** (Bad Time Simulator style): dodge the attacks in order; lose your HP bar and the attack restarts, survive it and you move on. Pick the starting attack and 90 / 45 / 1 HP. Scores with ranks and a saved best for full runs. Direct link: [`?practice`](https://bautipro67.github.io/spamton-neo-fight-simulator/?practice).
- **EQUIPMENT**: pick each character's weapon and armors (any Chapter 2 gear they can use) and the items you bring into the fight.
- **Codes**: type a secret code in the Codes box under the game to unlock extras.
- **OPTIONS**: volume, easy mode (half damage), **SOUL hats** and **CONTROLS** to remap every button on keyboard and gamepad. Options are remembered in the browser.
- **Pause** with Esc / P (Start on a gamepad): continue, restart, volume, quit to title.
- **Sandbox mode** to repeat any attack freely: [`?sandbox&attack=0`](https://bautipro67.github.io/spamton-neo-fight-simulator/?sandbox&attack=0) (`[` / `]` switch attacks, `I` invincibility).
- Touch controls on phones and tablets, fullscreen button.

More fight simulators by the same fan: [Jevil Fight Simulator](https://bautipro67.github.io/jevil-fight-simulator/), [Roaring Knight Fight Simulator](https://bautipro67.github.io/roaring-knight-fight-simulator/), and [all DELTARUNE fight simulators](https://bautipro67.github.io/).

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

## How it was made

- `tools/datawin.py` reads GameMaker `data.win` files (sprites, fonts, sounds).
- `tools/gmdis.py` decompiles the game's bytecode so the fight could be studied.
- `tools/extract_assets.py --chapter 2` extracts only the assets this fight uses into `assets/`.
- `tools/stamp_version.py` stamps a version on every file before publishing, so browsers never mix old and new files.
- `src/runtime/` is a small GameMaker-like engine in JavaScript; `src/battle/` and `src/sneo/` are the ported fight.

## Credits

DELTARUNE and all its characters, graphics, music and sounds are © Toby Fox. This is a free, non-commercial fan project, not affiliated with Toby Fox or 8-4. If you enjoy it, get the real game: https://deltarune.com

---

*Simulador de la pelea contra Spamton NEO de DELTARUNE, jugable gratis en el navegador.*
