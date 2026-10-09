import * as THREE from 'three';

// Real Healdsburg storefronts (checked against current photos, Oct 2026).
// wall/trim/awn = facade palette; style = facade construction; sign = board look.
//   style: plain | brick | board | stucco | stone | glass | modern | quonset | craftsman
//   sign.font: serif | script | sans | slab | round ; sign.shape: rect | oval | bone | badge | arch | wall
export const SHOP_PROFILE = {
  'Costeaux Bakery':    { wall: '#efe1c2', trim: '#2b1d14', awn: '#b8322a', stripe: '#fff6ea', style: 'plain', floors: 2, sign: { bg: '#d9b25a', fg: '#3e220e', font: 'script', shape: 'oval', text: 'Costeaux' } },
  "Copperfield's Books": { wall: '#9a4a32', trim: '#1f4a35', awn: '#2a5e43', style: 'brick', floors: 2, sign: { bg: '#1f4a35', fg: '#f3ead2', font: 'serif' } },
  'SingleThread':       { wall: '#2b2b2d', trim: '#a77a4e', awn: '#1e1e20', style: 'modern', floors: 2, roof: 'flat', sign: { bg: '#151517', fg: '#ece6d8', font: 'sans' } },
  'Dry Creek Kitchen':  { wall: '#cdb68c', trim: '#a3ad38', awn: '#7f8f2a', style: 'stucco', floors: 3, roof: 'flat', sign: { bg: '#2d2a22', fg: '#dfe57a', font: 'serif' } },
  'Barndiva':           { wall: '#3b2a20', trim: '#8a4b26', awn: '#5a3a24', style: 'board', floors: 2, roof: 'gable', roofCol: '#2a2420', sign: { bg: '#1c1410', fg: '#f2c46a', font: 'serif' } },
  'Noble Folk':         { wall: '#f3f1ec', trim: '#1c1c1c', awn: '#232323', stripe: '#f6f6f2', style: 'plain', floors: 2, sign: { bg: '#fbfaf6', fg: '#1c1c1c', font: 'serif', shape: 'oval', text: 'NOBLE FOLK', sub: 'ice cream & pie bar' } },
  'Flying Goat Coffee': { wall: '#8f8a82', trim: '#1d1d1d', awn: '#9c7a52', style: 'stone', floors: 1, roof: 'flat', sign: { bg: '#151515', fg: '#ffffff', font: 'slab', text: 'FLYING GOAT COFFEE' } },
  'Journeyman Meat Co': { wall: '#26262a', trim: '#3c3c40', awn: '#1e1e20', stripe: '#d8d8d8', style: 'plain', floors: 2, roof: 'flat', sign: { bg: '#b3201c', fg: '#ffffff', font: 'slab', shape: 'badge', text: 'Journeyman', sub: 'MEAT CO' } },
  'Plaza Gourmet':      { wall: '#efe6d2', trim: '#20473a', awn: '#1f5a43', style: 'plain', floors: 2, sign: { bg: '#20473a', fg: '#f2e9cf', font: 'serif' } },
  "Mr. Moon's":         { wall: '#e9e4d8', trim: '#1f7f86', awn: '#2a9aa0', style: 'plain', floors: 1, sign: { bg: '#1f7f86', fg: '#ffffff', font: 'sans', text: "MR MOON'S" } },
  'Fideaux Pets':       { wall: '#f1efe9', trim: '#1c1c1c', awn: '#35577d', style: 'plain', floors: 2, sign: { bg: '#ffffff', fg: '#111111', font: 'serif', shape: 'bone', text: 'FIDEAUX' } },
  'Running Company':    { wall: '#b9bcbd', trim: '#2a2a2a', awn: '#3f4246', style: 'quonset', floors: 1, sign: { bg: '#1b1b1d', fg: '#ffffff', font: 'sans', text: 'HEALDSBURG RUNNING CO.' } },
  'The Matheson':       { wall: '#3a3a3c', trim: '#a87b50', awn: '#2a2a2c', style: 'glass', floors: 3, roof: 'flat', sign: { bg: '#111111', fg: '#e8dcc0', font: 'serif', text: 'THE MATHESON' } },
  'Baci Cafe':          { wall: '#eadbc0', trim: '#1c1c1c', awn: '#3a2a22', style: 'stucco', floors: 1, sign: { bg: '#f6efe2', fg: '#b3122a', font: 'script', text: 'Baci', sub: 'CAFE & WINE BAR' } },
  'Little Saint':       { wall: '#e9e9e6', trim: '#f7f7f5', awn: '#c78b4f', style: 'glass', floors: 2, roof: 'flat', sign: { bg: '#f3f0e8', fg: '#2b2b2b', font: 'serif' } },
  'Lime Stone':         { wall: '#d9ccb0', trim: '#5d5a50', awn: '#7d7a6a', style: 'stone', floors: 2, sign: { bg: '#2a2a26', fg: '#efe6cf', font: 'serif' } },
  'Punch':              { wall: '#f0a37a', trim: '#ffffff', awn: '#e8662a', style: 'plain', floors: 2, sign: { bg: '#e8662a', fg: '#ffffff', font: 'sans', text: 'PUNCH' } },
  'Gallery Lulo':       { wall: '#f4f4f2', trim: '#1a1a1a', awn: '#2b2b2b', style: 'modern', floors: 1, roof: 'flat', sign: { bg: '#111111', fg: '#ffffff', font: 'sans', text: 'lulo', sub: 'GALLERY' } },
  'Hotel Healdsburg':   { wall: '#d8c9a8', trim: '#4e4a3e', awn: '#6a6650', style: 'stucco', floors: 3, roof: 'flat', sign: { bg: '#2a2620', fg: '#efe3c4', font: 'serif', text: 'HOTEL HEALDSBURG' } },
  'Spoke Folk Cyclery': { wall: '#b7b9b4', trim: '#1e5a3e', awn: '#1f6b48', style: 'quonset', floors: 1, sign: { bg: '#f2ede0', fg: '#1e5a3e', font: 'slab', text: 'SPOKE FOLK CYCLERY' } },
  'Maison Fiori':       { wall: '#f1e9dc', trim: '#6f8a5e', awn: '#8aa57a', style: 'plain', floors: 2, flowers: true, sign: { bg: '#f7f1e6', fg: '#4f6c42', font: 'script' } },
  'Downtown Bakery':    { wall: '#f2ead8', trim: '#2a4a6a', awn: '#3b78a8', style: 'plain', floors: 2, sign: { bg: '#f7efdc', fg: '#b23a2a', font: 'serif', shape: 'oval', text: 'DOWNTOWN', sub: 'BAKERY & CREAMERY' } },
  'Valette':            { wall: '#d8c8ac', trim: '#1d1d1d', awn: '#2a2a2a', style: 'stucco', floors: 1, roof: 'flat', sign: { bg: '#d8c8ac', fg: '#1d1d1d', font: 'script', shape: 'wall', sub: 'HEALDSBURG' } },
  "Willi's Seafood":    { wall: '#eef1f2', trim: '#20508c', awn: '#2a64a8', stripe: '#ffffff', style: 'plain', floors: 1, sign: { bg: '#20508c', fg: '#ffffff', font: 'sans', shape: 'arch', text: "WILLI'S SEAFOOD" } },
  'Bravas Tapas':       { wall: '#2f3e4f', trim: '#f2efe6', awn: '#8a3a26', style: 'craftsman', floors: 1, roof: 'gable', roofCol: '#33373d', sign: { bg: '#5a3a22', fg: '#f3e2bc', font: 'slab', text: 'BRAVAS', sub: 'BAR DE TAPAS' } },
};
export const SHOP_NAMES = Object.keys(SHOP_PROFILE);
// legacy palette view: [wall, trim, awning]
export const SHOP_STYLE = Object.fromEntries(SHOP_NAMES.map((n) => [n, [SHOP_PROFILE[n].wall, SHOP_PROFILE[n].trim, SHOP_PROFILE[n].awn]]));
export const SIGN_FONTS = {
  serif: (fs) => `700 ${fs}px "Playfair Display", Georgia, serif`,
  script: (fs) => `400 ${fs * 1.25}px Parisienne, "Snell Roundhand", "Brush Script MT", cursive`,
  sans: (fs) => `700 ${fs}px "Josefin Sans", "Avenir Next", "Helvetica Neue", sans-serif`,
  slab: (fs) => `700 ${fs}px "Roboto Slab", Rockwell, Georgia, serif`,
  round: (fs) => `600 ${fs}px Fredoka, sans-serif`,
};

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

export const tex = {};

export function buildTextures() {
  // Peabody's hairless, mottled pink-grey skin
  tex.skin = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#2c2d33'; g.fillRect(0, 0, w, h);
    // broad tonal variation (slate / warm charcoal)
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = Math.random() > 0.5 ? '70,74,84' : '24,22,26';
      gr.addColorStop(0, `rgba(${c},0.35)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // skin grain
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '120,124,134' : '10,10,14'},${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // a few faint pinkish-grey flecks (like his chest/belly)
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * w, y = h * (0.65 + Math.random() * 0.33), r = 4 + Math.random() * 10;
      g.save(); g.translate(x, y); g.filter = 'blur(2px)'; g.fillStyle = 'rgba(150,120,125,0.35)';
      g.beginPath(); g.ellipse(0, 0, r * 1.4, r, Math.random() * 3, 0, 7); g.fill(); g.restore();
    }
    // sparse fine white hairs
    g.strokeStyle = 'rgba(220,224,230,0.18)'; g.lineWidth = 1;
    for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3 - Math.random() * 6, y + 4 + Math.random() * 5); g.stroke(); }
  });
  // seamless tiling version for the sculpted body (triplanar): no blotches, subtle slate mottling + pores + fine hairs
  tex.pbSkin = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2e2f35'; g.fillRect(0, 0, w, h);
    const wrap = (fn) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 90;
      const c = Math.random() > 0.5 ? '64,67,76' : '30,29,33';
      wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},0.28)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '110,114,124' : '14,14,18'},${Math.random() * 0.1})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    g.strokeStyle = 'rgba(214,218,226,0.14)'; g.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const x = 4 + Math.random() * (w - 8), y = 4 + Math.random() * (h - 12); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2 - Math.random() * 4, y + 3 + Math.random() * 4); g.stroke(); }
  }, { repeat: true });
  // neutral fine-fur detail (multiplied over vertex-painted coat patterns, triplanar)
  tex.fur = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * w, y = Math.random() * h, l = 3 + Math.random() * 6, a = Math.PI / 2 + (Math.random() - 0.5) * 0.7;
      const lt = Math.random() > 0.5;
      g.strokeStyle = lt ? `rgba(255,255,255,${0.15 + Math.random() * 0.25})` : `rgba(120,120,120,${0.1 + Math.random() * 0.2})`;
      g.lineWidth = 0.6 + Math.random() * 0.8;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); }
    }
  }, { repeat: true });
  tex.tabby = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f39a3d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,200,140' : '190,90,30'},${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 3); }
    g.strokeStyle = 'rgba(176,82,22,0.45)'; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      g.lineWidth = 3 + Math.random() * 4; g.beginPath();
      const x = (i / 9) * w + Math.random() * 8; g.moveTo(x, h * 0.05);
      g.bezierCurveTo(x + 8, h * 0.25, x - 8, h * 0.4, x + 3, h * 0.55); g.stroke();
    }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,220,0)'); gr.addColorStop(0.6, 'rgba(255,240,220,0)'); gr.addColorStop(1, 'rgba(255,244,228,0.95)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  tex.stripes = canvasTex(64, 8, (g, w, h) => {
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#f2ede4'; g.fillRect(i * 16, 0, 16, h); }
    g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(16, 0, 16, h); g.fillRect(48, 0, 16, h);
    g.fillStyle = 'rgba(0,0,0,0)';
  }, { repeat: true });
  // make stripes actually two-tone: color A (vertex color) vs white
  tex.stripes = canvasTex(64, 8, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 32, h);
    g.fillStyle = '#bdbdbd'; g.fillRect(32, 0, 32, h);
  }, { repeat: true });
  tex.sidewalk = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9cdb8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '90,70,50'},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = `rgba(120,100,80,${Math.random() * 0.08})`; g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
    }
    g.strokeStyle = 'rgba(110,92,70,0.55)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
  }, { repeat: true });
  tex.asphalt = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#4a4a50'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = Math.random() * 60 + 40; g.fillStyle = `rgba(${v},${v},${v + 6},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = '#f4d35e'; g.fillRect(0, h * 0.62, w * 0.5, 10);
  }, { repeat: true });
  tex.grass = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6da544'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = Math.random() > 0.5 ? 'rgba(140,200,90,0.35)' : 'rgba(40,90,30,0.3)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 5); }
  }, { repeat: true });
  tex.vines = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b9a35c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#5f8a3a' : '#a89350'; g.fillRect(0, i * 16, w, 9); }
  }, { repeat: true });
  tex.blob = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  tex.spark = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(30, 4, 4, 56); g.fillRect(4, 30, 56, 4);
  }, { linear: true });
  tex.puff = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }, { linear: true });
  tex.heart = canvasTex(64, 64, (g) => {
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 56);
    g.bezierCurveTo(4, 36, 4, 10, 20, 10); g.bezierCurveTo(28, 10, 32, 18, 32, 20);
    g.bezierCurveTo(32, 18, 36, 10, 44, 10); g.bezierCurveTo(60, 10, 60, 36, 32, 56); g.fill();
  }, { linear: true });
  tex.ring = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 40, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }, { linear: true });
}

// Sign atlas — every shop name painted onto a single texture
export const SIGN_COLS = 4, SIGN_ROWS = 8;
export function buildSignAtlas() {
  const W = 2048, H = 1024, cw = W / SIGN_COLS, ch = H / SIGN_ROWS;
  const names = [...SHOP_NAMES, "IGGY'S BURGERS"];
  const fit = (g, txt, maxW, fs, kind) => { g.font = SIGN_FONTS[kind](fs); while (g.measureText(txt).width > maxW && fs > 14) { fs -= 2; g.font = SIGN_FONTS[kind](fs); } return fs; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  tex.signs = canvasTex(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    names.forEach((n, i) => {
      const col = i % SIGN_COLS, row = Math.floor(i / SIGN_COLS);
      const x = col * cw, y = row * ch, cx = x + cw / 2, cy = y + ch / 2;
      const pr = SHOP_PROFILE[n];
      const sg = pr ? pr.sign : { bg: '#b3261e', fg: '#ffe9a8', font: 'round', text: n };
      const shape = sg.shape || 'rect';
      const edge = pr ? pr.trim : '#ffd34d';
      g.save();
      // board silhouette (outside stays transparent → alpha-tested away)
      g.fillStyle = sg.bg;
      if (shape === 'oval') { g.beginPath(); g.ellipse(cx, cy, cw / 2 - 10, ch / 2 - 6, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 7; g.strokeStyle = edge; g.stroke(); g.beginPath(); g.ellipse(cx, cy, cw / 2 - 22, ch / 2 - 16, 0, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = sg.fg; g.stroke(); }
      else if (shape === 'bone') { const r = ch * 0.24; for (const s of [-1, 1]) for (const t of [-1, 1]) { g.beginPath(); g.arc(cx + s * (cw / 2 - r - 8), cy + t * r * 0.85, r, 0, Math.PI * 2); g.fill(); } g.fillRect(x + r + 14, cy - ch * 0.3, cw - 2 * r - 28, ch * 0.6); }
      else if (shape === 'badge') { rr(g, x + 14, y + 8, cw - 28, ch - 16, ch * 0.42); g.fill(); g.lineWidth = 4; g.strokeStyle = '#ffffff'; rr(g, x + 24, y + 16, cw - 48, ch - 32, ch * 0.34); g.stroke(); }
      else if (shape === 'arch') { g.beginPath(); g.moveTo(x + 8, y + ch - 8); g.lineTo(x + 8, y + ch * 0.42); g.quadraticCurveTo(cx, y - ch * 0.12, x + cw - 8, y + ch * 0.42); g.lineTo(x + cw - 8, y + ch - 8); g.closePath(); g.fill(); g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke(); }
      else if (shape === 'wall') { /* lettering painted straight on the stucco */ }
      else { g.fillRect(x + 4, y + 4, cw - 8, ch - 8); g.strokeStyle = sg.fg; g.globalAlpha = 0.85; g.lineWidth = 4; g.strokeRect(x + 14, y + 14, cw - 28, ch - 28); g.globalAlpha = 1; }
      // lettering
      const txt = sg.text || n;
      g.fillStyle = sg.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const maxW = cw - (shape === 'oval' ? 120 : shape === 'bone' ? 150 : 70);
      const hasSub = !!sg.sub;
      const fs = fit(g, txt, maxW, hasSub ? 58 : 66, sg.font);
      g.fillText(txt, cx, cy + (hasSub ? -ch * 0.12 : 3));
      if (hasSub) { fit(g, sg.sub, maxW * 0.9, 24, sg.font === 'script' ? 'sans' : sg.font); g.fillText(sg.sub, cx, cy + ch * 0.27); }
      g.restore();
      void fs;
    });
  });
  return { names, cw: 1 / SIGN_COLS, ch: 1 / SIGN_ROWS };
}

// Fresnel rim light injected into standard/physical materials — the soft glowing
// silhouette edge that gives characters that first‑party console look.
export function addRim(mat, color = 0xfff1d6, strength = 0.55, power = 2.6) {
  mat.userData.rim = { color: new THREE.Color(color), strength, power };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: mat.userData.rim.color };
    shader.uniforms.rimStrength = { value: mat.userData.rim.strength };
    shader.uniforms.rimPower = { value: mat.userData.rim.power };
    mat.userData.shader = shader;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor; uniform float rimStrength; uniform float rimPower;')
      .replace('#include <opaque_fragment>', `
        { vec3 vd = normalize(vViewPosition);
          float rimF = pow(1.0 - clamp(dot(normal, vd), 0.0, 1.0), rimPower);
          outgoingLight += rimColor * rimF * rimStrength; }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'rim';
  return mat;
}

export function std(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0, ...o.extra });
  if (o.map) m.map = o.map;
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; }
  if (o.rim !== false) addRim(m, o.rimColor, o.rimStrength ?? 0.45, o.rimPower ?? 2.6);
  return m;
}
export function phys(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: o.roughness ?? 0.5, metalness: o.metalness ?? 0, ...o.extra });
  if (o.map) m.map = o.map;
  if (o.rim !== false) addRim(m, o.rimColor, o.rimStrength ?? 0.45, o.rimPower ?? 2.6);
  return m;
}

export const mats = {};
export function buildSharedMaterials() {
  mats.static = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  mats.foliage = addRim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 0xfff0c0, 0.35, 2.2);
  mats.glass = new THREE.MeshStandardMaterial({ color: 0x2c4a5e, roughness: 0.08, metalness: 0.85, envMapIntensity: 1.6 });
  mats.glassLit = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.15, metalness: 0.3, emissive: 0xffb15c, emissiveIntensity: 0.85 });
  mats.sign = new THREE.MeshStandardMaterial({ map: tex.signs, alphaTest: 0.5, transparent: false, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex.signs, emissiveIntensity: 0.05 });
  mats.awning = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.stripes, roughness: 0.75, side: THREE.DoubleSide });
  mats.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  mats.sidewalk = new THREE.MeshStandardMaterial({ map: tex.sidewalk, roughness: 0.9 });
  mats.asphalt = new THREE.MeshStandardMaterial({ map: tex.asphalt, roughness: 0.8, metalness: 0.05 });
  mats.grass = new THREE.MeshStandardMaterial({ map: tex.grass, roughness: 1 });
  mats.blob = new THREE.MeshBasicMaterial({ map: tex.blob, transparent: true, depthWrite: false, toneMapped: false });
}
