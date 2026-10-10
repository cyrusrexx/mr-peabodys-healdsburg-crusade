// Core gameplay — same rules as the classic, re-expressed in 3D units (1u = 50 classic px)
import * as THREE from 'three';
import { WORLD, TREATS, TREAT_PICKS, generateLayout, generateCollectibles, generateEnemies } from './world.js';
import { makePeabody, makeCat, makePigeon, makeFox, makeRaccoon, makeChicken, makeMorty, makeJessica, makeWatermelon, makeMinnow, makeTrashCan, makeDogBed, makeCyclist, makeTurkey, makeBencher, makeFood, makePossum, makeGift } from './chars.js';
import { input, clearJustPressed, keys, justPressed } from './input.js';
const CHEAT = ['U', 'U', 'D', 'D', 'L', 'R', 'L', 'R']; // ↑ ↑ ↓ ↓ ← → ← → warps to the final quarter
import { sfx, setMusic, restartMusic, setMusicRate, setMusicPaused } from './audio.js';
import { clamp, damp, lerp, rand, seed, srand, rnd } from './util.js';

export const C = {
  GRAVITY: 36, JUMP: 12.4, JUMP_PER: 0.8, RUN: 6.12, RUN_PER: 0.6, SHAKE_BONUS: 2.4,
  ATTACK_DUR: 0.25, ATTACK_CD: 0.35, RANGE: 1.75, SWING_T: 0.16, STAMINA_MAX: 100, NAP: 2,
  ROLL_T: 0.5, TRICK_T: 1.0, TOOT_CD: 3.5,
  SKY_T: 20, DBL_T: 25, ZOOM_T: 12, MAG_T: 20, ZOOM_BONUS: 3.4,
  KICK_T: 8, FART_T: 4, BARK_T: 15, SHAKE_T: 10, FLY_T: 30, MORTY_T: 5,
  POWER_EVERY: 5,
  FSK_T: 0.42, FSK_V: 9.5, PUPPY_T: 10, PUPPY_BONUS: 3.2, BOSS_HP: 10, BOSS_SCALE: 3.0,
};

// Difficulty, set on the pause panel's slider. Normal is the game as tuned: each of its numbers is the one the game has
// always used. Easy and Hard change what a player feels: what a hit costs (hearts, stamina, the safe blink after it),
// how fast cats and pigeons move, and the turkey (its health, how long it warns before a charge and how fast it comes,
// how long it stays dizzy, how long it struts between attacks; the "mad" values once it is down to half health).
export const SKILLS = [
  { id: 'easy', name: 'Easy', hit: 0.5, invT: 2.0, staminaHit: 15, enemy: 0.75, bossHP: 7, idle: 2.0, idleMad: 1.5, windup: 1.6, windupMad: 1.25, charge: 7.5, chargeMad: 9, dizzy: 4.0, dizzyMad: 3.4,
    about: 'Hits cost half a heart. Slower cats and pigeons. The turkey has 7 HP and warns longer.' },
  { id: 'normal', name: 'Normal', hit: 1, invT: 1.5, staminaHit: 25, enemy: 1, bossHP: C.BOSS_HP, idle: 1.7, idleMad: 1.2, windup: 1.25, windupMad: 0.95, charge: 7.5, chargeMad: 9, dizzy: 3.2, dizzyMad: 2.6,
    about: 'The game as it was made.' },
  { id: 'hard', name: 'Hard', hit: 1, invT: 1.0, staminaHit: 35, enemy: 1.3, bossHP: 14, idle: 1.4, idleMad: 1.0, windup: 1.0, windupMad: 0.8, charge: 8.5, chargeMad: 10, dizzy: 2.6, dizzyMad: 2.1,
    about: 'Faster cats and pigeons, a shorter blink after a hit. The turkey has 14 HP and charges sooner.' },
];

class Pool {
  constructor(scene, factory, n) {
    this.free = []; this.scene = scene; this.factory = factory;
    for (let i = 0; i < n; i++) this.free.push(this.make());
  }
  make() { const r = this.factory(); r.root.visible = false; this.scene.add(r.root); return r; }
  // random pick so pooled variants (cat coats, sizes) mix on screen
  take() { const r = this.free.length ? this.free.splice(Math.floor(Math.random() * this.free.length), 1)[0] : this.make(); r.root.visible = true; return r; }
  give(r) { r.root.visible = false; this.free.push(r); }
}

export class Game {
  constructor(scene, camera, fx, ui, env) {
    this.scene = scene; this.camera = camera; this.fx = fx; this.ui = ui; this.env = env;
    this.layout = env.layout;
    this.state = 'menu';
    this.t = 0;
    this.paused = false; this.skill = 1; // difficulty: Normal until changed, for the visit
    this.shake = 0; this.hitStop = 0;
    this.cam = { x: 4, y: 0, look: 0, fov: 34 };
    // rigs
    this.peabody = makePeabody(); scene.add(this.peabody.root);
    this.chickenRig = makeChicken(); this.chickenRig.root.visible = false; scene.add(this.chickenRig.root);
    this.mortyRig = makeMorty(); this.mortyRig.root.visible = false; scene.add(this.mortyRig.root);
    this.jessRig = makeJessica(); scene.add(this.jessRig.root);
    this.jessRig.root.position.set(WORLD.JESS_X, 0, -0.6);
    this.pools = {
      cat: new Pool(scene, () => makeCat(this._catN = (this._catN ?? -1) + 1), 14), pigeon: new Pool(scene, makePigeon, 8),
      melon: new Pool(scene, makeWatermelon, 24), fish: new Pool(scene, makeMinnow, 24),
    };
    // static-ish props (all created once)
    this.beds = this.layout.beds.map((b) => { const r = makeDogBed(); r.root.position.set(b.x, b.y, 0); scene.add(r.root); return { ...b, rig: r }; });
    this.foxRigs = []; this.racRigs = []; this.canRigs = [];
    for (let i = 0; i < 8; i++) { const r = makeFox(); scene.add(r.root); this.foxRigs.push(r); }
    for (let i = 0; i < 10; i++) { const r = makeRaccoon(); scene.add(r.root); this.racRigs.push(r); }
    for (let i = 0; i < 25; i++) { const r = makeTrashCan(); scene.add(r.root); this.canRigs.push(r); }
    // shop door indicator
    this.doorArrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), new THREE.MeshBasicMaterial({ color: 0xffe36b, toneMapped: false }));
    this.doorArrow.rotation.z = Math.PI; scene.add(this.doorArrow);
    this.doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), new THREE.MeshBasicMaterial({ color: 0xffc85a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.doorGlow.position.set(WORLD.DOOR_X, 1.35, WORLD.FRONT_Z + 0.2); scene.add(this.doorGlow);
    this.petGlow = this.doorGlow.clone(); this.petGlow.material = this.doorGlow.material.clone(); this.petGlow.scale.set(0.75, 0.85, 1);
    this.petGlow.position.set(WORLD.PET_DOOR, 1.12, WORLD.FRONT_Z + 0.22); scene.add(this.petGlow);
    // final boss + bench locals and their snacks
    this.boarRig = makeTurkey(); this.boarRig.root.visible = false; this.boarRig.root.scale.setScalar(C.BOSS_SCALE); scene.add(this.boarRig.root);
    this.benchRigs = WORLD.BENCH_X.map((x, i) => { const r = makeBencher(i); r.root.position.set(x, 0, -1.6); scene.add(r.root); return r; });
    this.foodRigs = WORLD.BENCH_X.map((x, i) => { const r = makeFood(this.benchRigs[i].food); r.root.visible = false; r.root.scale.setScalar(1.3); scene.add(r.root); return r; });
    this.bikeRigs = [makeCyclist(0), makeCyclist(1)];
    for (const r of this.bikeRigs) { r.root.visible = false; scene.add(r.root); }
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.shieldMesh.visible = false; scene.add(this.shieldMesh);
    // the possum Peabody meets once along the way, and the snack he tosses it
    this.possumRig = makePossum(); this.possumRig.root.scale.setScalar(1.6); this.possumRig.root.visible = false; scene.add(this.possumRig.root);
    this.giftRig = makeGift(); this.giftRig.root.visible = false; scene.add(this.giftRig.root);
    this._v1 = new THREE.Vector3(); this._v2 = new THREE.Vector3();
    this.reset();
  }

  reset() {
    if (this.paused) this.setPaused(false);
    seed(Date.now() & 0xffff);
    const p = this.p = {
      x: 3, y: 0, vx: 0, vy: 0, facing: 1, grounded: true, coyote: 0, jumpBuf: 0, landT: 0,
      lives: 3, stamina: C.STAMINA_MAX, invT: 0, attackT: 0, attackCd: 0,
      kickT: 0, fartT: 0, barkT: 0, shakeT: 0, flyT: 0, mortyT: 0, hasPee: false,
      napping: false, napT: 0, peeT: 0, jumpLvl: 0, speedLvl: 0, sizeLvl: 0,
      melons: 0, fish: 0, fishSpent: 0, catKills: 0, pigeonKills: 0, kills: 0,
      combo: 0, comboT: 0, score: 0, onPlat: null, barkAnim: 0, wasUp: false,
      rollT: 0, rollDir: 1, rollCd: 0, trickT: 0, trickCd: 0, tootCd: 0, tootAnim: 0, taps: [],
      skyT: 0, dblT: 0, dblUsed: false, zoomT: 0, magT: 0, shield: false, treats: [], airHop: false,
      fskT: 0, fskV: 0, fskBoss: false, atkVar: 0, lastKick: -1, puppyT: 0, safeT: 0,
    };
    this.time = 0;
    // entities
    for (const k in this.pools) for (const e of (this.entities?.[k] || [])) if (e.rig) { this.pools[k].give(e.rig); e.rig = null; }
    const items = generateCollectibles(this.layout.platforms);
    const enemies = generateEnemies(this.layout.platforms);
    this.items = items.map((i) => ({ ...i, taken: false, ph: Math.random() * 6, rig: null }));
    this.enemies = enemies.map((e) => ({ ...e, dir: rnd() < 0.5 ? 1 : -1, alive: true, dyingT: 0, frozenT: 0, baseY: e.y, ph: Math.random() * 6, rig: null, vx: 0, vy: 0, spinDir: 1 }));
    this.entities = { melon: this.items.filter((i) => i.kind === 'melon'), fish: this.items.filter((i) => i.kind === 'fish'), cat: this.enemies.filter((e) => e.type === 'cat'), pigeon: this.enemies.filter((e) => e.type === 'pigeon') };
    this.chicken = null;
    this.puddles?.forEach((pd) => this.scene.remove(pd.m));
    this.puddles = [];
    this.morty = { triggered: false, active: false, x: 0, vx: 0, state: 'idle', t: 0, facing: -1 };
    this.mortyRig.root.visible = false;
    this.jess = { reached: false, open: false, waving: true, jump: false, faceCam: false };
    this.win = { t: 0, phase: 0 };
    // foxes / raccoons / trash
    this.foxes = this.foxRigs.map((r, i) => ({ rig: r, x: 30 + i * 55 + srand(-6, 6), y: 0, z: -0.9, vx: 0, vy: 0, facing: 1, state: 'idle', t: rand(1, 3), target: null, pose: 'walk', climb: null, goal: 0, goalZ: -0.9, walked: false }));
    this.cans = this.canRigs.map((r, i) => {
      let x = 12 + i * 18.5 + srand(-3, 3);
      for (const bx of WORLD.BENCH_X) if (Math.abs(bx - x) < 2.2) x = bx + (x < bx ? -2.4 : 2.4);
      return { rig: r, x, knocked: false, food: false, foodX: 0 };
    });
    this.benchers = this.benchRigs.map((rig, i) => ({ rig, x: WORLD.BENCH_X[i], given: false, food: rig.food, happyT: 0, tossNow: false }));
    this.foods = this.foodRigs.map((rig, i) => ({ rig, kind: this.benchRigs[i].food, active: false, landed: false, x: 0, y: 0, vx: 0, vy: 0, t: 0 }));
    for (const f of this.foods) f.rig.root.visible = false;
    this.boss = { state: 'wait', x: WORLD.ARENA1 + 6, y: 0, vx: 0, vy: 0, facing: -1, hp: this.sk.bossHP, hpMax: this.sk.bossHP, t: 0, cycle: 0, invT: 0, hitT: 0, stompK: 0, done: false };
    this.boarRig.root.visible = false; this.boarRig.root.rotation.set(0, 0, 0);
    this.ui.bossBar?.(null);
    this.racs = this.racRigs.map((r, i) => ({ rig: r, x: 20 + i * 45 + srand(-6, 6), vx: 0, facing: 1, state: 'wander', t: rand(1, 3), target: null }));
    for (const c of this.cans) { c.rig.root.position.set(c.x, 0, -1.25); c.rig.can.rotation.set(0, 0, 0); c.rig.can.position.set(0, 0, 0); c.rig.lid.position.set(0, 0.82, 0); c.rig.lid.rotation.set(0, 0, 0); c.rig.food.visible = false; }
    this.peabody.root.scale.setScalar(1.4);
    this.shopSel = 0; this.petSel = 0;
    this.bikes = this.bikeRigs.map((rig, i) => ({ rig, trigX: WORLD.BIKE_X[i], active: false, done: false, x: 0, vx: 0, dir: 1, reacted: false, yelpT: 0, stinkT: 0 }));
    for (const r of this.bikeRigs) r.root.visible = false;
    this.possum = { x: WORLD.POSSUM_X, z: WORLD.POSSUM_Z, state: 'wait', t: 0, facing: -1, mouth: 0, chew: 0, happy: 0, walk: 0 };
    this.gift = { active: false, fish: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, T: 0.62 };
    this.possumRig.root.visible = false; this.giftRig.root.visible = false;
    this.fx.clear?.();
  }

  get difficulty() { return 1 + Math.floor(this.cam.x / 40) * 0.2; } // the level's own ramp, further along = faster
  get sk() { return SKILLS[this.skill]; } // the difficulty setting

  // ───────────────────────── pause + difficulty ─────────────────────────
  // Pausing stops the game's clock (main.js stops calling update); the music plays on, quieter.
  setPaused(on) {
    on = !!on;
    if (on === this.paused || (on && this.state !== 'playing')) return;
    this.paused = on;
    setMusicPaused(on);
    this.ui.showPause?.(on);
    sfx.ui();
    clearJustPressed();
  }
  // Changing difficulty counts at once; mid-fight the turkey keeps the same share of its health.
  setSkill(i) {
    i = clamp(Math.round(i), 0, SKILLS.length - 1);
    if (i === this.skill) return;
    this.skill = i;
    const b = this.boss, max = SKILLS[i].bossHP;
    if (b.state === 'wait') { b.hp = b.hpMax = max; return; }
    if (b.done || b.state === 'defeated' || b.state === 'gone') return;
    b.hp = Math.max(1, Math.round((b.hp * max) / b.hpMax)); b.hpMax = max;
    this.ui.bossBar?.(b.hp / b.hpMax, false);
  }
  get fishAvail() { return this.p.fish - this.p.fishSpent; }

  startGame() {
    this.reset();
    this.state = 'playing';
    restartMusic();
    setTimeout(() => sfx.bark(), 250);
    this.ui.show('hud');
    clearJustPressed();
  }

  addScore(pts, x, y, color = '#ffe66b', label) {
    const mult = Math.max(1, this.p.combo);
    const v = pts * mult;
    this.p.score += v; this.p.combo++; this.p.comboT = 2;
    this.fx.text((label ? label + ' ' : '') + '+' + v, x, y, 0.3, color, mult > 1 ? 1.15 : 1);
    return v;
  }
  popText(str, color = '#fff', size = 1.2, dy = 1.6, cls = 'big') { this.fx.text(str, this.p.x, this.p.y + dy, 0.3, color, size, cls); }

  // ───────────────────────── update ─────────────────────────
  update(dt) {
    this.t += dt;
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.08; }
    const s = this.state;
    if (s === 'playing') this.updatePlaying(dt);
    else if (s === 'shop') this.updateShop(dt);
    else if (s === 'petshop') this.updatePet(dt);
    else if (s === 'win') this.updateWin(dt);
    else if (s === 'menu' || s === 'gameover' || s === 'initials' || s === 'victory') this.updateIdle(dt);
    this.updateCamera(dt);
    this.syncVisuals(dt);
    clearJustPressed();
  }

  updateIdle(dt) {
    const p = this.p;
    p.vx = damp(p.vx, 0, 8, dt);
    this.updateWorldCritters(dt, true);
  }

  updatePlaying(dt) {
    const p = this.p;
    this.time += dt;
    // cheat code: ↑ ↑ ↓ ↓ ← → ← → (keyboard or the on-screen buttons) within 5 seconds
    const ck = input.jumpPressed() ? 'U' : input.downPressed() ? 'D' : input.leftPressed() ? 'L' : input.rightPressed() ? 'R' : null;
    if (ck) {
      this.cheatSeq = (this.cheatSeq || []).filter((c) => this.time - c.t < 5); this.cheatSeq.push({ k: ck, t: this.time });
      if (this.cheatSeq.length > CHEAT.length) this.cheatSeq.shift();
      if (this.cheatSeq.map((c) => c.k).join('') === CHEAT.join('')) { this.cheatSeq = []; this.cheatWarp(); return; }
    }
    // timers
    for (const k of ['invT', 'kickT', 'fartT', 'barkT', 'shakeT', 'flyT', 'mortyT', 'attackCd', 'landT', 'barkAnim', 'peeT', 'rollT', 'rollCd', 'trickT', 'trickCd', 'tootCd', 'tootAnim', 'skyT', 'dblT', 'zoomT', 'magT', 'fskT', 'puppyT', 'safeT']) {
      if (p[k] > 0) {
        const before = p[k];
        p[k] = Math.max(0, p[k] - dt);
        if (before > 0 && p[k] === 0) this.onPowerEnd(k);
      }
    }
    if (p.attackT > 0) p.attackT = Math.max(0, p.attackT - dt / C.ATTACK_DUR);
    if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }

    // ── napping ──
    const anyMove = input.left() || input.right() || input.jumpPressed() || input.attackPressed();
    if (p.napping) {
      p.napT += dt;
      if (Math.random() < dt * 2.5) this.fx.zzz(p.x + 0.3 * p.facing, p.y + 0.9, 0.2);
      if (p.napT >= C.NAP) {
        p.stamina = C.STAMINA_MAX; p.napping = false;
        this.popText('FULLY RESTED!', '#b388ff'); sfx.powerUp();
        this.fx.sparkle(p.x, p.y + 0.6, 0, 0xc6a8ff, 24);
      } else if (anyMove) {
        p.stamina = Math.min(C.STAMINA_MAX, p.stamina + (p.napT / C.NAP) * C.STAMINA_MAX);
        p.napping = false;
      } else { this.updateWorldCritters(dt); this.updateEnemies(dt); return; }
    }

    // ── horizontal ──
    let speed = C.RUN + p.speedLvl * C.RUN_PER + (p.shakeT > 0 ? C.SHAKE_BONUS : 0) + (p.zoomT > 0 ? C.ZOOM_BONUS : 0) + (p.puppyT > 0 ? C.PUPPY_BONUS : 0);
    if (p.stamina <= 0 && p.puppyT <= 0) speed *= 0.8;
    let move = 0;
    if (input.left()) move -= 1;
    if (input.right()) move += 1;
    if (p.rollT > 0) { p.facing = p.rollDir; p.vx = p.rollDir * speed * 1.85; }
    else if (p.fskT > 0) { p.vx = p.facing * p.fskV; }
    else if (move !== 0) { p.facing = move; p.vx = damp(p.vx, move * speed, p.grounded ? 16 : 9, dt); if (p.trickT > 0 && p.trickT < C.TRICK_T - 0.25) p.trickT = 0; }
    else p.vx *= Math.pow(0.88, dt * 60);

    // ── shop door ──
    const nearDoor = Math.abs(p.x - WORLD.DOOR_X) < 0.95 && p.grounded;
    this.nearDoor = nearDoor;
    if (nearDoor && input.jumpPressed()) { this.enterShop(); return; }
    const nearPet = Math.abs(p.x - WORLD.PET_DOOR) < 0.95 && p.grounded && p.y < 0.1;
    this.nearPet = nearPet;
    if (nearPet && input.jumpPressed()) { this.enterPet(); return; }

    // ── jumping / flight ──
    const g = C.GRAVITY * (p.flyT > 0 ? 0.15 : 1) * (p.fskT > 0 ? 0.45 : 1);
    if (input.jumpPressed()) p.jumpBuf = 0.12;
    if (p.jumpBuf > 0) p.jumpBuf -= dt;
    if (p.grounded) p.coyote = 0.1; else p.coyote -= dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = C.JUMP + p.jumpLvl * C.JUMP_PER; p.grounded = false; p.coyote = 0; p.jumpBuf = 0; p.onPlat = null;
      sfx.jump(); this.fx.dust(p.x, p.y, 0, 5, p.facing);
    }
    else if (input.jumpPressed() && !p.grounded && p.dblT > 0 && !p.dblUsed && p.flyT <= 0 && p.coyote <= 0) {
      p.vy = (C.JUMP + p.jumpLvl * C.JUMP_PER) * 0.92; p.dblUsed = true; p.jumpBuf = 0;
      sfx.jump(); this.fx.ring(p.x, p.y + 0.2, 0, 0xffb85c, 1.1, 0.3); this.fx.sparkle(p.x, p.y + 0.3, 0, 0xffc870, 10, 2);
    }
    if (p.flyT > 0 && input.up() && !p.grounded) { p.vy = Math.max(p.vy, 4); if (Math.random() < dt * 30) this.fx.sparkle(p.x - p.facing * 0.3, p.y + 0.5, 0, 0xbfe6ff, 1, 1); }
    // variable jump height — release early for a short hop
    if (!input.up() && p.wasUp && p.vy > 4 && p.flyT <= 0) p.vy *= 0.55;
    p.wasUp = input.up();
    p.vy -= g * dt;
    if (p.flyT > 0) p.vy = Math.max(p.vy, -6);

    const prevY = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = clamp(p.x, 0.5, WORLD.L - 1);
    // boss arena walls (can't skip the boar, can't run away from him)
    const B = this.boss;
    if (B.state !== 'wait' && !B.done) { if (p.x > WORLD.ARENA1) { p.x = WORLD.ARENA1; p.vx = Math.min(0, p.vx); } if (p.x < WORLD.ARENA0) { p.x = WORLD.ARENA0; p.vx = Math.max(0, p.vx); } }
    if (p.y > 9) { p.y = 9; p.vy = Math.min(p.vy, 0); }

    // ── platforms (one-way) & ground ──
    const wasGrounded = p.grounded;
    p.grounded = false;
    if (p.vy <= 0) {
      for (const pl of this.layout.platforms) {
        if (pl.x > p.x + 2) break;
        if (p.x > pl.x - 0.25 && p.x < pl.x + pl.w + 0.25 && prevY >= pl.y - 0.02 && p.y <= pl.y) {
          p.y = pl.y; p.vy = 0; p.grounded = true; p.onPlat = pl; break;
        }
      }
    }
    if (!p.grounded && p.y <= 0) { p.y = 0; p.vy = 0; p.grounded = true; p.onPlat = null; }
    if (p.grounded && p.onPlat && (p.x < p.onPlat.x - 0.25 || p.x > p.onPlat.x + p.onPlat.w + 0.25)) { p.grounded = false; p.onPlat = null; }
    if (p.grounded) { p.dblUsed = false; p.airHop = false; }
    if (p.grounded && p.fskT > 0) p.fskT = 0;
    if (p.grounded && !wasGrounded) { p.landT = 0.12; this.fx.dust(p.x, p.y, 0, 7); sfx.land(); }
    // footstep dust
    if (p.grounded && Math.abs(p.vx) > 4 && Math.random() < dt * 8) this.fx.dust(p.x - p.facing * 0.3, p.y, 0, 1, p.facing);
    if (p.shakeT > 0 && Math.abs(p.vx) > 3) this.fx.speed(p.x, p.y, 0, p.facing);

    // ── stamina drain ──
    if (p.puppyT > 0) { if (Math.abs(p.vx) > 3 && Math.random() < dt * 14) this.fx.sparkle(p.x - p.facing * 0.4, p.y + 0.3, 0, 0xff9fc8, 1, 1); if (p.grounded && Math.abs(p.vx) > 3 && Math.random() < dt * 6) this.fx.dust(p.x - p.facing * 0.3, p.y, 0, 2, p.facing); }
    else if (Math.abs(p.vx) > 0.5 || p.attackT > 0) p.stamina = Math.max(0, p.stamina - 1.5 * dt);

    // ── attack ──
    if (input.attackPressed()) {
      // triple-tap (or triple Space) = toot
      const now = this.time; p.taps = p.taps.filter((t) => now - t < 0.7); p.taps.push(now);
      if (p.taps.length >= 3) { p.taps = []; this.toot(); }
      else if (p.attackCd <= 0) this.attack();
    }
    if (input.tootPressed()) this.toot();
    if (p.fskT > 0) this.fskSweep();
    if (p.swing) { p.swing.t -= dt; if (p.swing.t <= 0) p.swing = null; else this.swingSweep(); }

    // ── rolls: flick down+sideways (or ↓ while running) = forward roll; flick down (or ↓ standing still) = roll over ──
    const onBed = this.beds.some((b) => Math.abs(p.x - b.x) < 0.65 && Math.abs(p.y - b.y) < 0.1);
    let rollReq = input.rollGesture();
    let overReq = input.rollOverGesture();
    if (!rollReq && !overReq && input.downPressed() && !(onBed && p.stamina < C.STAMINA_MAX)) {
      const mv = (input.right() ? 1 : 0) - (input.left() ? 1 : 0);
      if (mv !== 0 && Math.abs(p.vx) > 2.5) rollReq = mv;
      else if (!p.hasPee && p.grounded) overReq = true;
    }
    if (rollReq && p.rollCd <= 0 && p.rollT <= 0) this.startRoll(rollReq);
    else if (overReq && p.grounded && p.rollT <= 0 && p.trickT <= 0) this.startRollOver();
    const tricking = p.rollT > 0 || p.trickT > 0;

    // ── nap / pee ──
    if (!tricking && input.down() && p.grounded && p.stamina < C.STAMINA_MAX) {
      for (const b of this.beds) if (Math.abs(p.x - b.x) < 0.65 && Math.abs(p.y - b.y) < 0.1) {
        p.napping = true; p.napT = 0; p.vx = 0; sfx.nap(); this.popText('ZZZ...', '#b388ff', 1, 1.4); break;
      }
    }
    if (!tricking && p.hasPee && !p.napping && p.grounded && (input.downPressed() || input.down())) {
      if (!this.puddles.some((pd) => Math.abs(pd.x - p.x) < 0.8)) {
        const m = this.fx.puddle(p.x - p.facing * 0.35); m.position.y = p.y + 0.02;
        this.puddles.push({ x: p.x - p.facing * 0.35, y: p.y, life: 8, m, grow: 0 });
        p.peeT = 0.6; sfx.pee(); this.popText('PEE!', '#f6e04a', 0.9, 1.2, '');
      }
    }

    // ── collectibles ──
    const pcy = p.y + 0.45, sz = 1 + p.sizeLvl * 0.08;
    if (p.magT > 0) for (const it of this.items) {
      if (it.taken || Math.abs(it.x - p.x) > 5 || Math.abs(it.y - pcy) > 4.5) continue;
      const k = Math.min(1, dt * 7); it.x += (p.x - it.x) * k; it.y += (pcy - it.y) * k;
      if (Math.random() < dt * 4) this.fx.sparkle(it.x, it.y, 0, 0xffe36b, 1, 1);
    }
    for (const it of this.items) {
      if (it.taken || Math.abs(it.x - p.x) > 1) continue;
      if (Math.abs(it.x - p.x) < 0.62 * sz && Math.abs(it.y - pcy) < 0.75 * sz) this.collect(it);
    }
    // trash food
    for (const c of this.cans) if (c.food && Math.abs(c.foodX - p.x) < 0.6 && p.y < 0.8) {
      c.food = false; c.rig.food.visible = false;
      p.flyT = C.FLY_T; sfx.flight(); this.popText('FLIGHT POWER!', '#8fe3ff', 1.4);
      this.fx.burst(p.x, p.y + 0.5, 0, 0x9fe8ff, 30); this.addScore(100, c.foodX, 1.2, '#8fe3ff');
    }
    this.updateBenchers(dt);
    this.updatePossum(dt);
    this.updateBoss(dt);
    // chicken
    if (this.chicken) this.updateChicken(dt);
    // puddles
    this.puddles = this.puddles.filter((pd) => {
      pd.life -= dt; pd.grow = Math.min(1, pd.grow + dt * 3);
      pd.m.scale.set(pd.grow, pd.grow * 0.6, 1);
      pd.m.material.opacity = Math.min(0.85, pd.life / 2);
      if (pd.life <= 0) { this.scene.remove(pd.m); pd.m.geometry.dispose(); pd.m.material.dispose(); return false; }
      return true;
    });
    this.updateEnemies(dt);
    this.updateWorldCritters(dt);
    this.updateMorty(dt);
    this.updateBikes(dt);
    // fart aura kills
    if (p.fartT > 0) {
      if (Math.random() < dt * 20) this.fx.smoke(p.x - p.facing * 0.4, p.y + 0.3, 0, 0x9bd04a, 1, 0.8);
      for (const e of this.enemies) if (e.alive && Math.abs(e.x - p.x) < 2 && Math.abs(e.y - p.y) < 1.6) this.killEnemy(e, 100, 'FART');
      if (this.bossHittable() && Math.abs(this.boss.x - p.x) < 2.6) this.damageBoss(1, 'FART!');
    }
    // win check
    if (!this.jess.reached && p.x >= WORLD.JESS_X - 1.6 && (this.boss.done)) this.startWin();
  }

  // skip the first three-quarters of the run and land just before the last stretch (bikes, boss, Jessica)
  cheatWarp(to = 362) {
    if (this.state !== 'playing' || this.p.x >= to) return;
    const p = this.p;
    p.x = to; p.y = 0; p.vx = 0; p.vy = 0; p.grounded = true; p.onPlat = null; p.napping = false;
    p.lives = 3; p.stamina = C.STAMINA_MAX; p.invT = 2;
    this.cam.x = to; this.camera.position.x = to;
    this.morty.triggered = true; this.morty.active = false; this.mortyRig.root.visible = false;
    for (const b of this.bikes) if (b.trigX < to) { b.done = true; b.active = false; b.rig.root.visible = false; }
    for (const e of this.enemies) if (e.alive && Math.abs(e.x - to) < 4) { e.alive = false; e.dyingT = 0; }
    sfx.flight(); this.shake = 0.3;
    this.fx.burst(p.x, p.y + 0.6, 0, 0xffe27a, 40); this.fx.ring(p.x, p.y + 0.5, 0.1, 0xffe27a, 2.4, 0.5);
    this.popText('CHEAT: WARP TO THE END!', '#ffe27a', 1.3, 1.9);
  }
  startRoll(dir) {
    const p = this.p;
    p.rollT = C.ROLL_T; p.rollDir = dir; p.rollCd = 0.75; p.trickT = 0; p.napping = false;
    p.stamina = Math.max(0, p.stamina - 3);
    if (p.grounded) p.vy = Math.max(p.vy, 3.2);
    sfx.jump(); this.fx.dust(p.x, p.y, 0, 8, dir);
    this.fx.ring(p.x, p.y + 0.4, 0.1, 0xfff1d0, 1.1, 0.25);
  }
  startRollOver() {
    const p = this.p;
    p.trickT = C.TRICK_T; p.vx *= 0.3;
    if (p.trickCd <= 0) {
      p.trickCd = 3; p.stamina = Math.min(C.STAMINA_MAX, p.stamina + 5);
      this.addScore(25, p.x, p.y + 1.3, '#ff9ec0', 'GOOD BOY!');
      setTimeout(() => this.fx.sparkle(p.x, p.y + 0.6, 0, 0xff8fb8, 16, 2), 450);
      sfx.powerUp();
    }
    this.fx.dust(p.x, p.y, 0, 5);
  }
  toot() {
    const p = this.p;
    if (p.tootCd > 0) return;
    p.tootCd = C.TOOT_CD; p.tootAnim = 0.6;
    sfx.fart();
    const bx = p.x - p.facing * 0.45;
    for (let i = 0; i < 14; i++) this.fx.smoke(bx - p.facing * Math.random() * 0.6, p.y + 0.35 + Math.random() * 0.25, 0, 0x9bd04a, 1, 0.9 + Math.random() * 0.5);
    this.fx.ring(bx, p.y + 0.4, 0.1, 0xb8e070, 1.8, 0.4);
    this.popText('TOOT!', '#a6e05a', 1.1, 1.5);
    let hit = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ey = e.type === 'cat' ? e.y + 0.3 : e.y;
      if (Math.abs(e.x - bx) < 2.1 && Math.abs(ey - (p.y + 0.4)) < 1.4) { this.killEnemy(e, 60, 'TOOT!'); hit = true; }
    }
    if (this.bossHittable() && Math.abs(this.boss.x - bx) < 2.6) { this.damageBoss(1, 'TOOT!'); hit = true; }
    for (const c of this.cans) if (!c.knocked && Math.abs(c.x - bx) < 1.6) this.knockCan(c, -p.facing);
    if (hit) { this.shake = Math.max(this.shake, 0.15); }
  }

  attack() {
    const p = this.p;
    p.attackT = 1; p.attackCd = C.ATTACK_CD;
    const kick = p.kickT > 0;
    const air = !p.grounded, sky = p.skyT > 0;
    const range = C.RANGE * (kick ? 1.3 : 1) * (1 + p.sizeLvl * 0.08); // kick ≈ 2.3u past Peabody
    sfx.chop();
    // ── airborne = FLYING SIDE KICK: lunge forward with the leg out, sweeping birds out of the sky ──
    if (air && p.flyT <= 0 && p.fskT <= 0) {
      p.fskT = C.FSK_T; p.fskBoss = false; p.atkVar = 9;
      p.fskV = Math.max(Math.abs(p.vx), C.FSK_V + (kick ? 1.5 : 0));
      p.vy = !p.airHop ? Math.max(p.vy, 4.2) : Math.max(p.vy, 0.8); p.airHop = true;
      this.fx.swoosh(p.x + p.facing * 0.7, p.y + 0.5, 0, p.facing, 0xffd04a, true);
      this.fx.ring(p.x - p.facing * 0.2, p.y + 0.5, 0.1, 0xffe9a0, 1.2, 0.25);
      this.popText(kick ? 'FLYING SIDE KICK!!' : 'FLYING SIDE KICK!', '#ffd04a', 1.05, 1.5);
      if (sky) { this.fx.swoosh(p.x + p.facing * 0.35, p.y + 1.6, 0, p.facing, 0x8fd3ff, true); this.fx.ring(p.x + p.facing * 0.4, p.y + 2.0, 0.1, 0x8fd3ff, 1.6, 0.3); }
      this.fskSweep();
      if (p.barkT > 0) this.barkBlast();
      return;
    }
    // ── ground: a different move every time ──
    let v, label, col, fwd = range, back = -0.55, up = kick ? 1.4 : 1.25, mult = kick ? 2 : 1;
    if (kick) {
      do { v = Math.floor(Math.random() * 5); } while (v === p.lastKick);
      p.lastKick = v;
      [label, col] = [['SNAP KICK!', 0xffa040], ['SPIN KICK!', 0xff6a3d], ['DOUBLE KICK!', 0xffc04a], ['HIGH KICK!', 0xff8a5a], ['MULE KICK!', 0xffb070]][v];
      if (v === 1) { back = -range * 1.05; fwd = range * 1.15; }
      if (v === 2) mult = 3;
      if (v === 3) up += 0.9;
      if (v === 4) { back = -range * 1.35; fwd = range * 0.9; } // mule kick: back legs fire behind, front still connects
    } else { p.atkVar = (p.atkVar + 1) % 3; v = p.atkVar; label = ['CHOP!', 'PAW SWIPE!', 'UPPERCUT!'][v]; col = 0xfff6dc; if (v === 2) up += 0.45; }
    p.atkVar = v;
    if (kick && v === 1) { this.fx.swoosh(p.x + p.facing * 0.6, p.y + 0.55, 0, p.facing, col, true); this.fx.swoosh(p.x - p.facing * 0.6, p.y + 0.55, 0, -p.facing, col, true); this.fx.ring(p.x, p.y + 0.5, 0.1, col, 1.6, 0.3); }
    else if (kick && v === 4) this.fx.swoosh(p.x - p.facing * 0.7, p.y + 0.35, 0, -p.facing, col, true);
    else this.fx.swoosh(p.x + p.facing * (kick ? 0.55 : 0.5), p.y + (kick && v === 3 ? 1.0 : 0.55), 0, p.facing, col, kick);
    if (kick && v === 2) setTimeout(() => { this.fx.swoosh(p.x + p.facing * 0.6, p.y + 0.75, 0, p.facing, col, true); sfx.chop(); }, 110);
    // air chop while flying: a little hang-time hop once per jump so you can line up birds
    if (air && !p.airHop) { p.airHop = true; p.vy = Math.max(p.vy, 3.2); }
    if (sky) { this.fx.swoosh(p.x + p.facing * 0.35, p.y + 1.6, 0, p.facing, 0x8fd3ff, true); this.fx.ring(p.x + p.facing * 0.4, p.y + 2.0, 0.1, 0x8fd3ff, 1.6, 0.3); }
    // the swing stays live for a few frames so moving cats / birds can't slip between frames
    p.swing = { t: C.SWING_T, fwd, back, up, mult, label, kick, air, sky, boss: false, any: false };
    this.swingSweep();
    if (p.barkT > 0 && this.barkBlast()) { this.hitStop = 0.05; sfx.whack(); }
  }
  swingSweep() {
    const p = this.p, w = p.swing; if (!w) return;
    const { fwd, back, up, mult, label, kick, air, sky } = w;
    let hit = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const bird = e.type === 'pigeon';
      const dx = (e.x - p.x) * p.facing;
      const ey = bird ? e.y : e.y + 0.3;
      const dy = ey - (p.y + 0.45);
      const reach = fwd + (bird && air ? 0.55 : 0) + (bird && sky ? 0.8 : 0);
      const upR = up + (bird && air ? 0.75 : 0) + (bird && sky ? 2.8 : 0);
      const bk = bird && (air || sky) ? Math.min(back, -0.6) : back;
      if (dx > bk && dx < reach && dy < upR && dy > -(kick ? 1.25 : 1.1)) {
        this.killEnemy(e, (e.type === 'cat' ? 100 : 75) * mult, label);
        hit = true;
      }
    }
    // trash cans: knock 'em over
    for (const c of this.cans) {
      if (c.knocked) continue;
      const dx = (c.x - p.x) * p.facing;
      if (dx > back - 0.2 && dx < fwd + 0.35 && p.y < 1.2) { this.knockCan(c, dx >= 0 ? p.facing : -p.facing); hit = true; }
    }
    // the boss (once per swing)
    if (!w.boss && this.bossHittable()) {
      const dx = (this.boss.x - p.x) * p.facing;
      if (dx > back - 1.1 && dx < fwd + 1.4 && p.y < 2.4) { w.boss = true; this.damageBoss(kick ? 2 : 1, label); hit = true; }
    }
    if (hit && !w.any) { w.any = true; this.hitStop = 0.05; this.shake = Math.max(this.shake, 0.18); sfx.whack(); }
  }
  barkBlast() {
    // fries bark: blast pigeons within 6u
    const p = this.p; let hit = false;
    sfx.bark(); p.barkAnim = 0.25;
    this.fx.ring(p.x + p.facing * 0.6, p.y + 0.7, 0.2, 0xfff1a0, 3, 0.45);
    for (const e of this.enemies) if (e.alive && e.type === 'pigeon' && Math.abs(e.x - p.x) < 6) { this.killEnemy(e, 15, 'BARK'); hit = true; }
    return hit;
  }
  fskSweep() {
    // the extended leg sweeps a box ahead of Peabody for the whole kick
    const p = this.p; let hit = false;
    const reach = 2.3 * (1 + p.sizeLvl * 0.08) + (p.skyT > 0 ? 0.6 : 0);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = (e.x - p.x) * p.facing, ey = e.type === 'pigeon' ? e.y : e.y + 0.3, dy = ey - (p.y + 0.45);
      if (dx > -0.6 && dx < reach && dy > -1.3 && dy < 1.6 + (p.skyT > 0 ? 2 : 0)) { this.killEnemy(e, (e.type === 'pigeon' ? 150 : 175) * (p.kickT > 0 ? 2 : 1), 'FLYING KICK!'); hit = true; }
    }
    for (const c of this.cans) if (!c.knocked && Math.abs(c.x - p.x) < 1.8 && p.y < 1.5) { this.knockCan(c, p.facing); hit = true; }
    if (!p.fskBoss && this.bossHittable() && Math.abs(this.boss.x - p.x) < 2.8 && p.y < 2.8) { p.fskBoss = true; this.damageBoss(p.kickT > 0 ? 3 : 2, 'FLYING KICK!'); p.vy = 7; p.fskT = 0; p.vx = -p.facing * 3; hit = true; }
    if (hit) { this.hitStop = 0.04; this.shake = Math.max(this.shake, 0.2); sfx.whack(); }
  }
  knockCan(c, dir) {
    c.knocked = true; c.foodDir = dir;
    sfx.trash(); this.shake = Math.max(this.shake, 0.12);
    this.fx.dust(c.x, 0, -1.2, 10, dir); this.fx.sparkle(c.x, 0.8, -1.2, 0xd8d0c0, 8, 2);
    this.addScore(40, c.x, 1.5, '#ffd28a', 'CRASH!');
    if (Math.random() < 0.3) { c.food = true; c.foodX = c.x + 0.9 * dir; this.fx.text('TRASH FOOD!', c.foodX, 1.1, 0.3, '#8fe3ff', 0.85); }
    else {
      // goodies tumble out onto the sidewalk
      for (let i = 0; i < 3; i++) {
        const it = { x: c.x + dir * (0.9 + i * 0.75), y: 0.75, kind: i === 1 ? 'melon' : 'fish', taken: false, ph: Math.random() * 6, rig: null };
        this.items.push(it); this.entities[it.kind].push(it);
        this.fx.sparkle(it.x, it.y, 0, i === 1 ? 0xff8fa0 : 0x9fdcff, 6, 1.5);
      }
    }
  }

  // ───────────────────────── bench locals + their snacks ─────────────────────────
  updateBenchers(dt) {
    const p = this.p;
    for (let i = 0; i < this.benchers.length; i++) {
      const b = this.benchers[i], f = this.foods[i];
      if (!b.given && Math.abs(p.x - b.x) < 3.4 && p.y < 2.5) {
        b.given = true; b.tossNow = true; b.happyT = 3;
        const lines = b.food === 'burrito' ? ['Want my burrito, pup?', 'Here, bean burrito!', 'Extra beans, buddy!'] : ['Here, pup! Hot dog!', 'Who wants a hot dog?', 'Treat time, good boy!'];
        this.fx.text(lines[i % 3], b.x, 2.05, -1.6, '#ffffff', 0.85);
        sfx.uiConfirm();
        // toss it ahead of where Peabody is heading
        const tx = clamp(p.x + (Math.abs(p.vx) > 1 ? Math.sign(p.vx) : p.facing) * 2.2, b.x - 3, b.x + 3.5);
        Object.assign(f, { active: true, landed: false, x: b.x + 0.3, y: 1.0, vy: 6, t: 0, z: -1.5 });
        f.vx = (tx - f.x) / 0.62;
        f.rig.root.visible = true;
      }
      if (b.happyT > 0) b.happyT -= dt;
      if (!f.active) continue;
      f.t += dt;
      if (!f.landed) {
        f.vy -= 20 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z = damp(f.z, 0, 4, dt);
        if (f.y <= 0.32 && f.vy < 0) { f.y = 0.32; f.landed = true; f.z = 0; this.fx.dust(f.x, 0, 0, 5); }
      }
      if (f.t > 0.25 && Math.abs(f.x - p.x) < 1.0 && Math.abs(f.y - (p.y + 0.35)) < 1.0) this.eatFood(f);
      else if (f.t > 22) { f.active = false; f.rig.root.visible = false; }
    }
  }
  eatFood(f) {
    const p = this.p;
    f.active = false; f.rig.root.visible = false;
    sfx.treat(); this.fx.sparkle(p.x, p.y + 0.6, 0, 0xfff1a0, 18, 2);
    if (f.kind === 'hotdog') {
      p.puppyT = C.PUPPY_T; p.stamina = C.STAMINA_MAX;
      this.popText('PUPPY RUN!', '#ff8fc0', 1.5, 1.8); sfx.powerUp(); sfx.bark();
      this.fx.burst(p.x, p.y + 0.5, 0, 0xff9fc8, 30); this.addScore(100, p.x, 1.4, '#ff8fc0', 'HOT DOG!');
    } else {
      this.addScore(100, p.x, 1.4, '#a6e05a', 'BURRITO!');
      this.megaFart();
    }
  }
  megaFart() {
    // FART ATTACK: a plume the size of the screen — every enemy in view goes down
    const p = this.p;
    sfx.bigFart(); setTimeout(() => sfx.fart(), 260); p.tootAnim = 1.2; p.invT = Math.max(p.invT, 1.2);
    this.shake = 0.8; this.hitStop = 0.08;
    const half = (this.viewHalf || 12) + 1, cx = this.cam.x;
    this.fx.smoke(p.x - p.facing * 0.5, p.y + 0.4, 0, 0x9bd04a, 40, 4);
    for (let i = 0; i < 70; i++) this.fx.smoke(cx + (Math.random() * 2 - 1) * half, Math.random() * 5.5 + 0.2, (Math.random() - 0.5) * 3, i % 3 ? 0x9bd04a : 0xc3e07a, 1, 1.6 + Math.random() * 1.8);
    this.fx.ring(p.x, p.y + 0.5, 0.1, 0xb6ff5a, 9, 0.9); this.fx.ring(p.x, p.y + 0.5, 0.1, 0xe2ff9a, 5, 0.6);
    this.popText('FART ATTACK!!!', '#b6ff5a', 2.0, 2.0);
    this.ui.flashFart?.();
    for (const e of this.enemies) if (e.alive && Math.abs(e.x - cx) < half) this.killEnemy(e, 200, 'GASSED');
    if (this.bossHittable() && Math.abs(this.boss.x - cx) < half) { this.boss.invT = 0; this.damageBoss(5, 'FART ATTACK!'); }
  }

  // ───────────────────────── the possum: a friend, once per game ─────────────────────────
  // It waits on the sidewalk. When Peabody comes near it opens its mouth and hisses (a possum's bluff); he tosses it a
  // snack from his mouth, one of his minnows if he has one to share (the count drops by one), else a biscuit; it eats
  // happily, in hearts, and toddles off. About three seconds, and the game runs on through it: it is no enemy, nothing
  // here can hurt him, and it scores nothing.
  updatePossum(dt) {
    const o = this.possum, p = this.p, g = this.gift;
    if (o.state === 'gone') return;
    o.t += dt;
    if (o.state === 'wait') {
      if (Math.abs(p.x - o.x) < 3.4 && p.y < 2.8) {
        o.state = 'hiss'; o.t = 0; o.facing = Math.sign(p.x - o.x) || -1; o.mouth = 1;
        sfx.possumHiss(); this.fx.text('hsss!', o.x + o.facing * 0.2, 1.05, o.z, '#f1e6ff', 0.75);
      }
    } else if (o.state === 'hiss') {
      o.facing = Math.sign(p.x - o.x) || o.facing;
      if (o.t > 0.5) { this.tossGift(); o.state = 'catch'; o.t = 0; }
    } else if (o.state === 'catch') {
      if (!g.active) { o.state = 'eat'; o.t = 0; o.mouth = 0; o.chew = 1.3; o.happy = 1; }
    } else if (o.state === 'eat') {
      o.chew = Math.max(0, o.chew - dt);
      if (Math.random() < dt * 8) this.fx.heart(o.x + o.facing * 0.3, 0.8, o.z + 0.15);
      if (o.t > 1.5) { o.state = 'happy'; o.t = 0; }
    } else if (o.state === 'happy') {
      if (o.t < 1.2 && Math.random() < dt * 3) this.fx.heart(o.x + o.facing * 0.3, 0.8, o.z + 0.15);
      if (o.t > 1.4) { // off it toddles, back the way Peabody came, and is gone once out of sight
        o.facing = -1; o.walk = 0.7; o.x -= 0.7 * dt; o.z = damp(o.z, -1.7, 1.5, dt); o.happy = 0;
        if (Math.abs(o.x - this.camera.position.x) > (this.viewHalf || 12) + 3) { o.state = 'gone'; this.possumRig.root.visible = false; }
      }
    }
    // the snack in the air: a small arc from his mouth into the possum's
    if (g.active) {
      g.t += dt; g.vy -= 14 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
      if (g.t >= g.T) {
        g.active = false; this.giftRig.root.visible = false; sfx.possumNom();
        this.fx.sparkle(o.x + o.facing * 0.3, 0.6, o.z, 0xffd6e8, 10, 1.5);
        for (let i = 0; i < 3; i++) this.fx.heart(o.x + o.facing * 0.3, 0.9, o.z + 0.15);
        this.fx.text('POSSUM PAL!', o.x, 1.6, o.z, '#ffb3d6', 0.95);
      }
    }
  }
  tossGift() {
    const p = this.p, o = this.possum, g = this.gift;
    if (Math.abs(p.vx) < 1 && p.grounded) p.facing = Math.sign(o.x - p.x) || p.facing; // standing, he turns to it
    p.barkAnim = 0.3; // his mouth opens
    const m = this.peabody.head.localToWorld(this._v1.set(0.21, -0.045, 0)); // the tip of his snout
    const t = this.possumRig.mouthPt.getWorldPosition(this._v2);
    g.fish = this.fishAvail > 0;
    if (g.fish) { p.fishSpent++; this.fx.text('-1 MINNOW', p.x, p.y + 1.55, 0.3, '#8fd3ff', 0.7); }
    Object.assign(g, { active: true, x: m.x, y: m.y, z: m.z, t: 0 });
    g.vx = (t.x - m.x) / g.T; g.vz = (t.z - m.z) / g.T; g.vy = (t.y - m.y + 7 * g.T * g.T) / g.T;
    this.giftRig.fish.visible = g.fish; this.giftRig.biscuit.visible = !g.fish;
    this.giftRig.root.position.set(g.x, g.y, g.z); this.giftRig.root.visible = true;
    sfx.toss();
  }

  // ───────────────────────── BOSS: Tom, the Giant Wild Turkey ─────────────────────────
  bossHittable() { const b = this.boss; return b.state !== 'wait' && b.state !== 'enter' && b.state !== 'defeated' && b.state !== 'gone' && b.invT <= 0; }
  damageBoss(n, label) {
    const b = this.boss, p = this.p;
    if (b.state === 'stunned') n *= 2;
    b.hp = Math.max(0, b.hp - n); b.invT = 0.3; b.hitT = 0.15;
    p.score += 100 * n; this.fx.text(`${label} -${n} HP`, b.x, 2.7, 0.3, '#ff9a5a', 1.05);
    this.fx.burst(b.x, 1.2, 0.2, 0xffb070, 22); this.fx.ring(b.x, 1.1, 0.3, 0xffffff, 1.8, 0.3);
    sfx.hit(); this.hitStop = 0.06; this.shake = Math.max(this.shake, 0.25);
    if (b.state !== 'stunned' && b.state !== 'charge') b.x += Math.sign(b.x - p.x || 1) * 0.5;
    this.ui.bossBar?.(b.hp / b.hpMax, true);
    if (b.hp <= 0) {
      b.state = 'defeated'; b.t = 0; b.vy = 5; b.vx = 3;
      sfx.win(); setTimeout(() => sfx.bark(), 300);
      this.popText('TURKEY DEFEATED!', '#ffe27a', 1.8, 2.0); this.addScore(2000, b.x, 3.2, '#ffe27a', 'BOSS');
      this.fx.confetti(b.x, 3, 0, 60);
      setMusicRate(1);
    }
  }
  updateBoss(dt) {
    const b = this.boss, p = this.p, r = this.boarRig;
    if (b.state === 'wait') {
      if (p.x < WORLD.BOSS_TRIG) return;
      b.state = 'enter'; b.x = WORLD.ARENA1 + 7; b.facing = -1; b.t = 0;
      r.root.visible = true; r.root.rotation.set(0, 0, 0);
      this.popText('BOSS: TOM THE GIANT WILD TURKEY!', '#ff7a2f', 1.2, 2.1);
      sfx.bigFart(); this.shake = 0.4; this.ui.bossBar?.(1); setMusicRate(1.06);
    }
    if (b.state === 'gone') return;
    b.t += dt; if (b.invT > 0) b.invT -= dt; if (b.hitT > 0) b.hitT -= dt;
    const toP = Math.sign(p.x - b.x) || 1, enraged = b.hp <= b.hpMax / 2, sk = this.sk;
    switch (b.state) {
      case 'enter':
        b.vx = -6; if (Math.random() < dt * 10) this.fx.dust(b.x, 0, 0, 2, -1);
        if (b.x <= WORLD.ARENA1 - 3.5) { b.state = 'idle'; b.t = 0; b.vx = 0; this.fx.text('GOBBLE GOBBLE!', b.x, 2.8, 0.3, '#ffb070', 1); sfx.hit(); }
        break;
      case 'idle':
        b.facing = toP; b.vx = damp(b.vx, toP * (enraged ? 1.6 : 1.1), 4, dt);
        if (b.t > (enraged ? sk.idleMad : sk.idle)) { b.cycle++; b.t = 0; b.vx = 0; b.state = enraged && b.cycle % 3 === 0 ? 'stomp' : 'windup'; if (b.state === 'stomp') { b.vy = 9; b.stompK = 0; this.fx.text('FLAP!', b.x, 2.9, 0.3, '#ffd28a', 1); } }
        break;
      case 'windup':
        b.vx = 0; b.facing = toP;
        if (Math.random() < dt * 16) this.fx.dust(b.x - b.facing * 0.8, 0, 0.2, 2, -b.facing);
        if (b.t > (enraged ? sk.windupMad : sk.windup)) { b.state = 'charge'; b.t = 0; b.vx = b.facing * (enraged ? sk.chargeMad : sk.charge); this.fx.text('CHARGE! JUMP!', b.x, 2.9, 0.3, '#ff5a3a', 1); sfx.whack(); }
        break;
      case 'charge':
        if (Math.random() < dt * 20) this.fx.dust(b.x - b.facing * 0.9, 0, 0, 2, -b.facing);
        if ((b.vx < 0 && b.x <= WORLD.ARENA0 + 1.2) || (b.vx > 0 && b.x >= WORLD.ARENA1 - 0.2)) {
          b.state = 'stunned'; b.t = 0; b.vx = 0; this.shake = 0.45; sfx.whack(); sfx.hit();
          this.fx.ring(b.x + b.facing * 1.0, 1, 0.2, 0xffffff, 2.2, 0.35); this.fx.sparkle(b.x + b.facing, 1.6, 0, 0xffe14a, 18, 3);
          this.fx.text('DIZZY! HIT HIM!', b.x, 3.0, 0.3, '#ffe14a', 1);
        }
        break;
      case 'stunned':
        b.vx = 0; if (b.t > (enraged ? sk.dizzyMad : sk.dizzy)) { b.state = 'idle'; b.t = 0; }
        break;
      case 'stomp': {
        b.vx = 0; b.vy -= 24 * dt; b.y += b.vy * dt; b.stompK = Math.min(1, b.t / 0.75);
        if (b.y <= 0 && b.vy < 0) {
          b.y = 0; b.state = 'idle'; b.t = 0; this.shake = 0.5; sfx.bigFart();
          this.fx.ring(b.x, 0.15, 0, 0xffd28a, 3.4, 0.5); this.fx.dust(b.x, 0, 0, 16); this.fx.sparkle(b.x, 0.6, 0, 0xd8b27a, 14, 3); this.fx.text('FEATHER QUAKE!', b.x, 2.8, 0.3, '#ffd28a', 1.1);
          if (p.grounded && Math.abs(p.x - b.x) < 3.2) this.hurt(b.x);
        }
        break;
      }
      case 'defeated':
        b.vy = damp(b.vy, 3.2, 2, dt); b.y += b.vy * dt; b.vx = 8; b.facing = 1;
        r.root.rotation.z = Math.sin(b.t * 6) * 0.12;
        if (Math.random() < dt * 10) this.fx.sparkle(b.x - 0.6, b.y + 1.2, 0, 0xd8b27a, 2, 1.5);
        if (b.y > 14) { b.state = 'gone'; b.done = true; r.root.visible = false; this.ui.bossBar?.(null); }
        if (b.x > WORLD.JESS_X + 22) { b.state = 'gone'; b.done = true; r.root.visible = false; this.ui.bossBar?.(null); }
        if (b.t > 1.4) { b.done = true; this.ui.bossBar?.(null); }
        break;
    }
    b.x += b.vx * dt;
    if (b.state !== 'defeated' && b.state !== 'enter') b.x = clamp(b.x, WORLD.ARENA0 + 1.1, WORLD.ARENA1 + 0.1);
    // contact
    if (this.state === 'playing' && !b.done && b.state !== 'defeated' && b.state !== 'enter' && Math.abs(p.x - b.x) < 1.35 && p.y < 1.45 + b.y) {
      if (p.rollT > 0 || p.puppyT > 0 || p.mortyT > 0) { if (b.invT <= 0) { this.damageBoss(1, p.rollT > 0 ? 'ROLL!' : 'BONK!'); p.vx = -toP * 6; p.vy = 6; p.grounded = false; p.rollT = 0; } }
      else if (b.state === 'charge') { this.hurt(b.x); p.vx = toP * 7; }
      else if (b.state !== 'stunned' && p.invT <= 0) { p.vx = toP * 5; if (p.grounded) { p.vy = 4; p.grounded = false; } }
    }
    if (b.hitT <= 0) this.ui.bossBar?.(b.done ? null : b.hp / b.hpMax, false);
  }

  killEnemy(e, pts, label) {
    if (!e.alive) return;
    e.alive = false; e.dyingT = 1.1; e.vx = Math.sign(e.x - this.p.x || 1) * rand(5, 8); e.vy = rand(7, 10); e.spinDir = Math.sign(e.vx);
    e.frozenT = 0;
    this.addScore(pts, e.x, e.y + 1, e.type === 'cat' ? '#ffb15c' : '#b8d4ff', label);
    this.fx.burst(e.x, e.y + 0.4, 0, e.type === 'cat' ? 0xffb15c : 0xdfe8ff, 18);
    this.fx.ring(e.x, e.y + 0.4, 0.1, 0xffffff, 1.2, 0.25);
    if (e.type === 'cat') sfx.meow(); else sfx.coo();
    const p = this.p;
    p.kills++;
    if (e.type === 'cat') {
      p.catKills++;
      if (p.catKills % C.POWER_EVERY === 0) {
        p.kickT = C.KICK_T; sfx.kickMode(); this.popText('KICK MODE!', '#ff8a3d', 1.6);
        this.fx.burst(p.x, p.y + 0.6, 0, 0xff8a3d, 40); this.shake = 0.3;
      }
    } else {
      p.pigeonKills++;
      if (p.pigeonKills % C.POWER_EVERY === 0 && !this.chicken) this.spawnChicken();
    }
  }

  collect(it) {
    const p = this.p;
    it.taken = true;
    if (it.kind === 'melon') {
      p.melons++; this.addScore(50, it.x, it.y + 0.4, '#ff7b8f');
      sfx.collectMelon(p.combo);
      this.fx.sparkle(it.x, it.y, 0, 0xff8fa0, 12);
      if (p.melons % C.POWER_EVERY === 0) { p.jumpLvl++; sfx.powerUp(); this.popText('JUMP UP!', '#ff7b8f'); this.fx.ring(p.x, p.y + 0.5, 0.1, 0xff8fa0, 1.6, 0.4); }
    } else {
      p.fish++; p.stamina = Math.min(C.STAMINA_MAX, p.stamina + 30);
      this.addScore(30, it.x, it.y + 0.4, '#8fd3ff');
      sfx.collectFish(p.combo);
      this.fx.sparkle(it.x, it.y, 0, 0x9fdcff, 12);
      if (p.fish % C.POWER_EVERY === 0) {
        if ((p.fish / C.POWER_EVERY) % 2 === 1) { p.speedLvl++; this.popText('SPEED UP!', '#7ee3ff'); }
        else { p.sizeLvl++; this.popText('SIZE UP!', '#c6ff7e'); }
        sfx.powerUp(); this.fx.ring(p.x, p.y + 0.5, 0.1, 0x9fdcff, 1.6, 0.4);
      }
    }
  }

  hurt(fromX) {
    const p = this.p;
    if (p.invT > 0 || p.safeT > 0 || p.fartT > 0 || p.mortyT > 0 || p.rollT > 0 || this.state !== 'playing') return;
    if (p.shield) {
      p.shield = false; p.invT = 1.2; sfx.whack(); this.shake = 0.15;
      this.popText('SHIELD!', '#ffd34d', 1.3); this.fx.ring(p.x, p.y + 0.55, 0, 0xffd34d, 1.8, 0.35); this.fx.sparkle(p.x, p.y + 0.6, 0, 0xffe36b, 20, 3);
      return;
    }
    const sk = this.sk;
    p.lives -= sk.hit; p.invT = sk.invT; this.shake = 0.35; this.hitStop = 0.08;
    p.vy = 6; p.vx = -Math.sign(fromX - p.x || p.facing) * 4; p.grounded = false; p.onPlat = null; p.napping = false;
    sfx.hit();
    this.fx.sparkle(p.x, p.y + 0.5, 0, 0xff5252, 16, 4);
    p.stamina = Math.max(0, p.stamina - sk.staminaHit);
    if (p.stamina <= 0) {
      if (p.jumpLvl > 0) { p.jumpLvl--; this.popText('JUMP -1', '#ff5252', 1); }
      else if (p.speedLvl > 0) { p.speedLvl--; this.popText('SPEED -1', '#ff5252', 1); }
      else if (p.sizeLvl > 0) { p.sizeLvl--; this.popText('SIZE -1', '#ff5252', 1); }
    }
    if (p.kickT > 0) p.kickT = Math.max(0, p.kickT - 2);
    this.ui.flashDamage();
    if (p.lives <= 0) {
      this.state = 'gameover'; sfx.gameOver(); setMusic(false);
      this.ui.showEnd(false, this.stats());
    }
  }

  onPowerEnd(k) {
    const map = { puppyT: 'PUPPY RUN OVER', skyT: 'SKY CHOP OVER', dblT: 'DOUBLE JUMP OVER', zoomT: 'ZOOMIES OVER', magT: 'MAGNET OVER', kickT: 'KICK MODE OFF', fartT: 'FART OVER', barkT: 'BARK OVER', shakeT: 'SHAKE WORE OFF', flyT: 'FLIGHT OVER', mortyT: '' };
    if (map[k]) this.popText(map[k], '#cfcfcf', 0.9, 1.4, '');
  }

  updateEnemies(dt) {
    const p = this.p, diff = this.difficulty, pace = this.sk.enemy;
    const near = this.cam.x;
    for (const e of this.enemies) {
      if (!e.alive) {
        if (e.dyingT > 0) { e.dyingT -= dt; e.x += e.vx * dt; e.vy -= 22 * dt; e.y += e.vy * dt; }
        continue;
      }
      if (Math.abs(e.x - near) > 26) continue; // sleep far away
      if (e.frozenT > 0) { e.frozenT -= dt; }
      else if (e.type === 'cat') {
        e.x += e.dir * 1.08 * diff * pace * dt;
        if (Math.abs(e.x - e.baseX) > e.range) { e.dir = Math.sign(e.baseX - e.x); }
        // pee puddles freeze cats
        if (e.y < 0.1) for (const pd of this.puddles) if (Math.abs(pd.x - e.x) < 0.6) {
          e.frozenT = 5; sfx.freeze(); this.addScore(150, e.x, 1.2, '#bfeaff', 'FROZEN'); this.fx.sparkle(e.x, 0.5, 0, 0xbfeaff, 16); break;
        }
      } else {
        e.x += e.dir * 1.44 * diff * pace * dt;
        if (Math.abs(e.x - e.baseX) > e.range) e.dir = Math.sign(e.baseX - e.x);
        e.y = e.baseY + Math.sin(this.t * 2 + e.ph) * 0.3;
      }
      // damage player
      if (e.frozenT <= 0 && this.state === 'playing') {
        const dx = p.x - e.x;
        const dy = (p.y + 0.4) - (e.type === 'cat' ? e.y + 0.3 : e.y);
        if (Math.abs(dx) < 0.56 && Math.abs(dy) < 0.6) {
          if (p.fartT > 0) this.killEnemy(e, 100, 'FART');
          else if (p.rollT > 0) { this.killEnemy(e, 120, 'ROLL!'); this.hitStop = 0.04; sfx.whack(); }
          else if (p.puppyT > 0) { this.killEnemy(e, 120, 'BOWLED!'); this.hitStop = 0.03; sfx.whack(); }
          else if (p.fskT > 0) this.killEnemy(e, 150, 'FLYING KICK!');
          else this.hurt(e.x);
        }
      }
    }
  }

  spawnChicken() {
    const p = this.p;
    this.chicken = { x: p.x + p.facing * srand(4, 7), y: 9, vy: 0, dir: -p.facing, grounded: false, t: 0, changeT: 1 };
    this.chickenRig.root.visible = true;
    sfx.chicken(); this.popText('A CHICKEN FELL FROM THE SKY!', '#fff59d', 1.05, 1.8);
  }
  updateChicken(dt) {
    const c = this.chicken, p = this.p;
    c.t += dt;
    if (!c.grounded) { c.vy -= 20 * dt; c.y += c.vy * dt; if (c.y <= 0) { c.y = 0; c.grounded = true; this.fx.dust(c.x, 0, 0, 8); } }
    else {
      c.changeT -= dt;
      if (c.changeT <= 0) { c.dir = Math.random() < 0.5 ? -1 : 1; c.changeT = rand(0.4, 1.2); }
      c.x += c.dir * 3.6 * dt;
      if (Math.random() < dt * 1.5) { c.vy = 4; c.grounded = false; }
      if (Math.random() < dt * 6) this.fx.dust(c.x, 0, 0, 1);
    }
    c.x = clamp(c.x, 1, WORLD.L - 2);
    if (Math.abs(c.x - p.x) < 0.7 && Math.abs(c.y - p.y) < 0.9) {
      this.chicken = null; this.chickenRig.root.visible = false;
      p.fartT = C.FART_T; sfx.fart(); this.popText('FART NUKE!!!', '#b6ff5a', 1.8, 1.8);
      this.shake = 0.6;
      this.fx.smoke(p.x, p.y + 0.4, 0, 0x9bd04a, 60, 6);
      this.fx.ring(p.x, p.y + 0.5, 0.1, 0xb6ff5a, 6, 0.7);
      const half = this.viewHalf + 1;
      for (const e of this.enemies) if (e.alive && Math.abs(e.x - this.cam.x) < half) this.killEnemy(e, 200, 'NUKED');
      if (this.bossHittable() && Math.abs(this.boss.x - this.cam.x) < half) this.damageBoss(4, 'NUKED');
    }
    if (c.t > 25) { this.chicken = null; this.chickenRig.root.visible = false; }
  }

  updateWorldCritters(dt, idle = false) {
    const camX = this.cam.x;
    // foxes chase pigeons, and climb
    for (const f of this.foxes) {
      if (Math.abs(f.x - camX) > 30) { f.rig.root.visible = false; continue; }
      f.rig.root.visible = true;
      this.updateFox(f, dt, idle);
      f.rig.root.position.set(f.x, f.y, f.z);
      f.rig.update(dt, f);
    }
    // raccoons + trash
    for (const r of this.racs) {
      if (Math.abs(r.x - camX) > 30) { r.rig.root.visible = false; continue; }
      r.rig.root.visible = true;
      r.t -= dt;
      if (r.state === 'wander') {
        const can = this.cans.find((c) => !c.knocked && Math.abs(c.x - r.x) < 6);
        if (can && !idle) { r.state = 'approach'; r.target = can; }
        else { if (r.t <= 0) { r.facing = Math.random() < 0.5 ? -1 : 1; r.t = rand(1.5, 3); } r.vx = r.facing * 0.6; }
      } else if (r.state === 'approach') {
        const c = r.target; r.facing = Math.sign(c.x - r.x) || 1; r.vx = r.facing * 1.0;
        if (Math.abs(c.x - r.x) < 0.6) { r.state = 'knocking'; r.t = 1; r.vx = 0; }
      } else if (r.state === 'knocking') {
        r.vx = 0;
        if (r.t <= 0) {
          const c = r.target; c.knocked = true; c.food = true; c.foodX = c.x + 0.9 * r.facing; c.foodDir = r.facing;
          sfx.trash(); this.fx.dust(c.x, 0.3, -1, 10);
          if (Math.abs(c.x - this.p.x) < 14) this.fx.text('TRASH FOOD!', c.x, 1.6, 0.3, '#ffd28a', 0.8);
          r.state = 'flee'; r.t = 4; r.facing = -r.facing;
        }
      } else if (r.state === 'flee') { r.vx = r.facing * 2.4; if (r.t <= 0) { r.state = 'wander'; r.t = 2; } }
      r.x += r.vx * dt;
      r.rig.root.position.set(r.x, 0, -0.75);
      r.rig.update(dt, r);
    }
    for (const c of this.cans) {
      const vis = Math.abs(c.x - camX) < 30; c.rig.root.visible = vis; if (!vis) continue;
      if (c.knocked) {
        c.rig.can.rotation.z = damp(c.rig.can.rotation.z, -Math.PI / 2 * (c.foodDir || 1) * -1, 10, dt);
        c.rig.can.position.y = damp(c.rig.can.position.y, 0.26, 10, dt);
        c.rig.lid.position.x = damp(c.rig.lid.position.x, (c.foodDir || 1) * 1.4, 6, dt); c.rig.lid.position.y = damp(c.rig.lid.position.y, 0.04, 8, dt);
        c.rig.lid.rotation.x = damp(c.rig.lid.rotation.x, Math.PI / 2, 6, dt);
        c.rig.food.visible = c.food;
        if (c.food) { c.rig.food.position.set(c.foodX - c.x, 0.15 + Math.sin(this.t * 4) * 0.05, 1.25); c.rig.food.rotation.y += dt * 2; if (Math.random() < dt * 4) this.fx.sparkle(c.foodX, 0.35, 0, 0xffd28a, 1, 1); }
      }
    }
  }

  // ───────────────────────── grey foxes ─────────────────────────
  // Healdsburg's grey foxes climb, as they really do: a fox trots to the foot of a fence or a shop front, runs up it,
  // over the edge, along the top or the roof's edge, stops to look about, then comes down again (a hop off a fence,
  // head first down a wall), or pounces from up there on a pigeon below. On the ground they chase pigeons as before,
  // and the pounce is a leap you can see. Foxes never touch Peabody, and leave the birds right by him to him.
  climbables() {
    if (this._climbs) return this._climbs;
    const F = WORLD.FRONT_Z, out = [];
    for (const f of WORLD.FENCES) out.push({ kind: 'fence', x0: f.x0 + 0.3, x1: f.x1 - 0.3, top: f.top, topZ: f.z, wallZ: f.z + 0.2 });
    // flat-roofed shop fronts up to two storeys (taller ones run out of view), out of the turkey's arena; climbed at an end
    // clear of its awning and balcony, and walked along the cornice
    for (const b of this.layout.buildings) {
      if (b.roof !== 'flat' || b.iggy || b.H > 6.7 || b.x0 + b.w > 440) continue;
      const clear = (x) => !(b.awning && x > b.awning.x0 - 0.4 && x < b.awning.x0 + b.awning.w + 0.4) && !(b.balcony && x > b.balcony.x0 - 0.35 && x < b.balcony.x0 + b.balcony.w + 0.35);
      const spots = [b.x0 + 0.45, b.x0 + b.w - 0.45].filter(clear);
      if (spots.length) out.push({ kind: 'wall', x0: b.x0 + 0.3, x1: b.x0 + b.w - 0.3, top: b.H + 0.04, topZ: F + 0.1, wallZ: F + 0.26, spots });
    }
    return (this._climbs = out);
  }
  foxClimbFor(f) {
    let best = null, bd = 7;
    for (const c of this.climbables()) {
      const cx = c.spots ? c.spots.reduce((a, s) => (Math.abs(s - f.x) < Math.abs(a - f.x) ? s : a)) : clamp(f.x + f.facing * 0.8, c.x0, c.x1);
      if (Math.abs(cx - f.x) < bd) { bd = Math.abs(cx - f.x); best = { c, cx }; }
    }
    return best;
  }
  // a pigeon in reach of a pounce from where the fox is (not one right by Peabody: that one is his)
  foxPrey(f, reach, below, above) {
    const p = this.p;
    return this.enemies.find((e) => e.alive && e.type === 'pigeon' && Math.abs(e.x - f.x) < reach && e.y < f.y + above && e.y > f.y - below && Math.abs(e.x - p.x) > 1.4);
  }
  foxLeap(f, tg) { // a ballistic arc to where the bird is now
    const T = clamp(Math.hypot(tg.x - f.x, tg.y - f.y) / 6.5, 0.3, 0.6);
    f.facing = Math.sign(tg.x - f.x) || f.facing;
    f.vx = (tg.x - f.x) / T; f.vy = (tg.y - 0.4 - f.y + 10 * T * T) / T;
    f.goalZ = 0; f.target = tg; f.state = 'leap'; f.pose = 'leap';
  }
  foxDown(f) { // done up there: a hop down off a fence; to a climbing spot and head first down a wall
    const c = f.climb;
    if (c.kind === 'fence') { f.state = 'leap'; f.pose = 'leap'; f.target = null; f.vx = f.facing * 1.4; f.vy = 3.2; f.goalZ = -0.9; return; }
    f.goal = c.spots.reduce((a, s) => (Math.abs(s - f.x) < Math.abs(a - f.x) ? s : a)); f.state = 'toEdge';
  }
  updateFox(f, dt, idle) {
    f.t -= dt;
    const c = f.climb;
    switch (f.state) {
      case 'idle': case 'trot': {
        f.pose = 'walk'; f.y = 0;
        const prey = idle ? null : this.enemies.find((e) => e.alive && e.type === 'pigeon' && Math.abs(e.x - f.x) < 8 && e.y < 4.2);
        if (prey) { f.state = 'chase'; f.target = prey; break; }
        if (f.t <= 0) {
          const pick = Math.random() < 0.45 ? this.foxClimbFor(f) : null;
          if (pick) { f.climb = { ...pick.c, cx: pick.cx }; f.state = 'toClimb'; f.walked = false; }
          else { f.state = Math.random() < 0.5 ? 'idle' : 'trot'; f.t = rand(1.5, 3.5); f.facing = Math.random() < 0.5 ? -1 : 1; }
        }
        f.vx = f.state === 'trot' ? f.facing * 1.2 : damp(f.vx, 0, 6, dt);
        f.z = damp(f.z, -0.9, 4, dt);
        break;
      }
      case 'chase': {
        const tg = f.target; f.pose = 'walk';
        if (!tg || !tg.alive) { f.state = 'idle'; f.t = 1; f.target = null; break; }
        f.facing = Math.sign(tg.x - f.x) || 1; f.vx = f.facing * 2.8;
        f.z = damp(f.z, -0.9, 4, dt);
        if (Math.abs(tg.x - f.x) < 0.5 && Math.abs(tg.x - this.p.x) > 1.4) this.foxLeap(f, tg); // pounce
        break;
      }
      case 'toClimb': { // to the foot of the fence or wall
        f.pose = 'walk'; f.y = 0;
        const dx = c.cx - f.x;
        f.facing = Math.sign(dx) || f.facing;
        f.vx = Math.abs(dx) < 0.04 ? 0 : f.facing * Math.min(2.2, Math.abs(dx) * 6 + 0.3);
        f.z = damp(f.z, c.wallZ, 6, dt);
        if (Math.abs(dx) < 0.06 && Math.abs(f.z - c.wallZ) < 0.05) { f.x = c.cx; f.vx = 0; f.z = c.wallZ; f.state = 'up'; }
        break;
      }
      case 'up': // up the face
        f.pose = 'up'; f.vx = 0; f.z = c.wallZ;
        f.y += (c.kind === 'fence' ? 2.0 : 2.7) * dt;
        if (f.y >= c.top - 0.3) { f.state = 'over'; f.t = 0.3; }
        break;
      case 'over': // over the edge, onto the top
        f.pose = 'walk'; f.vx = 0;
        f.y = damp(f.y, c.top, 16, dt); f.z = damp(f.z, c.topZ, 16, dt);
        if (f.t <= 0) { f.y = c.top; f.z = c.topZ; f.state = 'top'; f.goal = this.foxGoal(f); }
        break;
      case 'top': { // along the top, watching for a bird to pounce on
        f.pose = 'walk'; f.y = c.top; f.z = c.topZ;
        const prey = idle ? null : this.foxPrey(f, 3.4, 4, c.kind === 'fence' ? 2.6 : 1.2);
        if (prey) { this.foxLeap(f, prey); break; }
        const dx = f.goal - f.x;
        f.facing = Math.sign(dx) || f.facing; f.vx = Math.abs(dx) < 0.08 ? 0 : f.facing * 1.5;
        if (Math.abs(dx) < 0.08) { f.state = 'look'; f.t = rand(0.8, 1.8); }
        break;
      }
      case 'look': { // stopped, looking about
        f.pose = 'look'; f.vx = 0;
        const prey = idle ? null : this.foxPrey(f, 3.4, 4, c.kind === 'fence' ? 2.6 : 1.2);
        if (prey) { this.foxLeap(f, prey); break; }
        if (f.t <= 0) { if (!f.walked && Math.random() < 0.4) { f.walked = true; f.state = 'top'; f.goal = this.foxGoal(f); } else this.foxDown(f); }
        break;
      }
      case 'toEdge': { // to a climbing spot, to go down
        f.pose = 'walk';
        const dx = f.goal - f.x;
        f.facing = Math.sign(dx) || f.facing; f.vx = Math.abs(dx) < 0.06 ? 0 : f.facing * Math.min(1.5, Math.abs(dx) * 6 + 0.3);
        if (Math.abs(dx) < 0.06) { f.x = f.goal; f.vx = 0; f.state = 'down'; f.t = 0.3; }
        break;
      }
      case 'down': // head first down the face (over the edge first)
        f.pose = 'down'; f.vx = 0;
        f.z = damp(f.z, c.wallZ, 16, dt);
        if (f.t <= 0) f.y -= 2.4 * dt;
        if (f.y <= 0.3) { f.y = 0; f.pose = 'walk'; f.state = 'idle'; f.t = rand(1, 2); f.climb = null; }
        break;
      case 'leap': { // in the air: a pounce, or a hop down
        f.pose = 'leap';
        f.vy -= 20 * dt; f.y += f.vy * dt;
        f.z = damp(f.z, f.goalZ, 6, dt);
        const tg = f.target;
        if (tg && tg.alive && Math.abs(tg.x - f.x) < 0.65 && Math.abs(tg.y - (f.y + 0.4)) < 0.8) {
          tg.alive = false; tg.dyingT = 0.8; tg.vx = f.facing * 2; tg.vy = 3; tg.spinDir = 1;
          this.fx.sparkle(tg.x, tg.y, 0, 0xdfe8ff, 10); f.target = null; f.vx *= 0.5;
          if (Math.abs(tg.x - this.p.x) < 12) this.fx.text('FOX GOT ONE!', tg.x, tg.y + 0.6, 0.3, '#ff9a5a', 0.8);
        }
        if (f.y <= 0 && f.vy < 0) { f.y = 0; f.vy = 0; f.vx = 0; f.pose = 'walk'; f.state = 'idle'; f.t = rand(1, 2); f.target = null; f.climb = null; this.fx.dust(f.x, 0, f.z, 4); }
        break;
      }
    }
    f.x += f.vx * dt;
  }
  foxGoal(f) { // somewhere else along the top
    const c = f.climb, d = (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 3.4);
    let g = clamp(f.x + d, c.x0, c.x1);
    if (Math.abs(g - f.x) < 0.8) g = clamp(f.x - d, c.x0, c.x1);
    return g;
  }

  updateMorty(dt) {
    const m = this.morty, p = this.p;
    if (!m.triggered && p.x >= WORLD.MORTY_X) {
      m.triggered = true; m.active = true; m.x = p.x + 12; m.state = 'run'; m.t = 0;
      this.mortyRig.root.visible = true;
      this.popText('MORTY!', '#ffffff', 1.4, 1.8); sfx.mortyBark();
    }
    if (!m.active) return;
    m.t += dt;
    if (m.state === 'run') {
      const tx = p.x - p.facing * 1.1;
      m.facing = Math.sign(tx - m.x) || -1; m.vx = m.facing * 8;
      if (Math.abs(tx - m.x) < 0.3) { m.state = 'sniffing'; m.t = 0; m.vx = 0; m.facing = p.facing; this.fx.text('*sniff sniff*', m.x, 2.2, 0.3, '#fff', 0.9); sfx.sniff(); }
    } else if (m.state === 'sniffing') {
      m.vx = 0; m.x = damp(m.x, p.x - p.facing * 1.0, 6, dt); m.facing = p.facing;
      if (Math.random() < dt * 3) this.fx.heart(m.x + 0.5 * m.facing, 1.6, 0);
      if (m.t > 2) {
        m.state = 'leave'; p.mortyT = C.MORTY_T; sfx.morty();
        this.popText('MORTY POWER!', '#ffe27a', 1.5, 1.8);
        this.fx.burst(p.x, p.y + 0.5, 0, 0xffe27a, 36);
      }
    } else if (m.state === 'leave') {
      m.facing = 1; m.vx = 7;
      if (m.x - p.x > 25) { m.active = false; this.mortyRig.root.visible = false; }
    }
    m.x += m.vx * dt;
    this.mortyRig.root.position.set(m.x, 0, -0.55);
    this.mortyRig.update(dt, m);
  }

  // ───────────────────────── shop ─────────────────────────
  enterShop() {
    this.state = 'shop'; this.shopSel = 0; this.p.vx = 0;
    sfx.shop(); this.ui.openShop(this);
    clearJustPressed();
  }
  exitShop() {
    this.state = 'playing'; this.ui.closeShop(); this.p.x = WORLD.DOOR_X + 1.2; this.p.facing = 1;
    clearJustPressed();
  }
  shopItems() {
    return [
      { id: 'fries', name: 'Fries', cost: 10, desc: 'Bark blast for 15s — your chop also knocks out every pigeon nearby.' },
      { id: 'burger', name: 'Iggy Burger', cost: 20, desc: this.p.hasPee ? 'Already yours — pee power is permanent!' : 'Permanent pee power. Press ↓ to leave a puddle that freezes cats.' },
      { id: 'shake', name: 'Milkshake', cost: 0, desc: 'On the house! Speed boost for 10s.' },
    ];
  }
  buy(i) {
    const it = this.shopItems()[i], p = this.p;
    if (it.id === 'burger' && p.hasPee) { sfx.deny(); this.ui.shopMsg('You already have pee power!'); return; }
    if (this.fishAvail < it.cost) { sfx.deny(); this.ui.shopMsg(`Need ${it.cost - this.fishAvail} more minnows!`); return; }
    p.fishSpent += it.cost; sfx.shopBuy ? sfx.shopBuy() : sfx.shop(); sfx.powerUp();
    if (it.id === 'fries') { p.barkT = C.BARK_T; this.ui.shopMsg('BARK POWER! Chop to bark.'); }
    if (it.id === 'burger') { p.hasPee = true; this.ui.shopMsg('PEE POWER unlocked forever!'); }
    if (it.id === 'shake') { p.shakeT = C.SHAKE_T; this.ui.shopMsg('Zoom zoom! Speed boost!'); }
    this.ui.renderShop(this);
  }
  updateShop(dt) {
    if (input.jumpPressed()) { this.shopSel = (this.shopSel + 2) % 3; sfx.ui(); this.ui.renderShop(this); }
    if (input.downPressed()) { this.shopSel = (this.shopSel + 1) % 3; sfx.ui(); this.ui.renderShop(this); }
    if (input.attackPressed() || justPressed.Enter) this.buy(this.shopSel);
    if (input.leftPressed() || justPressed.Backspace) this.exitShop();
    this.updateWorldCritters(dt, true);
  }

  // ───────────────────────── Fideaux Pets (free treats) ─────────────────────────
  enterPet() {
    this.state = 'petshop'; this.p.vx = 0;
    if (this.p.treats.length >= TREAT_PICKS) this.petSel = 0;
    sfx.shop(); this.ui.openPet(this);
    clearJustPressed();
  }
  exitPet() {
    this.state = 'playing'; this.ui.show('hud'); this.p.x = WORLD.PET_DOOR + 1.2; this.p.facing = 1;
    clearJustPressed();
  }
  takeTreat(i) {
    const t = TREATS[i], p = this.p;
    if (!t) return;
    if (p.treats.includes(t.id)) { sfx.deny(); this.ui.petMsg(`You already have the ${t.name}! Pick a different one.`); return; }
    if (p.treats.length >= TREAT_PICKS) { sfx.deny(); this.ui.petMsg("That's your free treats for today — come back next run, good boy!"); return; }
    p.treats.push(t.id); sfx.treat(); sfx.powerUp();
    if (t.id === 'skybone') p.skyT = C.SKY_T;
    if (t.id === 'pupcake') p.dblT = C.DBL_T;
    if (t.id === 'zoomie') { p.zoomT = C.ZOOM_T; p.stamina = C.STAMINA_MAX; }
    if (t.id === 'guard') p.shield = true;
    if (t.id === 'magnet') p.magT = C.MAG_T;
    const left = TREAT_PICKS - p.treats.length;
    this.ui.petMsg(left > 0 ? `${t.power.split(' · ')[0]}! Great choice — pick ${left} more.` : `${t.power.split(' · ')[0]}! Enjoy, Peabody — go find Jessica!`);
    this.ui.renderPet(this, i);
  }
  updatePet(dt) {
    const n = TREATS.length;
    if (input.leftPressed()) { this.petSel = (this.petSel + n - 1) % n; sfx.ui(); this.ui.renderPet(this); }
    if (input.rightPressed()) { this.petSel = (this.petSel + 1) % n; sfx.ui(); this.ui.renderPet(this); }
    if (input.attackPressed() || justPressed.Enter) this.takeTreat(this.petSel);
    if (input.downPressed() || justPressed.Backspace) this.exitPet();
    this.updateWorldCritters(dt, true);
  }

  // ───────────────────────── cyclists (2 pass-bys) ─────────────────────────
  // A cyclist never hurts Peabody: it rides past on the street, in front of him, and nothing here touches his hearts.
  updateBikes(dt) {
    const p = this.p;
    for (const b of this.bikes) {
      if (!b.active && !b.done && p.x > b.trigX) {
        b.active = true; b.x = this.cam.x - 17; b.vx = 10.5; b.dir = 1; b.reacted = false; b.stinkT = 0;
        b.rig.root.visible = true; sfx.bell();
      }
      if (!b.active) continue;
      b.x += b.vx * dt;
      if (b.stinkT > 0) b.stinkT -= dt;
      if (!b.reacted && b.x > p.x - 3.4) {
        b.reacted = true; b.yelpT = 0.4;
        p.facing = 1; // turn his rear toward the approaching bike
        sfx.yelp(); this.popText('YIP! YIP!', '#fff2a8', 1.15, 1.75);
      }
      if (b.yelpT > 0) { b.yelpT -= dt; if (b.yelpT <= 0) this.bikeFart(b); }
      if (b.x > this.cam.x + 24) { b.active = false; b.done = true; b.rig.root.visible = false; }
      b.rig.root.position.set(b.x, -0.18, 2.9);
      b.rig.update(dt, b);
    }
  }
  bikeFart(b) {
    const p = this.p, bx = p.x - p.facing * 0.45;
    sfx.bigFart(); p.tootAnim = 0.9; this.shake = Math.max(this.shake, 0.12);
    for (let i = 0; i < 34; i++) {
      const k = Math.random();
      this.fx.smoke(bx - p.facing * k * 1.2, p.y + 0.3 + Math.random() * 0.6, k * 2.6, 0x9bd04a, 1, 1.1 + Math.random() * 0.8);
    }
    this.fx.ring(bx, p.y + 0.4, 0.4, 0xb8e070, 2.6, 0.5);
    this.popText('PFFFFT!', '#a6e05a', 1.5, 2.15);
    this.addScore(250, b.x, 2.4, '#a6e05a', 'BIKE BLAST!');
    b.stinkT = 1.8; b.vx = 15;
    // safe for as long as it lasts, as before, but without the blink that follows a hit, so it never looks like one
    p.safeT = Math.max(p.safeT, 0.8);
    for (const e of this.enemies) if (e.alive && Math.abs(e.x - p.x) < 2.6 && Math.abs(e.y - p.y) < 2) this.killEnemy(e, 60, 'PFFT!');
  }

  // ───────────────────────── win ─────────────────────────
  startWin() {
    sfx.bark();
    if (this.boss.state !== 'gone') { this.boss.state = 'gone'; this.boarRig.root.visible = false; this.ui.bossBar?.(null); }
    for (const b of this.bikes) { b.active = false; b.done = true; b.rig.root.visible = false; }
    this.jess.reached = true; this.state = 'win'; this.win = { t: 0, phase: 0 };
    const p = this.p; p.napping = false; p.vx = 0;
    this.jess.waving = false; this.jess.open = true; this.jess.faceCam = true;
    setMusicRate(1);
  }
  updateWin(dt) {
    const p = this.p, w = this.win, jx = WORLD.JESS_X;
    w.t += dt;
    if (w.phase === 0) {
      p.facing = 1; p.vx = 5;
      p.x += p.vx * dt; p.vy -= C.GRAVITY * dt; p.y = Math.max(0, p.y + p.vy * dt); p.grounded = p.y <= 0; if (p.grounded) p.vy = 0;
      if (p.x >= jx - 1.3 && p.grounded) { w.phase = 1; p.vy = 11; p.vx = 1.3; p.grounded = false; sfx.jump(); }
    } else if (w.phase === 1) {
      p.x += p.vx * dt; p.vy -= C.GRAVITY * dt; p.y += p.vy * dt;
      if (p.vy < 0 && p.y <= 0.78) { p.y = 0.78; p.vy = 0; p.vx = 0; w.phase = 2; w.t2 = 0; sfx.win(); sfx.bark(); setTimeout(() => sfx.bark(), 380); this.fx.confetti(jx, 2.5, 0, 90); this.jess.jump = true; }
    } else if (w.phase === 2) {
      w.t2 += dt;
      p.x = damp(p.x, jx + 0.72, 8, dt); p.y = 0.72 + Math.sin(this.t * 7) * 0.03;
      if (Math.random() < dt * 14) this.fx.heart(jx, 2.6, 0.3);
      if (Math.random() < dt * 2.5) this.fx.firework(jx + rand(-8, 8), rand(6, 9), -4);
      if (w.t2 > 3.2 && w.phase === 2) { w.phase = 3; this.state = 'victory'; this.ui.showEnd(true, this.stats()); }
    }
    this.updateWorldCritters(dt, true);
  }

  stats() {
    const p = this.p;
    return { score: p.score, melons: p.melons, fish: p.fish, kills: p.kills, cats: p.catKills, pigeons: p.pigeonKills, time: this.time };
  }

  // ───────────────────────── camera ─────────────────────────
  updateCamera(dt) {
    const cam = this.camera, p = this.p, c = this.cam;
    const aspect = cam.aspect;
    let tx, ty, tz, lx, ly, lz, fov = 34;
    const dist = aspect < 1.3 ? 19 : 14.5;
    if (this.photo) {
      const ph = this.photo; cam.position.set(ph[0], ph[1], ph[2]); cam.fov = ph[6] || 30; cam.updateProjectionMatrix(); cam.lookAt(ph[3], ph[4], ph[5]);
      this.viewHalf = 20; return;
    }
    if (this.state === 'menu') {
      const a = Math.sin(this.t * 0.15) * 0.18;
      if (aspect < 0.9) { tx = p.x + 0.4 + a * 1.2; ty = 1.25; tz = 6.6; lx = p.x + 0.3; ly = 0.05; lz = -0.4; fov = 44; }
      else { tx = p.x - 1.6 + a * 3; ty = 1.55; tz = 6.2; lx = p.x - 2.1; ly = 1.25; lz = -0.6; fov = 38; }
      c.x = p.x;
    } else if (this.state === 'petshop') {
      tx = WORLD.PET_DOOR; ty = 2.2; tz = 6.5; lx = WORLD.PET_DOOR; ly = 1.9; lz = -2.4; fov = 40;
    } else if (this.state === 'shop') {
      tx = WORLD.DOOR_X; ty = 2.6; tz = 7.5; lx = WORLD.DOOR_X; ly = 2.4; lz = -2.4; fov = 40;
    } else if (this.state === 'win' || this.state === 'victory' || ((this.state === 'initials') && this.jess.reached)) {
      const jx = WORLD.JESS_X;
      tx = jx + 2.2; ty = 2.9; tz = 8.2; lx = jx + 0.4; ly = 1.8; lz = 0; fov = 34;
    } else {
      c.look = damp(c.look, p.facing * 1.8 + p.vx * 0.12, 2.5, dt);
      const B = this.boss, fight = B && B.state !== 'wait' && B.state !== 'gone' && !B.done;
      c.fight = damp(c.fight || 0, fight ? 1 : 0, 2, dt);
      const bx = fight ? clamp((p.x + B.x) / 2, p.x - 6, p.x + 6) : p.x + c.look;
      c.x = damp(c.x, bx, fight ? 3 : 6, dt);
      c.y = damp(c.y, p.grounded ? p.y : Math.min(c.y, p.y) + (p.y - c.y) * 0.3, p.grounded ? 3.5 : 2, dt);
      tx = c.x; ty = 3.7 + c.y * 0.6 + c.fight * 0.6; tz = dist + c.fight * 5.5; lx = c.x; ly = 2.35 + c.y * 0.75 + c.fight * 0.2; lz = 0;
    }
    let k = this.state === 'playing' ? 1 : 1 - Math.exp(-3 * dt);
    if (Math.abs(cam.position.x - tx) > 25) { k = 1; cam.position.set(tx, ty, tz); c.lx = lx; c.ly = ly; c.lz = lz; }
    if (this.state === 'playing') { cam.position.set(damp(cam.position.x, tx, 30, dt), damp(cam.position.y, ty, 8, dt), damp(cam.position.z, tz, 4, dt)); }
    else cam.position.set(lerp(cam.position.x, tx, k), lerp(cam.position.y, ty, k), lerp(cam.position.z, tz, k));
    c.lx = c.lx === undefined ? lx : lerp(c.lx, lx, this.state === 'playing' ? 1 : k);
    c.ly = c.ly === undefined ? ly : lerp(c.ly, ly, this.state === 'playing' ? 1 - Math.exp(-8 * dt) : k);
    c.lz = c.lz === undefined ? lz : lerp(c.lz, lz, k);
    cam.fov = damp(cam.fov, fov, 3, dt); cam.updateProjectionMatrix();
    cam.lookAt(c.lx, c.ly, c.lz);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.5;
      cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s;
    }
    this.viewHalf = Math.tan((cam.fov * Math.PI) / 360) * cam.position.z * aspect;
  }

  // ───────────────────────── visuals ─────────────────────────
  syncVisuals(dt) {
    const p = this.p, t = this.t, camX = this.camera.position.x;
    const half = (this.viewHalf || 12) + 3;
    // Peabody
    const pr = this.peabody;
    pr.root.position.set(p.x, p.y, 0);
    const sz = (1 + p.sizeLvl * 0.08) * 1.4;
    pr.root.scale.setScalar(damp(pr.root.scale.x, sz, 6, dt));
    pr.root.visible = !(p.invT > 0 && Math.sin(t * 30) > 0.6 && this.state === 'playing');
    pr.update(dt, {
      facing: p.facing, vx: p.vx, vy: p.vy, grounded: p.grounded || this.state === 'shop' || this.state === 'petshop', landT: p.landT / 0.12,
      attackT: p.attackT, kickMode: p.kickT > 0, napping: p.napping, peeing: p.peeT > 0, flying: p.flyT > 0,
      rollK: p.rollT > 0 ? 1 - p.rollT / C.ROLL_T : -1, trickK: p.trickT > 0 ? 1 - p.trickT / C.TRICK_T : -1, toot: p.tootAnim / 0.6, rollDir: p.rollDir,
      happy: this.state !== 'playing' || p.combo > 2 || p.puppyT > 0, barkT: p.barkAnim, mortyPower: p.mortyT > 0, hurtFlash: p.invT > 0, airH: 0,
      atkVar: p.atkVar, fsk: p.fskT > 0 ? 1 - p.fskT / C.FSK_T : -1, puppy: p.puppyT > 0,
    });
    // pooled entities
    const syncPool = (list, pool, vis, place) => {
      for (const e of list) {
        const v = vis(e);
        if (v && !e.rig) e.rig = pool.take();
        else if (!v && e.rig) { pool.give(e.rig); e.rig = null; }
        if (e.rig) place(e, e.rig);
      }
    };
    const itemVis = (e) => !e.taken && Math.abs(e.x - camX) < half;
    const placeItem = (e, r) => {
      r.root.position.set(e.x, e.y + Math.sin(t * 2.6 + e.ph) * 0.08, 0);
      r.spin.rotation.y = t * 2.2 + e.ph;
      const s = 1 + Math.sin(t * 5 + e.ph) * 0.04; r.root.scale.setScalar(s);
    };
    syncPool(this.entities.melon, this.pools.melon, itemVis, placeItem);
    syncPool(this.entities.fish, this.pools.fish, itemVis, placeItem);
    const enVis = (e) => (e.alive || e.dyingT > 0) && Math.abs(e.x - camX) < half;
    const placeEnemy = (e, r) => {
      r.root.position.set(e.x, e.y, e.type === 'cat' ? 0 : 0);
      const sc = (e.alive ? 1 : Math.max(0.01, e.dyingT)) * 1.3 * (r.sizeMul || 1);
      r.root.scale.setScalar(sc);
      r.update(dt, e.frozenT > 0 ? { ...e, frozen: true } : e);
    };
    syncPool(this.entities.cat, this.pools.cat, enVis, placeEnemy);
    syncPool(this.entities.pigeon, this.pools.pigeon, enVis, placeEnemy);
    // chicken
    if (this.chicken) { const c = this.chicken; this.chickenRig.root.position.set(c.x, c.y, 0); this.chickenRig.update(dt, c); }
    // bench locals + snacks
    for (const b of this.benchers) { const vis = Math.abs(b.x - camX) < half + 3; b.rig.root.visible = vis; if (vis) b.rig.update(dt, { tossNow: b.tossNow, happy: b.happyT > 0 }); b.tossNow = false; }
    for (const f of this.foods) if (f.active) { f.rig.root.position.set(f.x, f.y, f.z || 0); f.rig.update(dt, f.landed); if (f.landed && Math.random() < dt * 5) this.fx.sparkle(f.x, f.y + 0.2, 0, 0xfff1a0, 1, 1); }
    // boss
    if (this.boarRig.root.visible) { const b = this.boss; this.boarRig.root.position.set(b.x, b.y, -0.15); this.boarRig.update(dt, b); }
    // the possum and the snack in the air
    { const o = this.possum, r = this.possumRig; const vis = o.state !== 'gone' && Math.abs(o.x - camX) < half + 2; r.root.visible = vis; if (vis) { r.root.position.set(o.x, 0, o.z); r.update(dt, o); } }
    if (this.gift.active) { const g = this.gift, r = this.giftRig.root; r.position.set(g.x, g.y, g.z); r.rotation.y += dt * 6; r.rotation.z += dt * 9; }
    // Jessica
    this.jessRig.update(dt, this.jess);
    if (Math.abs(WORLD.JESS_X - camX) < 30 && Math.random() < dt * 0.8 && !this.jess.reached) this.fx.heart(WORLD.JESS_X, 2.7, -0.6);
    // beds glow hint
    for (const b of this.beds) b.rig.root.visible = Math.abs(b.x - camX) < half + 4;
    // shop door indicator
    const nearShop = Math.abs(p.x - WORLD.DOOR_X) < 10 && this.state === 'playing';
    this.doorArrow.visible = nearShop;
    this.doorArrow.position.set(WORLD.DOOR_X, 3.1 + Math.sin(t * 4) * 0.15, WORLD.FRONT_Z + 0.6);
    this.doorArrow.rotation.y = t * 2;
    const nearPetV = Math.abs(p.x - WORLD.PET_DOOR) < 10 && this.state === 'playing';
    this.petGlow.material.opacity = damp(this.petGlow.material.opacity, this.nearPet && this.state === 'playing' ? 0.5 + Math.sin(t * 6) * 0.1 : nearPetV ? 0.14 : 0, 6, dt);
    this.shieldMesh.visible = p.shield && this.state === 'playing';
    if (this.shieldMesh.visible) { this.shieldMesh.position.set(p.x, p.y + 0.6, 0); this.shieldMesh.scale.setScalar(sz / 1.4 * (1 + Math.sin(t * 5) * 0.04)); this.shieldMesh.material.opacity = 0.12 + Math.sin(t * 3) * 0.04; }
    if (p.skyT > 0 && this.state === 'playing' && Math.random() < dt * 10) this.fx.sparkle(p.x + (Math.random() - 0.5) * 0.6, p.y + 0.9, 0, 0x9fdcff, 1, 1);
    if (p.zoomT > 0 && this.state === 'playing' && Math.abs(p.vx) > 3) this.fx.speed(p.x, p.y, 0, p.facing);
    this.doorGlow.material.opacity = damp(this.doorGlow.material.opacity, this.nearDoor && this.state === 'playing' ? 0.45 + Math.sin(t * 6) * 0.1 : nearShop ? 0.12 : 0, 6, dt);
  }

  renderToText() {
    const p = this.p;
    return JSON.stringify({
      state: this.state, paused: this.paused, difficulty: this.sk.id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), vx: +p.vx.toFixed(2), vy: +p.vy.toFixed(2), grounded: p.grounded,
      score: p.score, lives: p.lives, stamina: Math.round(p.stamina), combo: p.combo,
      melons: p.melons, fish: p.fish, fishAvail: this.fishAvail, catKills: p.catKills, pigeonKills: p.pigeonKills,
      powers: { kick: +p.kickT.toFixed(1), fart: +p.fartT.toFixed(1), bark: +p.barkT.toFixed(1), shake: +p.shakeT.toFixed(1), fly: +p.flyT.toFixed(1), morty: +p.mortyT.toFixed(1), pee: p.hasPee, jumpLvl: p.jumpLvl, speedLvl: p.speedLvl, sizeLvl: p.sizeLvl },
      napping: p.napping, nearDoor: !!this.nearDoor, nearPet: !!this.nearPet, treats: p.treats, shield: p.shield, sky: +p.skyT.toFixed(1), dbl: +p.dblT.toFixed(1), boss: { state: this.boss.state, x: +this.boss.x.toFixed(1), hp: this.boss.hp }, puppy: +p.puppyT.toFixed(1), fsk: p.fskT > 0, bikes: this.bikes.map((b) => (b.active ? +b.x.toFixed(1) : b.done ? 'done' : 'waiting')), chicken: !!this.chicken, morty: this.morty.state, possum: this.possum.state,
      enemiesNear: this.enemies.filter((e) => e.alive && Math.abs(e.x - p.x) < 10).map((e) => ({ t: e.type, x: +e.x.toFixed(1), y: +e.y.toFixed(1), frozen: e.frozenT > 0 })),
      itemsNear: this.items.filter((i) => !i.taken && Math.abs(i.x - p.x) < 8).length,
    });
  }
}
