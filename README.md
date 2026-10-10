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

## Controls

| Input | Action |
| --- | --- |
| ← / → | Move |
| ↑ | Jump (double jump with the Pup-Cake treat) |
| Space | Chop / kick. In the air it's a flying side kick |
| ↓ | Nap on a dog bed; pee once the burger is bought (permanent) |
| ← or EXIT SHOP | Leave Iggy's Burgers |
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
| Cat coats (14 variants) | `chars.js → CAT_VARIANTS` |
| Level layout, buildings, platforms, enemy spawns | `src/world.js` |
| Town geometry, facades, awnings, benches | `src/env.js` |
| Shop names, real-store colors, sign styles, materials | `src/materials.js → SHOP_PROFILE` |
| HUD, menus, boss bar, power chips | `src/ui.js`, `index.template.html` |
| Input (keyboard + touch) | `src/input.js` |
| Audio (music, bark, SFX) | `src/audio.js` |
| Post-processing, particles | `src/fx.js` |

### Storefronts
`SHOP_PROFILE` in `src/materials.js` describes each real Healdsburg business: wall/trim/awning colors, facade style (`brick`, `board`, `stucco`, `stone`, `glass`, `modern`, `quonset`, `craftsman`, `plain`) and sign (font, shape, text). Shop names were checked against currently open businesses as of Oct 2026. Oakville Grocery, SHED and Campo Fina/Molti Amici have closed and were replaced by Copperfield's Books, Downtown Bakery & Creamery and Valette. `env.js → facadeStyle()` builds the per-style details.

### Character art
- Jessica is a painted cartoon billboard (`makeJessica()`, art in `art/jessica_*.png` → `assets/jess_*.webp`). The older 3D sculpt is kept as `makeJessica3D()` for rollback only; the owner prefers the cartoon. Style: brown hair, mustard/yellow beanie, black clothes.
- Bench locals: `art/bench_*.png` → `assets/bench_*.webp`.
- `build.mjs` inlines these as base64 via placeholder tokens (`__JESS_WAVE__`, `__BENCH_GRANDPA__`, etc.).

## Debug hooks (`?debug`)
In the browser console, `window.peabodyDebug` has: `startGame()`, `goTo(x)`, `goToShop()`, `goToBoss()`, `goToJessica()`, `warp()`, `bossHP(n)`, `eat('hotdog'|'burrito')`, `setKickMode()`, `setFartMode()`, `setFly()`, `giveFish(n)`, `spawnChicken()`, `setInvincible()`, `tier(i)` (quality 0 ultra to 3 low), and `photo([camX,camY,camZ, lookX,lookY,lookZ, fov])` for close-up camera shots. Quality can also be forced with `?q=low` / `?q=ultra`.

## Testing notes
- Test on real devices: iPad with keyboard, laptop Chrome/Safari, and Chrome on Android/iPhone (portrait and landscape).
- Expected harmless console warnings: `toNonIndexed(): already non-indexed` and a KHR texture warning.
