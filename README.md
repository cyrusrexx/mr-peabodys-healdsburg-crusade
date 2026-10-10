# Mr. Peabody's Healdsburg Crusade — v2 HD

A 3D (Three.js) side-scroller starring Mr. Peabody, a Chinese Crested, chopping and kicking his way down Healdsburg's Plaza to reach Jessica. This is the HD rebuild of the classic 2D game (the classic stays on `main`).

## Quick start

```bash
npm install
npm run build        # → dist/index.html (single file, ~2.3 MB) + dist/peabody-crusade.mp3
npm start            # serves dist/ at http://localhost:3000  (add ?debug for the FPS meter + debug hooks)
```

`dist/` is committed, so the game can also be deployed as-is with no build step.

### Deploying (e.g. Vercel)
- Static site. Build command `npm run build`, output directory `dist`.
- `dist/peabody-crusade.mp3` must sit next to `dist/index.html` (the music streams from it).
- Everything else (JS, textures, character art, bark sound) is inlined into `index.html`.
- Works from a sub-folder (e.g. `cyrusrex.com/peabodyHD`): `src/audio.js` resolves the mp3 next to `index.html` even when the URL has no trailing slash.
- Uses Google Fonts (Fredoka, Nunito, Playfair Display, Parisienne, Josefin Sans, Roboto Slab). If a Content-Security-Policy is added, allow `https://fonts.googleapis.com` (style) and `https://fonts.gstatic.com` (font), plus `data:` and `blob:` for images/media.

## Hard requirements — please keep these

1. **Single-file inline JS.** `build.mjs` bundles `src/` with esbuild and inlines it into `index.html`. Loading the JS as a separate module broke keyboard input inside embedded iframes (iPad and laptop). Don't split it back out.
2. **Keyboard focus trap.** A hidden read-only `#kb-trap` input (`inputmode="none"`) plus key listeners on canvas, document and window, focused on click/tap. This keeps arrows and Space working in iframes without popping the phone's virtual keyboard.
3. **Never use Escape** for anything. It exits the host's fullscreen/embed view.
4. **Music:** must play on Chrome mobile, never cut out mid-play, and stop when the user leaves the page (`visibilitychange` / `pagehide`). See `src/audio.js` (watchdog + resume logic). Don't pause on window `blur`; that caused the cutouts.
5. On-screen touch controls must never open the virtual keyboard.
6. **Nothing is stored in the browser:** no localStorage, sessionStorage, IndexedDB or cookies. The Top dogs board, the touch tips' count and the pause panel's settings last the visit, in memory.

## Controls

| Input | Action |
| --- | --- |
| ← / → | Move |
| ↑ | Jump (double jump with the Pup-Cake treat). How high: the pause panel's Jump, 60% of the first jump's height to start |
| Space | Chop / kick. In the air it's a flying side kick |
| ↓ | Nap on a dog bed; pee once the burger is bought (permanent) |
| ← or EXIT SHOP | Leave Iggy's Burgers. On a touch screen a tap on an item buys it; the list scrolls where the screen is short |
| P or the pause button | Pause (the clock stops, the music plays on, quieter). P, Space or RESUME to go on; on the panel (Difficulty, Jump, Music) ↑/↓ choose, ←/→ change. Leaving the page pauses too |
| Pet shop | ←/→ choose, Space take, ↓ or LEAVE SHOP to leave |

On a touch screen the buttons sit in the bottom corners and the gesture tips show, for the first two runs of a visit, in the space between them (above them on a phone held upright), never over the HUD. The game plays held upright or sideways; it doesn't ask to be turned. The site's logo (Cyrusrex), top left, links to the site's home (`/`).

### Cheat codes (skip to the final quarter)
- **Keyboard / on-screen arrows:** ↑ ↑ ↓ ↓ ← → ← → within 5 seconds → "CHEAT: WARP TO THE END!" (full lives and stamina, lands at x = 362 before the boss and Jessica).
- **Touch:** tap the progress bar at the top 5 times within 2.5 seconds.
- Both call `game.cheatWarp(362)` in `src/game.js`.

## Gameplay systems (where to find them)

| Feature | Location |
| --- | --- |
| Main loop, physics, attacks, power-ups, boss AI | `src/game.js` |
| Kick variety (snap, spin, double, high, mule) + chop/paw/uppercut cycle | `game.js → attack()` + `swingSweep()`: each swing stays live for `C.SWING_T` (0.16 s). Reach: chop ≈ 1.75u (`C.RANGE`), kick ≈ 2.3u, flying kick ≈ 2.3u |
| Flying side kick | `game.js → fskSweep()`; pose in `chars.js` (`s.fsk`) |
| Trash cans (knock over for food) | `game.js → knockCan()` |
| Bench locals who share food (hot dog = PUPPY RUN, burrito = mega fart) | `chars.js → makeBencher()/makeFood()`, `game.js → eatFood()/megaFart()` |
| Boss: Tom the Giant Wild Turkey (10 HP; only its charge and landing quake hurt; it gets dizzy after hitting an arena wall, and dizzy hits do double damage) | `chars.js → makeTurkey()`, `game.js` boss state machine (`C.BOSS_HP`, `C.BOSS_SCALE`); arena in `world.js` (BOSS_TRIG 447, ARENA 445–466). The older boar model `makeBoar()` is kept for rollback |
| Characters (Peabody, Morty, Jessica cutout, cats, gray fox, pigeons) | `src/chars.js`, `src/sculpt.js` |
| Grey foxes climbing: up a fence or a flat-roofed shop front, along the top, then down or a pounce on a pigeon | `game.js → updateFox()` and `climbables()`; poses in `chars.js → makeFox()`; fences in `world.js → WORLD.FENCES`, built by `env.js → buildFences()` |
| Cat coats (14 variants) | `chars.js → CAT_VARIANTS` |
| The possum, Peabody's friend (once per game, at `WORLD.POSSUM_X`: it hisses, he tosses it a minnow from his mouth, or a biscuit, and it eats in hearts) | `chars.js → makePossum()/makeGift()`, `game.js → updatePossum()/tossGift()`, `audio.js → sfx.possumHiss()/possumNom()` |
| Level layout, buildings, platforms, enemy spawns | `src/world.js` |
| Town geometry, facades, awnings, benches | `src/env.js` |
| Shop names, real-store colors, sign styles, materials | `src/materials.js → SHOP_PROFILE` |
| HUD, menus, boss bar, power chips | `src/ui.js`, `index.template.html` |
| Pause panel: difficulty, jump and music volume | `ui.js → buildPause()/tickPause()`, `game.js → setPaused()/setSkill()/setJumpScale()` and `SKILLS` (Easy / Normal / Hard; Normal holds the game's own numbers), `audio.js → setMusicLevel()` |
| Jump height (Cyrus, 10 Oct 2026: "Jumps are too extreme reduce the range to about 60% so the power ups are actually useful"): 60% of the height the game was first tuned to (`C.JUMP_SCALE`), 40% to 100% on the pause panel's Jump, for the visit; a JUMP UP's boost the same share of its own. While the turkey fights, never under the first jump, so its charge is jumped over as the fight was made (at 60% he would pass through the giant turkey) | `game.js → jumpSpeed()`, `C.JUMP_SCALE/JUMP_MIN/JUMP_MAX` |
| Collecting: every 5 melons JUMP UP (kept until lost to a hurt), every 5 minnows SPEED UP and SIZE UP in turn. SIZE is a short power ("keep him more consistent size except for short periods of time"): a fifth bigger, his reach with him, for 10 s, its timer among the HUD's | `game.js → collect()`, `bigK()`, `C.SIZE_T/SIZE_BIG`; `ui.js → POWERS` |
| Iggy's on a phone: the card fits the screen as Safari shows it (a height in `vh` is Safari's tallest screen, its bars hidden), its title and EXIT SHOP always in view, only its list scrolling; upright it sits under the HUD, sideways clear of the sound button; the on-screen controls put away while it is open | `index.template.html` → shop |
| Input (keyboard + touch) | `src/input.js` |
| Audio (music, bark, SFX) | `src/audio.js`. The music's volume: the `<audio>` element's own `volume`. iPhone and iPad ignore it: there the pause panel's Music is Off and On, Off and the sound button muting the element (`muted`), and the level is the phone's own. Not through Web Audio: routed there, the music went silent on an iPhone (10 Oct 2026) |
| Post-processing, particles | `src/fx.js` |

### Storefronts
`SHOP_PROFILE` in `src/materials.js` describes each real Healdsburg business: wall/trim/awning colors, facade style (`brick`, `board`, `stucco`, `stone`, `glass`, `modern`, `quonset`, `craftsman`, `plain`) and sign (font, shape, text). Shop names were checked against currently open businesses as of Oct 2026. Oakville Grocery, SHED and Campo Fina/Molti Amici have closed and were replaced by Copperfield's Books, Downtown Bakery & Creamery and Valette. `env.js → facadeStyle()` builds the per-style details.

### Character art
- Jessica is a painted cartoon billboard (`makeJessica()`, art in `art/jessica_*.png` → `assets/jess_*.webp`). The older 3D sculpt is kept as `makeJessica3D()` for rollback only; the owner prefers the cartoon. Style: brown hair, mustard/yellow beanie, black clothes.
- Bench locals: `art/bench_*.png` → `assets/bench_*.webp`.
- `build.mjs` inlines these as base64 via placeholder tokens (`__JESS_WAVE__`, `__BENCH_GRANDPA__`, etc.).

## Debug hooks (`?debug`)
In the browser console, `window.peabodyDebug` has: `pause(on)`, `difficulty(i)` (0 Easy, 1 Normal, 2 Hard; returns the current one), `music(level)` (0..1; returns the music's state), `startGame()`, `goTo(x)`, `goToShop()`, `goToBoss()`, `goToJessica()`, `warp()`, `bossHP(n)`, `eat('hotdog'|'burrito')`, `setKickMode()`, `setFartMode()`, `setFly()`, `giveFish(n)`, `spawnChicken()`, `setInvincible()`, `tier(i)` (quality 0 ultra to 3 low), and `photo([camX,camY,camZ, lookX,lookY,lookZ, fov])` for close-up camera shots. Quality can also be forced with `?q=low` / `?q=ultra`.

## Testing notes
- Test on real devices: iPad with keyboard, laptop Chrome/Safari, and Chrome on Android/iPhone (portrait and landscape).
- Expected harmless console warnings: `toNonIndexed(): already non-indexed` and a KHR texture warning.
- Loading makes everything that starts hidden (pooled critters, the cyclists, Morty, the turkey…) ready before play: its shaders compiled for the render target the scene is drawn into, its buffers uploaded and its shadow shaders built, so nothing stalls the first time it comes into view. Each cyclist's bike is baked into a few skinned meshes, one per material (`chars.js → makeCyclist()`).
