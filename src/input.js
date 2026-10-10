// Keyboard + touch input. Ported from the classic build, which was tuned to work
// inside the Perplexity iframe (hidden input focus trap, listeners on canvas,
// document and window) and on phones (no virtual keyboard popping up).
// NOTE: Escape is intentionally never used — it exits the Perplexity viewer.

export const keys = {};
export const justPressed = {};
export const touch = { left: false, right: false, jump: false, attack: false, down: false };
export const touchJust = { jump: false, attack: false, down: false, left: false, right: false };
// drag-gesture state (separate from the on-screen buttons so neither clobbers the other)
export const gtouch = { left: false, right: false, jump: false, down: false };
export const gestureJust = { jump: false, attack: false, roll: 0, rollOver: false };

export const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
export const isMobile = isTouchDevice || window.matchMedia('(hover: none) and (pointer: coarse)').matches;
export const isPhone = isMobile && Math.min(screen.width, screen.height) < 600;

const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
let kbTrap = null;
let onAnyGesture = () => {};
export function setGestureHandler(fn) { onAnyGesture = fn; }

function onKeyDown(e) {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') return; // never act on Escape
  if (!keys[e.code]) justPressed[e.code] = true;
  keys[e.code] = true;
}
function onKeyUp(e) { keys[e.code] = false; }

export function grabFocus(canvas) {
  try { canvas && canvas.focus({ preventScroll: true }); } catch (e) {}
  // Only focus the keyboard trap on non-phone devices (iPad w/ keyboard, laptops).
  // On phones it would open the virtual keyboard.
  if (!isTouchDevice || window.innerWidth > 800) {
    try { kbTrap && kbTrap.focus({ preventScroll: true }); } catch (e) {}
  }
  try { window.focus(); } catch (e) {}
}

export function initInput(canvas) {
  kbTrap = document.getElementById('kb-trap');
  canvas.setAttribute('tabindex', '0');
  for (const t of [canvas, document, window]) {
    t.addEventListener('keydown', onKeyDown);
    t.addEventListener('keyup', onKeyUp);
  }
  if (kbTrap) {
    kbTrap.addEventListener('keydown', (e) => { e.preventDefault(); e.stopPropagation(); onKeyDown(e); });
    kbTrap.addEventListener('keyup', (e) => { e.preventDefault(); e.stopPropagation(); onKeyUp(e); });
  }
  const g = () => { grabFocus(canvas); onAnyGesture(); };
  ['click', 'touchstart', 'mousedown', 'pointerdown'].forEach((evt) => document.addEventListener(evt, g, true));
  window.addEventListener('focus', () => grabFocus(canvas));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) grabFocus(canvas); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  grabFocus(canvas);
  [100, 300, 600, 1000].forEach((ms) => setTimeout(() => grabFocus(canvas), ms));
  let n = 0; const iv = setInterval(() => { grabFocus(canvas); if (++n > 20) clearInterval(iv); }, 500);

  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  initTouchControls();
  initGestures();
}

function initTouchControls() {
  const container = document.getElementById('touch-controls');
  if (!container) return;
  const active = new Map();
  const btn = {};
  container.querySelectorAll('[data-action]').forEach((el) => { btn[el.dataset.action] = el; });
  const actionFrom = (el) => {
    while (el && el !== container) { if (el.dataset && el.dataset.action) return el.dataset.action; el = el.parentElement; }
    return null;
  };
  const sync = () => {
    for (const k in touch) touch[k] = false;
    for (const a of active.values()) touch[a] = true;
    for (const k in btn) btn[k].classList.toggle('pressed', !!touch[k]);
  };
  container.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onAnyGesture();
    for (const t of e.changedTouches) {
      const a = actionFrom(document.elementFromPoint(t.clientX, t.clientY));
      if (a) { active.set(t.identifier, a); touchJust[a] = true; }
    }
    sync();
  }, { passive: false });
  container.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const a = actionFrom(document.elementFromPoint(t.clientX, t.clientY));
      const prev = active.get(t.identifier);
      if (a !== prev) {
        if (a) { active.set(t.identifier, a); touchJust[a] = true; } else active.delete(t.identifier);
      }
    }
    sync();
  }, { passive: false });
  const end = (e) => { e.preventDefault(); for (const t of e.changedTouches) active.delete(t.identifier); sync(); };
  container.addEventListener('touchend', end, { passive: false });
  container.addEventListener('touchcancel', end, { passive: false });
}

export function clearJustPressed() {
  for (const k in justPressed) delete justPressed[k];
  for (const k in touchJust) touchJust[k] = false;
  gestureJust.jump = false; gestureJust.attack = false; gestureJust.roll = 0; gestureJust.rollOver = false;
}

// ── Drag / tap gestures on the play field ──
// drag left/right = run (joystick that follows your thumb), flick/drag up = jump (keep holding up to fly),
// tap = chop/kick (a second finger can tap while the first drags), triple-tap = toot,
// flick down = roll over, flick down + sideways = roll forward, drag down and hold = nap / pee.
function initGestures() {
  const ui = document.getElementById('drag-ui');
  const ring = ui && ui.querySelector('.ring'), knob = ui && ui.querySelector('.knob');
  const DEAD = 14, REACH = 72, UP = 34, DOWN = 40;
  let mover = null;
  const others = new Set();
  const playing = () => document.body.dataset.mode === 'hud';
  const ignore = (t) => t && t.closest && t.closest('button, a, .tbtn, #touch-controls, .card, #gesture-hint');
  const ripple = (x, y, cls) => {
    const r = document.createElement('span'); r.className = 'tap-ripple ' + (cls || '');
    r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r);
    setTimeout(() => r.remove(), 520);
  };
  const showUI = () => {
    if (!ui || !mover) return;
    ui.classList.add('on');
    ring.style.transform = `translate(${mover.ax}px, ${mover.ay}px)`;
    const dx = Math.max(-REACH, Math.min(REACH, mover.x - mover.ax)), dy = Math.max(-REACH, Math.min(REACH, mover.y - mover.ay));
    knob.style.transform = `translate(${mover.ax + dx}px, ${mover.ay + dy}px)`;
    ui.dataset.dir = gtouch.jump ? 'up' : gtouch.down || mover.downAt ? 'down' : (gtouch.left || gtouch.right) ? 'side' : '';
  };
  const releaseMover = () => { gtouch.left = gtouch.right = gtouch.jump = gtouch.down = false; mover = null; if (ui) ui.classList.remove('on'); };
  document.addEventListener('pointerdown', (e) => {
    if (!playing() || ignore(e.target)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    onAnyGesture();
    if (!mover) {
      const now = performance.now();
      mover = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ax: e.clientX, ay: e.clientY, x: e.clientX, y: e.clientY, t0: now, minY: e.clientY, maxDown: 0, downAt: 0, moved: 0 };
      showUI();
    } else {
      // extra finger: instant chop/kick
      others.add(e.pointerId); gestureJust.attack = true; ripple(e.clientX, e.clientY);
    }
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!mover || e.pointerId !== mover.id) return;
    if (!playing()) { releaseMover(); return; }
    const m = mover; m.x = e.clientX; m.y = e.clientY;
    m.moved = Math.max(m.moved, Math.hypot(m.x - m.sx, m.y - m.sy));
    // horizontal joystick whose anchor trails the thumb, so reversing is instant
    let dx = m.x - m.ax;
    if (Math.abs(dx) > REACH) { m.ax = m.x - Math.sign(dx) * REACH; dx = m.x - m.ax; }
    gtouch.left = dx < -DEAD; gtouch.right = dx > DEAD;
    // vertical: up = jump/fly, down = crouch (hold) / flick
    const dy = m.y - m.ay;
    if (!gtouch.jump && dy < -UP) { gtouch.jump = true; gestureJust.jump = true; m.minY = m.y; }
    if (gtouch.jump) {
      m.minY = Math.min(m.minY, m.y);
      if (m.y - m.minY > 26) { gtouch.jump = false; m.ay = m.y; } // dip back down to re-arm another jump
    }
    if (dy > DOWN) { if (!m.downAt) m.downAt = performance.now(); m.maxDown = Math.max(m.maxDown, dy); }
    else if (m.downAt && dy < DOWN * 0.5) { m.downAt = 0; gtouch.down = false; }
    if (m.downAt && performance.now() - m.downAt > 300) gtouch.down = true;
    if (Math.abs(dy) > REACH * 1.6) m.ay = m.y - Math.sign(dy) * REACH * 1.6;
    showUI();
  }, true);
  const up = (e) => {
    if (others.has(e.pointerId)) { others.delete(e.pointerId); return; }
    if (!mover || e.pointerId !== mover.id) return;
    const m = mover, dur = performance.now() - m.t0;
    if (playing()) {
      if (m.moved < 12 && dur < 320) { gestureJust.attack = true; ripple(m.x, m.y); }
      else if (m.downAt && !gtouch.down && (m.y - m.sy) > DOWN) {
        const side = m.x - m.sx;
        if (Math.abs(side) > 40) gestureJust.roll = Math.sign(side); else gestureJust.rollOver = true;
        ripple(m.x, m.y, 'down');
      }
    }
    releaseMover();
  };
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', up, true);
  window.addEventListener('blur', releaseMover);
}

// Unified action queries
export const input = {
  left: () => keys.ArrowLeft || keys.KeyA || touch.left || gtouch.left,
  right: () => keys.ArrowRight || keys.KeyD || touch.right || gtouch.right,
  up: () => keys.ArrowUp || keys.KeyW || touch.jump || gtouch.jump,
  down: () => keys.ArrowDown || keys.KeyS || touch.down || gtouch.down,
  jumpPressed: () => justPressed.ArrowUp || justPressed.KeyW || touchJust.jump || gestureJust.jump,
  attackPressed: () => justPressed.Space || justPressed.KeyX || justPressed.KeyZ || justPressed.ShiftLeft || justPressed.ShiftRight || touchJust.attack || gestureJust.attack,
  tootPressed: () => justPressed.KeyF,
  rollGesture: () => gestureJust.roll,
  rollOverGesture: () => gestureJust.rollOver,
  downPressed: () => justPressed.ArrowDown || justPressed.KeyS || touchJust.down,
  leftPressed: () => justPressed.ArrowLeft || justPressed.KeyA || touchJust.left,
  rightPressed: () => justPressed.ArrowRight || justPressed.KeyD || touchJust.right,
  confirmPressed: () => justPressed.Space || justPressed.Enter || touchJust.attack,
};
