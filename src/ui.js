import { WORLD, TREATS, TREAT_PICKS } from './world.js';
import { input, clearJustPressed, justPressed, isTouchDevice } from './input.js';
import { sfx, toggleMute, muted, setMusicLevel, getMusicLevel } from './audio.js';
import { SKILLS } from './game.js';

const $ = (id) => document.getElementById(id);

// ── leaderboard: the visit's top dogs, kept in memory only (nothing is stored in the browser) ──
let board = [];
export function loadBoard() { return board.slice(0, 5); }
function saveBoard(b) { board = b.slice(0, 5); }
export function isHighScore(score) { const b = loadBoard(); return score > 0 && (b.length < 5 || score > b[b.length - 1].score); }
function addToBoard(name, score) {
  const b = loadBoard(); const entry = { name, score, date: new Date().toISOString().slice(0, 10) };
  b.push(entry); b.sort((a, c) => c.score - a.score); saveBoard(b.slice(0, 5));
  return entry;
}

const ICON = {
  melon: '<svg viewBox="0 0 32 32"><path d="M3 12a13 13 0 0 0 26 0z" fill="#2f9a3a"/><path d="M5.5 12a10.5 10.5 0 0 0 21 0z" fill="#eaf7d0"/><path d="M7 12a9 9 0 0 0 18 0z" fill="#ff3d5a"/><g fill="#2a1414"><ellipse cx="12" cy="16" rx="1" ry="1.6"/><ellipse cx="16" cy="18" rx="1" ry="1.6"/><ellipse cx="20" cy="16" rx="1" ry="1.6"/></g></svg>',
  fish: '<svg viewBox="0 0 32 32"><path d="M4 16c5-7 15-8 21 0-6 8-16 7-21 0z" fill="#8fc7ff"/><path d="M24 16l6-5v10z" fill="#5aa0e8"/><path d="M6 17c5 4 13 4 18-1" fill="#e9f7ff"/><circle cx="19" cy="14" r="1.6" fill="#1a1210"/></svg>',
  cat: '<svg viewBox="0 0 32 32"><path d="M7 10l3-6 4 5h4l4-5 3 6v8a9 9 0 0 1-18 0z" fill="#f08a2c"/><circle cx="12.5" cy="15" r="1.8" fill="#2d8a3a"/><circle cx="19.5" cy="15" r="1.8" fill="#2d8a3a"/><path d="M14.5 19h3l-1.5 1.6z" fill="#f2a0a8"/></svg>',
  pigeon: '<svg viewBox="0 0 32 32"><ellipse cx="15" cy="19" rx="10" ry="7" fill="#8a93a6"/><circle cx="23" cy="11" r="5" fill="#5b6170"/><path d="M27 11l4 1.5-4 1z" fill="#3a3036"/><circle cx="24" cy="10" r="1.2" fill="#e86a1a"/><path d="M19 15c2 2 5 2 6-1" fill="#5a7d6a"/></svg>',
  bone: '<svg viewBox="0 0 32 32"><path d="M9 11.5a4 4 0 1 0-4.6 4.5A4 4 0 1 0 9 20.5h14a4 4 0 1 0 4.6-4.5A4 4 0 1 0 23 11.5z" fill="#ffc83a" stroke="#8a5a10" stroke-width="1.6"/></svg>',
  heart: '<svg viewBox="0 0 32 32"><path d="M16 28C5 20 2 14 2 9.5 2 5.4 5.3 2 9.3 2c2.8 0 5 1.4 6.7 3.8C17.7 3.4 19.9 2 22.7 2 26.7 2 30 5.4 30 9.5 30 14 27 20 16 28z"/></svg>',
  paw: '<svg viewBox="0 0 32 32" fill="currentColor"><ellipse cx="16" cy="21" rx="7" ry="6"/><circle cx="8" cy="13" r="3"/><circle cx="13" cy="8" r="3"/><circle cx="19" cy="8" r="3"/><circle cx="24" cy="13" r="3"/></svg>',
  burger: '<svg viewBox="0 0 32 32"><path d="M4 14a12 9 0 0 1 24 0z" fill="#d88a2e"/><rect x="3" y="14" width="26" height="3" rx="1.5" fill="#5fbf3a"/><rect x="4" y="17" width="24" height="4" rx="2" fill="#5a2f1c"/><path d="M4 22h24a3 3 0 0 1-3 4H7a3 3 0 0 1-3-4z" fill="#d88a2e"/></svg>',
  fries: '<svg viewBox="0 0 32 32"><g fill="#ffc21a"><rect x="9" y="4" width="3" height="14" rx="1"/><rect x="13" y="2" width="3" height="16" rx="1"/><rect x="17" y="3" width="3" height="15" rx="1"/><rect x="21" y="5" width="3" height="13" rx="1"/></g><path d="M7 13h18l-2 16H9z" fill="#d8342a"/><path d="M12 19h8l-1 5h-6z" fill="#fff3dc"/></svg>',
  shake: '<svg viewBox="0 0 32 32"><path d="M9 11h14l-2 18H11z" fill="#ff9fc0"/><path d="M8 9h16v3H8z" fill="#fff"/><circle cx="16" cy="7" r="4" fill="#fff"/><circle cx="16" cy="3.5" r="2" fill="#e0352b"/><rect x="18" y="0" width="2" height="9" transform="rotate(20 19 4)" fill="#4fc3f7"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5.5" y="4.5" width="4.6" height="15" rx="1.5"/><rect x="13.9" y="4.5" width="4.6" height="15" rx="1.5"/></svg>',
};

// A slider for the pause panel: drag or tap along it, or ← → on the keys. A <div role="slider">, never an <input>, so
// no phone ever offers its keyboard for it. steps: how many positions; get/set the value, 0..1.
function slider(el, { steps, get, set, render }) {
  const pick = (x) => {
    const r = el.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (x - r.left) / r.width));
    set(Math.round(v * (steps - 1)) / (steps - 1));
    render();
  };
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (err) {} pick(e.clientX); });
  el.addEventListener('pointermove', (e) => { if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) pick(e.clientX); });
  return { step: (d) => { set(Math.max(0, Math.min(steps - 1, Math.round(get() * (steps - 1)) + d)) / (steps - 1)); render(); } }; // on the grid, so 60% is always exactly the game's own level
}

const POWERS = [
  { k: 'kickT', label: 'KICK', max: 8, col: '#ff8a3d' },
  { k: 'fartT', label: 'FART NUKE', max: 4, col: '#9bd04a' },
  { k: 'barkT', label: 'BARK', max: 15, col: '#ffd34d' },
  { k: 'shakeT', label: 'SHAKE', max: 10, col: '#ff9fc0' },
  { k: 'flyT', label: 'FLIGHT', max: 30, col: '#8fe3ff' },
  { k: 'mortyT', label: 'MORTY', max: 5, col: '#ffe27a' },
  { k: 'skyT', label: 'SKY CHOP', max: 20, col: '#5fb8ff' },
  { k: 'dblT', label: 'DOUBLE JUMP', max: 25, col: '#ff9a3d' },
  { k: 'zoomT', label: 'ZOOMIES', max: 12, col: '#ff5a5a' },
  { k: 'magT', label: 'MAGNET', max: 20, col: '#e8b018' },
  { k: 'puppyT', label: 'PUPPY RUN', max: 10, col: '#ff8fc0' },
];

export class UI {
  constructor() {
    this.cache = {};
    this.mode = 'loading';
    this.endReadyT = 0;
    this.initials = { letters: [0, 0, 0], cursor: 0, score: 0 };
    this.gestRuns = 0; // runs the touch tips have shown in this visit
    this.buildStatic();
  }

  buildStatic() {
    $('ic-melon').innerHTML = ICON.melon; $('ic-fish').innerHTML = ICON.fish; $('ic-cat').innerHTML = ICON.cat; $('ic-pigeon').innerHTML = ICON.pigeon;
    $('track-shop').innerHTML = ICON.burger; $('track-jess').innerHTML = ICON.heart; $('track-dog').innerHTML = ICON.paw;
    $('track-shop').style.left = (WORLD.DOOR_X / WORLD.L * 100) + '%';
    $('track-pet').innerHTML = ICON.bone; $('track-pet').style.left = (WORLD.PET_DOOR / WORLD.L * 100) + '%';
    $('exit-pet').addEventListener('click', (e) => { e.stopPropagation(); if (this.game?.state === 'petshop') this.game.exitPet(); });
    $('track-morty').style.left = (WORLD.MORTY_X / WORLD.L * 100) + '%';
    $('lives').innerHTML = [0, 1, 2].map((i) => `<span class="life" data-i="${i}">${ICON.heart}</span>`).join('');
    document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICON[el.dataset.icon] || ''; });
    const mb = $('mute-btn');
    mb.innerHTML = ICON.sound;
    mb.addEventListener('click', (e) => { e.stopPropagation(); const m = toggleMute(); mb.innerHTML = m ? ICON.mute : ICON.sound; });
    this.buildPause();
    this.renderBoard();
    // phone "How to play" sheet
    const closeSheet = (e) => { if (e) e.stopPropagation(); document.body.classList.remove('guide-open'); };
    $('guide-btn').addEventListener('click', (e) => { e.stopPropagation(); sfx.ui(); document.body.classList.add('guide-open'); });
    $('guide-close').addEventListener('click', closeSheet);
    $('sheet-bg').addEventListener('click', closeSheet);
    // initials: skip button, or tap anywhere outside the card
    $('ini-skip').addEventListener('click', (e) => { e.stopPropagation(); this.skipInitials(); });
    $('initials').addEventListener('click', (e) => { if (e.target === $('initials')) this.skipInitials(); });
  }

  show(mode) {
    const prev = this.mode;
    this.mode = mode;
    document.body.dataset.mode = mode;
    document.body.classList.remove('guide-open');
    if (mode === 'hud' && prev !== 'hud' && prev !== 'shop' && prev !== 'petshop') {
      const b = document.body;
      // gesture cheat-sheet for the first couple of runs of a visit on touch devices
      if (b.classList.contains('touch') && this.gestRuns < 2) {
        this.gestRuns++;
        b.classList.remove('gest-on'); void b.offsetWidth; b.classList.add('gest-on');
        clearTimeout(this._gT); this._gT = setTimeout(() => b.classList.remove('gest-on'), 9000);
      }
    }
  }
  // ── pause panel: Resume, difficulty, music volume ──
  buildPause() {
    $('pause-btn').innerHTML = ICON.pause;
    $('pause-btn').addEventListener('click', (e) => { e.stopPropagation(); this.game?.setPaused(true); });
    $('pz-resume').addEventListener('click', (e) => { e.stopPropagation(); this.game?.setPaused(false); });
    this.pz = { sel: 0 };
    const last = SKILLS.length - 1, render = () => this.renderPause();
    this.sliders = [null,
      slider($('pz-diff'), { steps: SKILLS.length, get: () => (this.game ? this.game.skill / last : 0.5), set: (v) => this.game?.setSkill(v * last), render }),
      slider($('pz-music'), { steps: 21, get: getMusicLevel, set: setMusicLevel, render }),
    ];
    // touching a row makes it the one the keys work on
    document.querySelectorAll('#pause .pz-row').forEach((r) => r.addEventListener('pointerdown', () => { if (this.pz.sel !== +r.dataset.row) { this.pz.sel = +r.dataset.row; this.renderPause(); } }));
  }
  showPause(on) {
    document.body.classList.toggle('paused', on);
    if (on) { this.pz.sel = 0; this.renderPause(); }
  }
  renderPause() {
    const g = this.game; if (!g) return;
    const sk = SKILLS[g.skill], dv = g.skill / (SKILLS.length - 1), mv = getMusicLevel(), pct = Math.round(mv * 100), mt = mv <= 0 ? 'Off' : pct + '%';
    const put = (id, v, now, text) => { const el = $(id); el.querySelector('.pz-fill').style.transform = `scaleX(${v})`; el.querySelector('.pz-knob').style.left = (v * 100) + '%'; el.setAttribute('aria-valuenow', now); el.setAttribute('aria-valuetext', text); };
    put('pz-diff', dv, g.skill, sk.name); $('pz-diff-val').textContent = sk.name; $('pz-about').textContent = sk.about;
    document.querySelectorAll('#pause .pz-marks span').forEach((s, i) => s.classList.toggle('on', i === g.skill));
    put('pz-music', mv, pct, mt); $('pz-music-val').textContent = mt;
    document.querySelectorAll('#pause .pz-row').forEach((r) => r.classList.toggle('sel', +r.dataset.row === this.pz.sel));
  }
  // keys while paused: P, Space or Enter resume; ↑ ↓ choose a row; ← → change it
  tickPause(g) {
    const J = justPressed;
    if (J.KeyP || J.Space || J.Enter) { g.setPaused(false); return; }
    const v = (J.ArrowDown || J.KeyS ? 1 : 0) - (J.ArrowUp || J.KeyW ? 1 : 0);
    if (v) { this.pz.sel = (this.pz.sel + v + 3) % 3; sfx.ui(); this.renderPause(); }
    const d = (J.ArrowRight || J.KeyD ? 1 : 0) - (J.ArrowLeft || J.KeyA ? 1 : 0);
    if (d && this.sliders[this.pz.sel]) { this.sliders[this.pz.sel].step(d); sfx.ui(); }
    clearJustPressed();
  }

  skipInitials() {
    if (this.game?.state !== 'initials') return;
    sfx.ui();
    this.game.state = 'menu'; this.game.reset();
    this.show('menu');
    clearJustPressed();
  }

  renderBoard(highlight) {
    const b = loadBoard();
    const rows = [];
    for (let i = 0; i < 5; i++) {
      const e = b[i];
      rows.push(`<li class="${highlight && e && e.name === highlight.name && e.score === highlight.score && e.date === highlight.date ? 'hl' : ''}"><span class="rk">${i + 1}</span><span class="nm">${e ? e.name : '---'}</span><span class="sc">${e ? e.score.toLocaleString() : '0'}</span></li>`);
    }
    $('board').innerHTML = rows.join('');
  }

  // ── HUD ──
  set(id, v, prop = 'textContent') { if (this.cache[id + prop] !== v) { this.cache[id + prop] = v; $(id)[prop] = v; } }
  updateHUD(g) {
    const p = g.p;
    this.set('score', p.score.toLocaleString());
    const combo = p.combo > 1 ? `×${p.combo}<span> COMBO</span>` : '';
    this.set('combo', combo, 'innerHTML');
    if (this.cache.comboOn !== p.combo > 1) { this.cache.comboOn = p.combo > 1; $('combo').classList.toggle('on', p.combo > 1); $('score').parentElement.classList.toggle('combo', p.combo > 1); }
    // hearts: full, half (a hit on Easy costs half a heart) or lost
    for (let i = 0; i < 3; i++) { const el = document.querySelector(`.life[data-i="${i}"]`); const v = p.lives - i, st = v >= 1 ? 'full' : v > 0 ? 'half' : 'lost'; if (el.dataset.st !== st) { el.dataset.st = st; el.classList.toggle('lost', st === 'lost'); el.classList.toggle('half', st === 'half'); } }
    const cp = g.state === 'playing'; if (this.cache.canPause !== cp) { this.cache.canPause = cp; document.body.classList.toggle('can-pause', cp); }
    const st = Math.round(p.stamina);
    if (this.cache.st !== st) {
      this.cache.st = st;
      const f = $('stamina-fill'); f.style.transform = `scaleX(${st / 100})`;
      f.style.background = st > 60 ? 'linear-gradient(90deg,#4cd964,#9df07a)' : st > 25 ? 'linear-gradient(90deg,#ffb300,#ffd860)' : 'linear-gradient(90deg,#ff3b30,#ff7a6e)';
    }
    this.set('cnt-melon', `${p.melons % 5}/5`); this.set('cnt-fish', String(g.fishAvail));
    this.set('cnt-cat', `${p.catKills % 5}/5`); this.set('cnt-pigeon', `${p.pigeonKills % 5}/5`);
    // power chips
    const chips = [];
    for (const pw of POWERS) if (p[pw.k] > 0) chips.push(`<div class="chip" style="--c:${pw.col};--f:${(p[pw.k] / pw.max).toFixed(3)}"><b>${pw.label}</b><i>${Math.ceil(p[pw.k])}s</i></div>`);
    if (p.shield) chips.push('<div class="chip perm" style="--c:#e8b018;--f:1"><b>SHIELD</b><i>1 hit</i></div>');
    if (p.hasPee) chips.push('<div class="chip perm" style="--c:#f6e04a;--f:1"><b>PEE</b><i>↓</i></div>');
    if (p.jumpLvl) chips.push(`<div class="chip lvl" style="--c:#ff7b8f;--f:1"><b>JUMP</b><i>+${p.jumpLvl}</i></div>`);
    if (p.speedLvl) chips.push(`<div class="chip lvl" style="--c:#7ee3ff;--f:1"><b>SPEED</b><i>+${p.speedLvl}</i></div>`);
    if (p.sizeLvl) chips.push(`<div class="chip lvl" style="--c:#c6ff7e;--f:1"><b>SIZE</b><i>+${p.sizeLvl}</i></div>`);
    const ch = chips.join('');
    this.set('powers', ch, 'innerHTML');
    // progress
    const prog = Math.min(1, p.x / WORLD.JESS_X);
    $('track-dog').style.left = (prog * 100) + '%';
    $('track-fill').style.transform = `scaleX(${prog})`;
    // prompts
    let prompt = '';
    if (g.state === 'playing') {
      if (g.nearDoor) prompt = isTouchDevice ? "Tap JUMP to enter Iggy's Burgers" : "Press ↑ to enter Iggy's Burgers";
      else if (g.nearPet) prompt = p.treats.length < TREAT_PICKS ? (isTouchDevice ? 'Tap JUMP to enter Fideaux Pets — free treats!' : 'Press ↑ to enter Fideaux Pets — free treats!') : (isTouchDevice ? 'Tap JUMP to visit Fideaux Pets' : 'Press ↑ to visit Fideaux Pets');
      else if (p.napping) prompt = 'Napping… ' + Math.round((p.napT / 2) * 100) + '%';
      else if (p.grounded && p.stamina < 100 && g.beds.some((b) => Math.abs(p.x - b.x) < 0.65 && Math.abs(p.y - b.y) < 0.1)) prompt = 'Hold ↓ to nap on the dog bed';
    }
    this.set('prompt', prompt);
    if (this.cache.promptOn !== !!prompt) { this.cache.promptOn = !!prompt; $('prompt').classList.toggle('on', !!prompt); document.body.classList.toggle('prompt-on', !!prompt); }
  }
  bossBar(frac, hit = false) {
    const b = $('bossbar'); if (!b) return;
    b.classList.toggle('on', frac !== null && frac !== undefined);
    document.body.classList.toggle('boss-on', frac !== null && frac !== undefined); // on phones and tablets the bar takes the progress bar's place
    if (frac !== null && frac !== undefined) { const v = Math.max(0, frac).toFixed(3); if (this.cache.boss !== v) { this.cache.boss = v; $('boss-fill').style.transform = `scaleX(${v})`; } b.classList.toggle('hit', hit); }
  }
  flashDamage() { const d = $('damage'); d.classList.remove('go'); void d.offsetWidth; d.classList.add('go'); }

  // ── Fideaux Pets counter ──
  openPet(g) {
    this.show('petshop'); this.renderPet(g);
    this.petMsg(g.p.treats.length >= TREAT_PICKS ? "Back again, Peabody? You've had your free treats — see you next run!" : `Hi Peabody! Pick any ${TREAT_PICKS} treats — they're on the house.`);
  }
  petMsg(m) { const el = $('ps-msg'); el.textContent = m; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  renderPet(g, justTook = -1) {
    const left = TREAT_PICKS - g.p.treats.length;
    $('ps-left').textContent = left;
    $('ps-left-wrap').classList.toggle('none', left <= 0);
    $('ps-counter').innerHTML = TREATS.map((t, i) => {
      const took = g.p.treats.includes(t.id);
      return `<button class="treat ${i === g.petSel ? 'sel' : ''} ${took ? 'taken' : ''} ${i === justTook ? 'just' : ''}" data-i="${i}" style="--c:${t.col}">
        <span class="ti"><img src="${$('ti-' + t.id).src}" alt="${t.name}"></span>
        <span class="tag"><b>${t.name}</b><em>${t.power}</em><small>${t.desc}</small></span>
        <span class="ribbon">${took ? 'YOURS' : 'FREE'}</span>
      </button>`;
    }).join('');
    $('ps-counter').querySelectorAll('.treat').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); const i = +el.dataset.i; g.petSel = i; this.renderPet(g); g.takeTreat(i); }));
  }

  // ── shop ──
  openShop(g) { this.show('shop'); this.renderShop(g); this.shopMsg("Welcome to Iggy's! Pay with minnows."); }
  closeShop() { this.show('hud'); }
  shopMsg(m) { $('shop-msg').textContent = m; }
  renderShop(g) {
    $('shop-wallet').textContent = g.fishAvail;
    const items = g.shopItems();
    $('shop-items').innerHTML = items.map((it, i) => `
      <button class="shop-item ${i === g.shopSel ? 'sel' : ''} ${(it.id === 'burger' && g.p.hasPee) ? 'owned' : ''} ${g.fishAvail < it.cost ? 'poor' : ''}" data-i="${i}">
        <span class="si-ic">${ICON[it.id === 'burger' ? 'burger' : it.id]}</span>
        <span class="si-tx"><b>${it.name}</b><small>${it.desc}</small></span>
        <span class="si-cost">${it.cost ? `${it.cost} <em>${ICON.fish}</em>` : 'FREE'}</span>
      </button>`).join('');
    $('shop-items').querySelectorAll('.shop-item').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); g.shopSel = +el.dataset.i; g.buy(g.shopSel); }));
  }

  // ── end screens ──
  showEnd(won, s) {
    this.endReadyT = 1.2;
    this.lastScore = s.score;
    $('end-title').textContent = won ? 'PEABODY FOUND JESSICA!' : 'GAME OVER';
    $('end-sub').textContent = won ? 'Home safe in her arms — the whole plaza is cheering.' : 'Those cats and pigeons won this round.';
    $('end').classList.toggle('won', won);
    const mm = Math.floor(s.time / 60), ss = Math.floor(s.time % 60).toString().padStart(2, '0');
    $('end-stats').innerHTML = `
      <div><b>${s.score.toLocaleString()}</b><span>Score</span></div>
      <div><b>${s.melons}</b><span>Watermelons</span></div>
      <div><b>${s.fish}</b><span>Minnows</span></div>
      <div><b>${s.cats}</b><span>Cats</span></div>
      <div><b>${s.pigeons}</b><span>Pigeons</span></div>
      <div><b>${mm}:${ss}</b><span>Time</span></div>`;
    const hs = isHighScore(s.score);
    $('end-hs').style.display = hs ? '' : 'none';
    $('end-btn').textContent = hs ? 'ENTER YOUR INITIALS' : 'PLAY AGAIN';
    this.show(won ? 'victory' : 'gameover');
  }
  endAction(g) {
    if (this.endReadyT > 0) return;
    if (isHighScore(this.lastScore)) this.openInitials(g);
    else { sfx.uiConfirm(); g.startGame(); }
  }

  // ── initials ──
  openInitials(g) {
    this.initials = { letters: [0, 0, 0], cursor: 0, score: this.lastScore };
    g.state = 'initials'; this.show('initials');
    $('ini-score').textContent = this.lastScore.toLocaleString();
    this.renderInitials();
    clearJustPressed();
  }
  renderInitials() {
    const I = this.initials;
    const slots = I.letters.map((l, i) => `
      <div class="slot ${I.cursor === i ? 'cur' : ''}" data-i="${i}">
        <button class="arr up" data-i="${i}" data-d="-1" aria-label="previous letter">▲</button>
        <span>${String.fromCharCode(65 + l)}</span>
        <button class="arr dn" data-i="${i}" data-d="1" aria-label="next letter">▼</button>
      </div>`).join('');
    $('ini-slots').innerHTML = slots + `<button class="ini-done ${I.cursor === 3 ? 'cur' : ''}" id="ini-done">DONE</button>`;
    $('ini-slots').querySelectorAll('.arr').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation(); const i = +b.dataset.i; I.cursor = i; I.letters[i] = (I.letters[i] + (+b.dataset.d) + 26) % 26; sfx.ui(); this.renderInitials();
    }));
    $('ini-slots').querySelectorAll('.slot').forEach((s) => s.addEventListener('click', () => { I.cursor = +s.dataset.i; this.renderInitials(); }));
    $('ini-done').addEventListener('click', (e) => { e.stopPropagation(); this.confirmInitials(); });
  }
  confirmInitials() {
    const I = this.initials;
    const name = I.letters.map((l) => String.fromCharCode(65 + l)).join('');
    const entry = addToBoard(name, I.score);
    sfx.uiConfirm();
    this.renderBoard(entry);
    this.game.state = 'menu'; this.game.reset();
    this.show('menu');
    clearJustPressed();
  }
  updateInitials() {
    const I = this.initials;
    if (input.leftPressed()) { I.cursor = Math.max(0, I.cursor - 1); sfx.ui(); this.renderInitials(); }
    if (input.rightPressed()) { I.cursor = Math.min(3, I.cursor + 1); sfx.ui(); this.renderInitials(); }
    if (I.cursor < 3) {
      if (input.jumpPressed()) { I.letters[I.cursor] = (I.letters[I.cursor] + 25) % 26; sfx.ui(); this.renderInitials(); }
      if (input.downPressed()) { I.letters[I.cursor] = (I.letters[I.cursor] + 1) % 26; sfx.ui(); this.renderInitials(); }
    }
    if (justPressed.Space || justPressed.Enter) {
      if (I.cursor < 3) { I.cursor++; sfx.ui(); this.renderInitials(); } else this.confirmInitials();
    }
  }

  // per-frame input routing for non-gameplay screens
  tick(g, dt) {
    this.game = g;
    if (g.paused) { this.tickPause(g); return; }
    if (g.state === 'playing' && justPressed.KeyP) { g.setPaused(true); return; }
    if (this.endReadyT > 0) { this.endReadyT -= dt; $('end-btn').classList.toggle('ready', this.endReadyT <= 0); }
    if (g.state === 'menu') {
      if (justPressed.Space || justPressed.Enter) { sfx.uiConfirm(); g.startGame(); }
    } else if (g.state === 'gameover' || g.state === 'victory') {
      if (justPressed.Space || justPressed.Enter) this.endAction(g);
    } else if (g.state === 'initials') this.updateInitials();
    else if (g.state === 'playing' || g.state === 'shop' || g.state === 'win') this.updateHUD(g);
  }
}
