// Music (the custom Suno track) + richer procedural SFX through a small mixer
let ac = null, master = null, sfxBus = null, verb = null;
export let muted = false;

// Resolve the music next to index.html even when served from a folder URL without a
// trailing slash (e.g. cyrusrex.com/peabodyHD, where a bare relative path would hit the site root).
const MUSIC_BASE = (() => { const p = location.pathname; return /\/$|\.[a-z0-9]+$/i.test(p) ? '' : p.split('/').pop() + '/'; })();
export const bgMusic = new Audio(MUSIC_BASE + 'peabody-crusade.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.38;
bgMusic.preload = 'auto';
let musicUnlocked = false;
let musicWanted = false;

// Music volume (the pause panel's slider). The level is the slider's position, 0..1; 0.6 gives the game's own mix,
// volume 0.38, as before; 1 is the track at full volume; the curve between follows loudness rather than amplitude.
// While paused the music plays on at a third of that.
const MUSIC_MIX = 0.38, MUSIC_DEFAULT = 0.6, PAUSE_DUCK = 0.35;
let musicLevel = MUSIC_DEFAULT, musicDucked = false, unlocking = false;
export const musicGainFor = (level) => (level <= 0 ? 0 : Math.min(1, MUSIC_MIX * Math.pow(level / MUSIC_DEFAULT, Math.log(1 / MUSIC_MIX) / Math.log(1 / MUSIC_DEFAULT))));
// iPhone and iPad ignore an <audio> element's volume (it always reads 1). There the music is played through Web Audio,
// where a gain node sets its level; everywhere else the element's own volume does, as it always has.
const APPLE_TOUCH = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const VOLUME_IGNORED = APPLE_TOUCH || (() => { try { const a = document.createElement('audio'); a.volume = 0.5; return Math.abs(a.volume - 0.5) > 0.01; } catch (e) { return false; } })();
let musicGain = null;
function applyMusicVolume() {
  const v = muted || unlocking ? 0 : musicGainFor(musicLevel) * (musicDucked ? PAUSE_DUCK : 1);
  if (musicGain) { const t = ac.currentTime; musicGain.gain.cancelScheduledValues(t); musicGain.gain.setTargetAtTime(v, t, unlocking ? 0.001 : 0.05); }
  else bgMusic.volume = v;
}
function routeMusic() {
  if (musicGain || !ac || !VOLUME_IGNORED) return;
  try {
    const src = ac.createMediaElementSource(bgMusic);
    const g = ac.createGain(); g.gain.value = 0;
    src.connect(g).connect(ac.destination);
    musicGain = g; bgMusic.volume = 1;
    // keep the music playing in Silent Mode, as the plain <audio> element did
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  } catch (e) { musicGain = null; }
  applyMusicVolume();
}
const wake = () => { if (musicGain && ac && ac.state !== 'running' && ac.state !== 'closed' && !document.hidden) ac.resume().catch(() => {}); };
export function setMusicLevel(level) { musicLevel = Math.max(0, Math.min(1, +level || 0)); applyMusicVolume(); }
export function getMusicLevel() { return musicLevel; }
export function setMusicPaused(on) { musicDucked = !!on; applyMusicVolume(); }
export function musicState() { return { routed: !!musicGain, level: musicLevel, ducked: musicDucked, gain: musicGain ? musicGain.gain.value : null, volume: bgMusic.volume, target: muted ? 0 : musicGainFor(musicLevel) * (musicDucked ? PAUSE_DUCK : 1), context: ac ? ac.state : null, paused: bgMusic.paused }; }

export function initAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.9;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp).connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      // tiny room reverb for polish
      verb = ac.createConvolver();
      const len = ac.sampleRate * 0.6, buf = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      verb.buffer = buf;
      const vg = ac.createGain(); vg.gain.value = 0.18;
      verb.connect(vg).connect(master);
    } catch (e) { ac = null; }
  }
  if (ac && ac.state !== 'running' && ac.state !== 'closed') ac.resume();
  routeMusic();
  loadBark();
  unlockMusic();
}

function unlockMusic() {
  if (musicUnlocked) return;
  musicUnlocked = true;
  unlocking = true; applyMusicVolume(); // silent while it unlocks
  const p = bgMusic.play();
  if (p && p.then) {
    p.then(() => { if (!musicWanted) { bgMusic.pause(); bgMusic.currentTime = 0; } unlocking = false; applyMusicVolume(); })
     .catch(() => { unlocking = false; applyMusicVolume(); musicUnlocked = false; });
  } else { unlocking = false; applyMusicVolume(); }
}

export function setMusic(on) {
  musicWanted = on;
  if (on) { if (bgMusic.paused) bgMusic.play().catch(() => {}); }
  else if (!bgMusic.paused) bgMusic.pause();
}
export function restartMusic() { try { bgMusic.currentTime = 0; } catch (e) {} setMusic(true); }
export function setMusicRate(r) { try { bgMusic.playbackRate = r; } catch (e) {} }
export function toggleMute() {
  muted = !muted;
  applyMusicVolume();
  if (master) master.gain.value = muted ? 0 : 0.9;
  return muted;
}
// Leaving the page (tab switch, app background, navigation) stops the music; it comes back when you return.
// NOTE: we deliberately do NOT pause on window 'blur' — inside the Perplexity frame focus hops around
// (on-screen buttons, the keyboard trap, parent UI) and that used to cut the music out mid-run.
// (Played through Web Audio on iPhone/iPad, its context is suspended with the page too, and woken when it comes back.)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { bgMusic.pause(); if (musicGain) ac.suspend().catch(() => {}); } else { wake(); if (musicWanted) bgMusic.play().catch(() => {}); }
});
window.addEventListener('pagehide', () => { bgMusic.pause(); if (musicGain) ac.suspend().catch(() => {}); });
window.addEventListener('pageshow', () => { wake(); if (musicWanted && !document.hidden) bgMusic.play().catch(() => {}); });
// Watchdog: if the browser stalls or drops the stream (network hiccup, audio-session interruption on
// iOS, another tab grabbing audio), quietly resume from where it was instead of staying silent.
let lastT = 0, stuck = 0;
setInterval(() => {
  if (!musicWanted || document.hidden || !musicUnlocked) { stuck = 0; return; }
  wake();
  if (bgMusic.paused || bgMusic.ended) { bgMusic.play().catch(() => {}); return; }
  if (bgMusic.currentTime === lastT && bgMusic.readyState < 3) { if (++stuck > 3) { stuck = 0; try { const t = bgMusic.currentTime; bgMusic.load(); bgMusic.currentTime = t; } catch (e) {} bgMusic.play().catch(() => {}); } }
  else stuck = 0;
  lastT = bgMusic.currentTime;
}, 1000);
bgMusic.addEventListener('ended', () => { if (musicWanted) { bgMusic.currentTime = 0; bgMusic.play().catch(() => {}); } });
// any tap/key also nudges music back on if something paused it
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => { wake(); if (musicWanted && bgMusic.paused && !document.hidden) bgMusic.play().catch(() => {}); }, { passive: true, capture: true });

// Peabody's real bark (recorded by his owner), inlined as base64 by build.mjs
const BARK_SRC = '__BARK__';
let barkBuf = null, barkLoading = false;
function loadBark() {
  if (!ac || barkBuf || barkLoading || BARK_SRC.startsWith('__')) return;
  barkLoading = true;
  try {
    const bin = atob(BARK_SRC.split(',')[1]); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const done = (b) => { barkBuf = b; };
    const pr = ac.decodeAudioData(u8.buffer, done, () => { barkLoading = false; });
    if (pr && pr.then) pr.then(done).catch(() => { barkLoading = false; });
  } catch (e) { barkLoading = false; }
}
function playBark(rate = 1, vol = 0.9, delay = 0) {
  if (!ac || muted) return false;
  if (!barkBuf) { loadBark(); return false; }
  const s = ac.createBufferSource(); s.buffer = barkBuf; s.playbackRate.value = rate;
  const g = ac.createGain(); g.gain.value = vol;
  s.connect(g); g.connect(sfxBus); g.connect(verb);
  s.start(ac.currentTime + delay);
  return true;
}

function tone(freq, dur, type = 'sine', vol = 0.15, opts = {}) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + (opts.delay || 0);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.012, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = o;
  if (opts.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; o.connect(f); node = f; }
  node.connect(g); g.connect(sfxBus); if (opts.verb !== false) g.connect(verb);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur, vol = 0.2, opts = {}) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + (opts.delay || 0);
  const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = opts.type || 'bandpass'; f.frequency.value = opts.freq || 1200; f.Q.value = opts.q || 1;
  if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t0 + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g); g.connect(sfxBus); g.connect(verb);
  s.start(t0);
}

export const sfx = {
  jump() { tone(330, 0.18, 'triangle', 0.12, { to: 720 }); tone(660, 0.1, 'sine', 0.05, { delay: 0.04, to: 990 }); },
  land() { noise(0.07, 0.08, { type: 'lowpass', freq: 400 }); },
  collectMelon(c = 0) { const b = 660 * Math.pow(2, Math.min(c, 12) / 12); tone(b, 0.09, 'sine', 0.13); tone(b * 1.5, 0.14, 'sine', 0.1, { delay: 0.06 }); },
  collectFish(c = 0) { const b = 880 * Math.pow(2, Math.min(c, 12) / 12); tone(b, 0.08, 'triangle', 0.1); tone(b * 1.26, 0.12, 'sine', 0.09, { delay: 0.05 }); },
  chop() { noise(0.12, 0.22, { freq: 2400, sweep: 600, q: 0.8 }); tone(180, 0.08, 'square', 0.06, { to: 90, lp: 900 }); },
  hit() { tone(220, 0.25, 'sawtooth', 0.12, { to: 70, lp: 1200 }); noise(0.15, 0.12, { type: 'lowpass', freq: 600 }); },
  whack() { tone(140, 0.12, 'square', 0.14, { to: 60, lp: 1400 }); noise(0.1, 0.25, { freq: 1800, q: 0.6 }); tone(880, 0.06, 'sine', 0.06, { delay: 0.03 }); },
  meow() { tone(700, 0.25, 'sawtooth', 0.05, { to: 420, lp: 1800 }); },
  coo() { tone(320, 0.18, 'sine', 0.06, { to: 260 }); },
  gameOver() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'triangle', 0.12, { delay: i * 0.22 })); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, { delay: i * 0.12 })); },
  powerUp() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.06, { delay: i * 0.06, lp: 3000 })); },
  kickMode() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'sawtooth', 0.06, { delay: i * 0.05, lp: 2400 })); },
  chicken() { [700, 900, 700, 1000].forEach((f, i) => tone(f, 0.06, 'square', 0.07, { delay: i * 0.07, lp: 2500 })); },
  fart() { tone(90, 0.5, 'sawtooth', 0.18, { to: 45, lp: 400 }); noise(0.5, 0.15, { type: 'lowpass', freq: 300 }); },
  nap() { tone(392, 0.4, 'sine', 0.06); tone(330, 0.5, 'sine', 0.05, { delay: 0.35 }); },
  bark() { if (playBark(0.94 + Math.random() * 0.12, 0.95)) return; tone(420, 0.09, 'sawtooth', 0.14, { to: 260, lp: 1500 }); tone(380, 0.12, 'sawtooth', 0.12, { delay: 0.11, to: 220, lp: 1500 }); },
  pee() { noise(0.6, 0.06, { freq: 3000, q: 2 }); },
  shop() { [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'sine', 0.1, { delay: i * 0.06 })); },
  deny() { tone(150, 0.2, 'square', 0.08, { lp: 700 }); },
  ui() { tone(600, 0.05, 'triangle', 0.07, { verb: false }); },
  uiConfirm() { tone(700, 0.06, 'triangle', 0.08); tone(1050, 0.09, 'triangle', 0.08, { delay: 0.05 }); },
  freeze() { [1800, 2400, 3000].forEach((f, i) => tone(f, 0.12, 'sine', 0.04, { delay: i * 0.04 })); },
  flight() { [440, 554, 659, 880, 1109].forEach((f, i) => tone(f, 0.2, 'sine', 0.07, { delay: i * 0.05 })); },
  morty() { [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, { delay: i * 0.09 })); },
  sniff() { noise(0.08, 0.06, { freq: 4000, q: 3 }); noise(0.08, 0.06, { freq: 4000, q: 3, delay: 0.12 }); },
  bell() { for (const d of [0, 0.22]) { tone(2350, 0.5, 'sine', 0.07, { delay: d }); tone(3520, 0.35, 'sine', 0.03, { delay: d }); } },
  mortyBark() { playBark(0.8, 0.8); },
  yelp() { if (playBark(1.28, 0.9) && playBark(1.4, 0.85, 0.2)) return; tone(900, 0.07, 'sawtooth', 0.12, { to: 1300, lp: 2600 }); tone(1000, 0.09, 'sawtooth', 0.12, { delay: 0.12, to: 1450, lp: 2600 }); tone(950, 0.1, 'sawtooth', 0.1, { delay: 0.26, to: 1350, lp: 2600 }); },
  bigFart() { tone(70, 0.9, 'sawtooth', 0.22, { to: 38, lp: 360 }); tone(110, 0.35, 'square', 0.08, { delay: 0.1, to: 60, lp: 300 }); noise(0.9, 0.18, { type: 'lowpass', freq: 260 }); },
  treat() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, { delay: i * 0.05 })); noise(0.06, 0.05, { freq: 3000, q: 1, delay: 0.02 }); },
  trash() { noise(0.35, 0.15, { freq: 900, q: 0.5 }); tone(200, 0.2, 'square', 0.05, { to: 120, lp: 800 }); },
  // the possum: a short, soft hiss with a few clicks (all bluff), then happy chomping and a little squeak
  possumHiss() { noise(0.32, 0.05, { freq: 4300, q: 1.1 }); noise(0.22, 0.022, { freq: 7200, q: 2.2, delay: 0.04 }); for (const d of [0.38, 0.45, 0.53]) noise(0.014, 0.08, { freq: 2600, q: 5, delay: d }); },
  toss() { tone(520, 0.1, 'triangle', 0.06, { to: 880 }); },
  possumNom() { for (const d of [0, 0.17, 0.34]) { noise(0.035, 0.07, { type: 'lowpass', freq: 1400, delay: d }); tone(260, 0.05, 'triangle', 0.035, { delay: d, to: 190 }); } tone(1500, 0.09, 'sine', 0.04, { delay: 0.5, to: 2150 }); tone(1950, 0.08, 'sine', 0.03, { delay: 0.63, to: 2600 }); },
};
