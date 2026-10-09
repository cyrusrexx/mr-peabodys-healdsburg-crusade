// Level layout: buildings, platforms, zones, entity spawn data. Units: 1u = 50 classic px.
import { seed, rnd, srand, srandInt, spick } from './util.js';
import { SHOP_NAMES, SHOP_PROFILE } from './materials.js';

export const WORLD = {
  L: 480, SHOP_X: 156, SHOP_W: 10, DOOR_X: 161, MORTY_X: 100, JESS_X: 472,
  PET_X: 236, PET_W: 7.2, PET_DOOR: 239.6, BIKE_X: [118, 352],
  FRONT_Z: -2.4, LANE_Z: 0,
  // final boss arena (the boar comes out of the park just before Jessica)
  BOSS_TRIG: 447, ARENA0: 445, ARENA1: 466,
  // park benches with friendly locals who share their food (plaza ones reuse the plaza benches)
  BENCH_X: [30, 112, 136, 196, 266, 290, 375, 411],
  TOWN_BENCH_X: [30, 112, 136, 196, 266, 290, 375, 411],
};
export const ZONES = [
  { type: 'plaza', x0: 56, x1: 98 },
  { type: 'vista', x0: 300, x1: 334 },
  { type: 'park', x0: 452, x1: 520 },
];
const inZone = (x) => ZONES.find((z) => x >= z.x0 && x < z.x1);
const NAMES = SHOP_NAMES.filter((n) => n !== 'Fideaux Pets');
const SPECIALS = [
  { x0: WORLD.SHOP_X, w: WORLD.SHOP_W, make: () => ({ x0: WORLD.SHOP_X, w: WORLD.SHOP_W, iggy: true, floors: 1, name: "IGGY'S BURGERS", wall: '#fff3dc', trim: '#b3261e', awn: '#d8342a', roof: 'flat', H: 4.6 }) },
  { x0: WORLD.PET_X, w: WORLD.PET_W, make: () => ({ ...makeBuilding(WORLD.PET_X, WORLD.PET_W, 'Fideaux Pets'), pet: true, floors: 2, H: 6.6, roof: 'flat', doorX: WORLD.PET_DOOR }) },
];

// Fideaux Pets free treats (2 per run)
export const TREAT_PICKS = 2;
export const TREATS = [
  { id: 'skybone', name: 'Bacon Sky-Bone', power: 'SKY CHOP · 20s', desc: 'Chops reach way up — swat pigeons right out of the sky.', col: '#5fb8ff' },
  { id: 'pupcake', name: 'Bouncy Pup-Cake', power: 'DOUBLE JUMP · 25s', desc: 'Jump again in mid-air to reach high awnings and birds.', col: '#ff9a3d' },
  { id: 'zoomie', name: 'Salmon Zoomie Stick', power: 'ZOOMIES · 12s', desc: 'Full stamina plus a turbo burst of speed.', col: '#ff5a5a' },
  { id: 'guard', name: 'Golden Guard Biscuit', power: 'SHIELD · 1 hit', desc: 'A golden glow blocks the next hit you take.', col: '#e8b018' },
  { id: 'magnet', name: 'Cheesy Magnet Puff', power: 'MAGNET · 20s', desc: 'Melons and minnows fly straight to you.', col: '#d8342a' },
];

export function generateLayout() {
  seed(20261008);
  const buildings = [], platforms = [], stands = [];
  let x = -16, nameIdx = 0;
  while (x < 452) {
    const z = inZone(x);
    if (z) { x = z.x1 + 0.4; continue; }
    const sp = SPECIALS.find((q) => x > q.x0 - 7 && x < q.x0 + q.w);
    if (sp) {
      if (x < sp.x0) { // fill up to the special shop
        const w = sp.x0 - 0.3 - x;
        if (w > 2.5) buildings.push(makeBuilding(x, w, NAMES[nameIdx++ % NAMES.length]));
      }
      buildings.push(sp.make());
      x = sp.x0 + sp.w + 0.4;
      continue;
    }
    let w = srand(5, 7.6);
    const next = ZONES.find((zz) => zz.x0 > x);
    if (next && x + w > next.x0 - 0.3) w = next.x0 - 0.3 - x;
    const nsp = SPECIALS.find((q) => q.x0 > x);
    if (nsp && x + w > nsp.x0 - 0.3) w = nsp.x0 - 0.3 - x;
    if (w < 2.5) { x += w + 0.3; continue; }
    buildings.push(makeBuilding(x, w, NAMES[nameIdx++ % NAMES.length]));
    x += w + srand(0.15, 0.6);
  }
  // platforms from buildings
  for (const b of buildings) {
    if (b.iggy) continue;
    if (b.x0 + b.w < 2 || b.x0 > 470) continue;
    const aw = Math.min(b.w - 0.6, srand(2.6, 4.6));
    let ax = b.x0 + srand(0.3, b.w - aw - 0.3);
    // keep awnings clear of the sidewalk benches so the locals aren't hidden under them
    const clash = (x) => WORLD.BENCH_X.some((bx) => bx > x - 1.3 && bx < x + aw + 1.3);
    if (clash(ax)) { const opts = [b.x0 + 0.3, b.x0 + b.w - aw - 0.3].filter((x) => !clash(x)); ax = opts.length ? opts[0] : null; }
    if (ax !== null) {
      b.awning = { x0: ax, w: aw, y: srand(1.85, 2.3) };
      platforms.push({ x: ax, w: aw, y: b.awning.y, kind: 'awning', b });
    }
    if (b.floors >= 2 && rnd() < 0.55) {
      const bw = Math.min(b.w - 0.8, srand(2.2, 3.4));
      const bx = b.x0 + srand(0.4, b.w - bw - 0.4);
      b.balcony = { x0: bx, w: bw, y: srand(4.0, 4.5) };
      platforms.push({ x: bx, w: bw, y: b.balcony.y, kind: 'balcony', b });
    }
  }
  // farmers-market canopies in the plaza, vista + park
  for (const zn of ZONES) {
    let sx = zn.x0 + 4;
    while (sx < Math.min(zn.x1, 470) - 5) {
      if (zn.type === 'plaza' && Math.abs(sx - 77) < 6) { sx += 7; continue; }
      const w = srand(2.6, 3.6), y = srand(1.9, 2.5);
      const col = spick(['#e8503a', '#2f8fd8', '#f2b632', '#3aa55d', '#e2588e']);
      stands.push({ x0: sx, w, y, col, zone: zn.type });
      platforms.push({ x: sx, w, y, kind: 'canopy' });
      if (rnd() < 0.5) { const w2 = srand(1.6, 2.4); const x2 = sx + w + srand(0.8, 1.6); const y2 = y + srand(1.8, 2.3); platforms.push({ x: x2, w: w2, y: y2, kind: 'cloud' }); }
      sx += w + srand(3.5, 6);
    }
  }
  platforms.sort((a, b) => a.x - b.x);
  // dog beds on every ~6th wide platform
  let k = 0;
  const beds = [];
  for (const p of platforms) {
    if (p.x < 6 || p.x > 468) continue;
    if (k++ % 6 === 3 && p.w >= 1.6) { p.bed = true; beds.push({ x: p.x + p.w / 2, y: p.y, plat: p }); }
  }
  return { buildings, platforms, stands, beds };
}

function makeBuilding(x0, w, name) {
  const pr = SHOP_PROFILE[name] || { wall: '#e9dcc6', trim: '#6b4a2b', awn: '#b4552e', style: 'plain' };
  // consume the same random draws as before so the level layout stays identical
  const r0 = rnd(); const rf = r0 < 0.4 ? 1 : r0 < 0.92 ? 2 : 3;
  const rroof = spick(['flat', 'flat', 'false', 'gable', 'flat']);
  const rbrick = rnd() < 0.25;
  const floors = pr.floors ?? rf;
  const roof = pr.style === 'quonset' ? 'arch' : (pr.roof ?? rroof);
  const H = pr.style === 'quonset' ? 3.2 : floors === 1 ? 4.6 : 3.6 + (floors - 1) * 2.6 + 0.4; // one-storey shops get a taller parapet so the sign clears the cornice
  return { x0, w, name, floors, roof, H, wall: pr.wall, trim: pr.trim, awn: pr.awn, stripe: pr.stripe, style: pr.style, roofCol: pr.roofCol, flowers: pr.flowers, sign: pr.sign, brick: pr.style === 'brick' || (pr.style === 'plain' && rbrick && false) };
}

// Collectibles laid out in Nintendo-style trails: lines, jump arcs, platform rows
export function generateCollectibles(platforms) {
  const items = [];
  let wm = 0;
  const kind = () => (wm++ % 2 === 0 ? 'melon' : 'fish');
  let x = 6;
  while (x < 466) {
    const r = rnd();
    const kd = kind();
    if (r < 0.42) {               // ground line
      const n = srandInt(3, 5);
      for (let i = 0; i < n; i++) items.push({ x: x + i * 0.9, y: 0.75, kind: kd });
      x += n * 0.9 + srand(1.5, 3);
    } else if (r < 0.7) {         // jump arc
      for (let i = 0; i < 5; i++) items.push({ x: x + i * 0.85, y: 0.9 + Math.sin((i / 4) * Math.PI) * 1.6, kind: kd });
      x += 5 * 0.85 + srand(1.5, 3);
    } else {                      // platform row
      const p = platforms.find((pp) => pp.x > x && pp.x < x + 8);
      if (p) {
        const n = Math.max(1, Math.floor(p.w / 0.9));
        for (let i = 0; i < n; i++) items.push({ x: p.x + 0.45 + i * 0.9, y: p.y + 0.75, kind: kd });
        x = p.x + p.w + srand(1, 2);
      } else x += 3;
    }
  }
  return items;
}

export function generateEnemies(platforms) {
  const enemies = [];
  const count = 112;
  for (let i = 0; i < count; i++) {
    const x = 9 + (i / count) * 455 + srand(-1.5, 1.5);
    const type = i % 2 === 0 ? 'cat' : 'pigeon';
    const range = srand(1.6, 4);
    // ~70% of the original cat count (skip 3 of every 10 cats)
    if (type === 'cat' && [1, 4, 7].includes((i / 2) % 10)) continue;
    if (type === 'cat') {
      // some cats lounge on awnings
      const p = rnd() < 0.22 ? platforms.find((pp) => pp.x < x && pp.x + pp.w > x && pp.w > 2.4 && !pp.bed) : null;
      if (p) enemies.push({ type, x, y: p.y, baseX: p.x + p.w / 2, range: p.w / 2 - 0.3, plat: p });
      else enemies.push({ type, x, y: 0, baseX: x, range });
    } else {
      enemies.push({ type, x, y: srand(2.3, 3.7), baseX: x, range }); // lower flight band: reachable with a jump + chop
    }
  }
  return enemies;
}
