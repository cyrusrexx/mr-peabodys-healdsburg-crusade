// Iggy's Burgers, inside, after the real one on the Plaza (Cyrus, 10 Oct 2026: "Maybe make Iggy's like the other
// store? A burger guy at a counter", then a photo of its room): a pressed-tin ceiling with track lights, exposed brick
// with the menu on it in a black frame, white walls, black dome pendants, an oak shelf of plants and jars under the
// paper menus, the open kitchen with its grill, a pale wood counter with a white top and a glass case of ice cream.
// Behind the counter its grill cook (not anyone real; the game's own), waving, his spatula up, in a cap, a grey tee
// and a dark apron. Drawn in code, never traced from the photo, 1600 x 1066 like assets/petshop.webp, so the shop
// screen frames it as it frames Fideaux Pets: the cook in the middle, the bubble's room to his right, the counter
// across the bottom third for the cards.
//   node art/iggys.mjs > /tmp/iggys.svg, then rendered to assets/iggys.webp (art/render-iggys.cjs: Chromium at 2x,
//   scaled down, WebP). Its words are in Fredoka, the game's own display type, which the render page loads.
const W = 1600, H = 1066;
const n1 = (v) => +v.toFixed(1);
const defs = [], out = [];
let uid = 0;
const id = (p) => `${p}${++uid}`;
const stops = (s) => s.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
const lin = (x1, y1, x2, y2, s) => { const i = id('l'); defs.push(`<linearGradient id="${i}" gradientUnits="userSpaceOnUse" x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}">${stops(s)}</linearGradient>`); return `url(#${i})`; };
const rad = (cx, cy, r, s, fx = cx, fy = cy) => { const i = id('r'); defs.push(`<radialGradient id="${i}" gradientUnits="userSpaceOnUse" cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fx="${n1(fx)}" fy="${n1(fy)}">${stops(s)}</radialGradient>`); return `url(#${i})`; };
const blur = (sd) => { const i = id('b'); defs.push(`<filter id="${i}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`); return `url(#${i})`; };
const add = (s) => out.push(s);
const pts = (a) => a.map((p) => p.map(n1).join(',')).join(' ');
// the same picture every time it is drawn
let seed = 20261011;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// a limb: two circles and the band that joins them, shaded across like a cylinder (light from the upper left)
function capsule(x1, y1, r1, x2, y2, r2, tone, extra = '') {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const s = (r1 - r2) / L, c = Math.sqrt(1 - s * s);
  const u = [s * ux + c * nx, s * uy + c * ny], v = [s * ux - c * nx, s * uy - c * ny];
  const R = Math.max(r1, r2), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const sg = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1;
  const fill = tone.flat ? tone.flat : lin(mx + sg * R * nx, my + sg * R * ny, mx - sg * R * nx, my - sg * R * ny, [[0, tone.light], [0.45, tone.base], [0.85, tone.shade], [1, tone.deep]]);
  return `<g fill="${fill}"${extra}><circle cx="${n1(x1)}" cy="${n1(y1)}" r="${n1(r1)}"/><circle cx="${n1(x2)}" cy="${n1(y2)}" r="${n1(r2)}"/><polygon points="${pts([[x1 + r1 * u[0], y1 + r1 * u[1]], [x2 + r2 * u[0], y2 + r2 * u[1]], [x2 + r2 * v[0], y2 + r2 * v[1]], [x1 + r1 * v[0], y1 + r1 * v[1]]])}"/></g>`;
}
const SKIN = { light: '#ffd7b6', base: '#f4b88e', shade: '#dd966b', deep: '#c47c55' };
const TEE = { light: '#eef0f2', base: '#d8dce0', shade: '#bcc3c8', deep: '#a8b0b6' };
const HAIR = '#2b190e';
const fishIcon = (x, y, s, col = '#4aa3e0') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12,0 C-6,-7 6,-8 12,0 C6,8 -6,7 -12,0Z" fill="${col}"/><path d="M11,0 L18,-6 L18,6Z" fill="${col}"/><circle cx="5" cy="-1.5" r="1.6" fill="#fff"/></g>`;

// ── the white walls ──
add(`<rect width="${W}" height="${H}" fill="${lin(0, 96, 0, 712, [[0, '#f6f4ef'], [0.6, '#f1eee8'], [1, '#e7e2d9']])}"/>`);

// ── exposed brick on the left, the menu on it ──
const BRICK = ['#a9533a', '#9c4a33', '#b45d3f', '#8f432e', '#a34f37', '#b86644', '#9a5038'];
add(`<rect x="0" y="96" width="440" height="620" fill="#cbb397"/>`);
for (let r = 0, y = 100; y < 716; r++, y += 24) {
  for (let x = r % 2 ? -31 : 0; x < 440; x += 62) {
    const c = BRICK[Math.floor(rnd() * BRICK.length)], w = Math.min(58, 440 - x - 2);
    if (w < 6) continue;
    add(`<rect x="${Math.max(0, x + 2)}" y="${y}" width="${n1(x < 0 ? w + x : w)}" height="20" rx="2" fill="${c}"/><rect x="${Math.max(0, x + 2)}" y="${y}" width="${n1(x < 0 ? w + x : w)}" height="3" fill="#ffffff" opacity=".1"/>`);
  }
}
add(`<rect x="0" y="96" width="440" height="620" fill="${lin(0, 0, 440, 0, [[0, '#2a1208', 0.35], [0.6, '#2a1208', 0.05], [1, '#2a1208', 0.18]])}"/>`);
add(`<rect x="440" y="96" width="14" height="620" fill="${lin(440, 0, 454, 0, [[0, '#d9d4cb'], [0.5, '#fbfaf7'], [1, '#e2ddd4']])}"/>`);
// the track lights' pools on the walls, under everything that hangs there
for (let x = 60; x < W; x += 116) {
  const a = (x - 800) / 800 * 18, cx = x + a * 1.6;
  add(`<g transform="translate(${n1(cx)} 168) scale(.62 1.3)"><circle r="100" fill="${rad(0, 0, 100, [[0, '#fff3d2', 0.5], [0.55, '#fff3d2', 0.18], [1, '#fff3d2', 0]])}"/></g>`);
}
// the menu: a black frame, the round red mark, three lines
add(`<rect x="62" y="158" width="362" height="330" rx="4" fill="#1a0c06" opacity=".35" filter="${blur(10)}" transform="translate(8 12)"/>`);
add(`<rect x="56" y="148" width="362" height="330" rx="4" fill="#1b1b1d"/><rect x="68" y="160" width="338" height="306" fill="${lin(0, 160, 0, 466, [[0, '#fdfcf9'], [1, '#f1eee7']])}"/>`);
add(`<circle cx="128" cy="226" r="46" fill="#d8342a"/><circle cx="128" cy="226" r="39" fill="none" stroke="#fff" stroke-width="2"/><text x="128" y="227" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="21" fill="#fff">IGGY'S</text><text x="128" y="245" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="10" letter-spacing="2.5" fill="#fff">BURGER</text>`);
add(`<text x="190" y="219" font-family="Fredoka" font-weight="700" font-size="34" fill="#1d1d1f">MENU</text><rect x="192" y="230" width="190" height="3" fill="#d8342a"/><text x="192" y="254" font-family="Fredoka" font-weight="500" font-size="14" letter-spacing="1" fill="#6a6a6e">BURGERS · FRIES · SHAKES</text>`);
[['IGGY BURGER', '20', 316], ['FRIES', '10', 364], ['MILKSHAKE', 'FREE', 412]].forEach(([name, price, y]) => {
  add(`<text x="86" y="${y}" font-family="Fredoka" font-weight="600" font-size="25" fill="#1d1d1f">${name}</text>`);
  for (let x = 262; x <= 318; x += 8) add(`<circle cx="${x}" cy="${y - 7}" r="1.8" fill="#9a9aa0"/>`);
  if (price === 'FREE') add(`<text x="392" y="${y}" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="25" fill="#d8342a">FREE</text>`);
  else add(`<text x="358" y="${y}" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="25" fill="#1d1d1f">${price}</text>` + fishIcon(377, y - 8, 0.85));
});
add(`<text x="237" y="448" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="13" letter-spacing="3" fill="#8a8a90">PAY WITH MINNOWS</text>`);

// ── the paper menus on their rail, and the oak shelf of plants and jars, right ──
add(`<rect x="1150" y="112" width="446" height="5" rx="2" fill="#1d1e21"/>`);
for (const [x, h, r] of [[1172, 150, -1], [1276, 162, 1], [1380, 146, -0.5], [1484, 158, 0.8]]) {
  add(`<g transform="rotate(${r} ${x + 46} 116)"><rect x="${x + 4}" y="120" width="92" height="${h}" fill="#2a1a0a" opacity=".12" filter="${blur(4)}"/><rect x="${x}" y="116" width="92" height="${h}" fill="#fdfcf8"/><rect x="${x + 38}" y="112" width="16" height="10" rx="2" fill="#2b2c30"/><rect x="${x + 12}" y="134" width="68" height="6" fill="#d8342a"/>${[150, 162, 174, 192, 204, 216, 234, 246].filter((yy) => yy < 116 + h - 12).map((yy, i) => `<rect x="${x + 12}" y="${yy}" width="${[60, 44, 52, 64, 40, 56, 48, 36][i]}" height="3.5" rx="1.5" fill="#8b8c92"/>`).join('')}</g>`);
}
add(`<rect x="1096" y="286" width="504" height="12" fill="${lin(0, 286, 0, 298, [[0, '#e3c799'], [1, '#b88f5c']])}"/><rect x="1096" y="298" width="504" height="6" fill="#2a1a0a" opacity=".15"/>`);
const LEAF = 'M0,0 C-9,-2 -14,9 -9,18 C-6,24 -2,28 0,32 C2,28 6,24 9,18 C14,9 9,-2 0,0Z';
const leaf = (x, y, a, sc, c) => `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)}) scale(${n1(sc)})"><path d="${LEAF}" fill="${c}"/><path d="M0,3 L0,27" stroke="#a9dd8e" stroke-width="1.2" opacity=".55"/></g>`;
const GREENS = ['#2f7a34', '#3f8a3a', '#4e9c44', '#5aa84c'];
const pot = (x, w, h) => `<path d="M${x - w / 2},286 L${x - w / 2 + 4},${286 - h} L${x + w / 2 - 4},${286 - h} L${x + w / 2},286Z" fill="${lin(x - w / 2, 0, x + w / 2, 0, [[0, '#d6d3cc'], [0.4, '#ffffff'], [1, '#c9c6bf']])}"/><rect x="${x - w / 2 + 2}" y="${286 - h}" width="${w - 4}" height="5" fill="#e9e6e0"/>`;
const pothos = (x, trails) => {
  let s = pot(x, 50, 34);
  for (let i = 0; i < 16; i++) { const a = -160 + rnd() * 140; s += leaf(x + Math.cos(a * Math.PI / 180) * (10 + rnd() * 14), 252 + Math.sin(a * Math.PI / 180) * (8 + rnd() * 10), a - 90 + rnd() * 40 - 20, 0.75 + rnd() * 0.3, GREENS[i % 4]); }
  for (const [dx, len] of trails) {
    const px = (t) => x + dx + Math.sin(t * 5 + dx) * 8 * t, py = (t) => 262 + len * t;
    s += `<path d="M${n1(px(0))},${n1(py(0))} ${Array.from({ length: 12 }, (_, i) => `L${n1(px((i + 1) / 12))},${n1(py((i + 1) / 12))}`).join(' ')}" stroke="#3a7a32" stroke-width="2.2" fill="none"/>`;
    for (let t = 0.12, k = 0; t <= 1; t += 0.13, k++) s += leaf(px(t), py(t), (k % 2 ? 35 : -35) + rnd() * 10, 0.55 + (1 - t) * 0.2, GREENS[(k + 1) % 4]);
  }
  return s;
};
const snake = (x) => {
  let s = pot(x, 44, 32);
  for (const [dx, h, a, c] of [[-12, 96, -14, '#2f6a34'], [-4, 120, -5, '#3b7d3c'], [5, 108, 6, '#2a6230'], [13, 84, 16, '#3b7d3c'], [0, 70, -24, '#2a6230']]) s += `<path d="M${x + dx},256 C${x + dx - 9},${256 - h * 0.35} ${x + dx - 5},${256 - h * 0.75} ${x + dx},${256 - h} C${x + dx + 5},${256 - h * 0.75} ${x + dx + 9},${256 - h * 0.35} ${x + dx},256Z" fill="${c}" stroke="#c9d36a" stroke-width="1.6" transform="rotate(${a} ${x + dx} 256)"/>`;
  return s;
};
add(snake(1290));
for (const [x, c] of [[1346, '#7aa43a'], [1390, '#c8902e']]) add(`<rect x="${x}" y="240" width="34" height="46" rx="6" fill="#e9f3f6" opacity=".65"/><rect x="${x + 3}" y="252" width="28" height="31" rx="4" fill="${c}" opacity=".8"/><rect x="${x - 1}" y="236" width="36" height="8" rx="3" fill="#2b2c30"/><rect x="${x + 5}" y="244" width="5" height="38" rx="2" fill="#ffffff" opacity=".5"/>`);
add(pothos(1478, [[-20, 96], [6, 70], [22, 124]]));
add(pothos(1166, [[-16, 60], [14, 40]]));

// ── the open kitchen, right: its grill behind the pass ──
add(`<rect x="1094" y="318" width="492" height="398" rx="6" fill="${lin(1094, 0, 1586, 0, [[0, '#b9bfc4'], [0.5, '#e9ecee'], [1, '#aeb4b9']])}"/>`);
add(`<rect x="1106" y="330" width="468" height="386" fill="${lin(0, 330, 0, 716, [[0, '#5d554e'], [0.6, '#463f39'], [1, '#2e2925']])}"/>`);
const ktile = id('t');
defs.push(`<pattern id="${ktile}" width="46" height="46" patternUnits="userSpaceOnUse" x="1106" y="400"><rect width="46" height="46" fill="#77716b"/><rect x="2" y="2" width="42" height="42" rx="2" fill="#8c867f"/></pattern>`);
add(`<rect x="1106" y="400" width="468" height="190" fill="url(#${ktile})" opacity=".55"/>`);
add(`<polygon points="1118,330 1562,330 1532,392 1148,392" fill="${lin(0, 330, 0, 392, [[0, '#e1e5e8'], [1, '#9aa2a8']])}"/><rect x="1148" y="392" width="384" height="7" fill="#25211e"/><rect x="1158" y="398" width="364" height="6" fill="#ffe7b4" opacity=".95" filter="${blur(3)}"/>`);
add(`<polygon points="1168,400 1512,400 1568,600 1112,600" fill="${lin(0, 400, 0, 600, [[0, '#ffe2a6', 0.3], [1, '#ffe2a6', 0]])}"/>`);
add(`<rect x="1106" y="330" width="468" height="386" fill="${rad(1330, 610, 300, [[0, '#ff9a4a', 0.55], [0.5, '#ff7a30', 0.2], [1, '#ff7a30', 0]])}"/>`);
for (const [x, r] of [[1162, -4], [1236, 3], [1452, -2]]) add(`<g transform="rotate(${r} ${x + 22} 404)"><rect x="${x}" y="404" width="44" height="58" rx="2" fill="#fbf8f0"/><rect x="${x + 6}" y="411" width="32" height="4" fill="#d8342a"/>${[422, 430, 438, 446].map((y, i) => `<rect x="${x + 6}" y="${y}" width="${[28, 22, 30, 16][i]}" height="2.6" fill="#8a8f96"/>`).join('')}</g>`);
add(`<rect x="1118" y="584" width="444" height="52" rx="6" fill="${lin(0, 584, 0, 636, [[0, '#5a5a62'], [1, '#2e2e33']])}"/><rect x="1112" y="628" width="456" height="34" rx="5" fill="${lin(0, 628, 0, 662, [[0, '#e7eaec'], [0.5, '#a7aeb3'], [1, '#6f777c']])}"/>`);
for (const x of [1160, 1220, 1280, 1400, 1460, 1520]) add(`<circle cx="${x}" cy="646" r="8" fill="#1d1d21"/><circle cx="${x - 2}" cy="644" r="2.5" fill="#6d6d74"/>`);
for (const [x, y] of [[1206, 596], [1320, 600], [1434, 596]]) add(`<ellipse cx="${x}" cy="${y}" rx="50" ry="15" fill="${rad(x - 10, y - 4, 56, [[0, '#9a5630'], [0.7, '#5e2c14'], [1, '#3e1c0c']])}"/><path d="M${x - 30},${y - 4} q15,-6 30,-2 M${x - 8},${y + 4} q16,-6 30,-2" stroke="#c07a45" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`);
add(`<path d="M1282,592 L1358,588 L1364,602 L1354,616 L1344,604 L1328,612 L1312,602 L1298,612 L1286,600Z" fill="#ffc83a"/><path d="M1286,592 L1356,589" stroke="#fff0a0" stroke-width="3" opacity=".8"/>`);
for (const x of [1502, 1532]) add(`<ellipse cx="${x}" cy="600" rx="22" ry="9" fill="${lin(0, 591, 0, 609, [[0, '#f6c063'], [1, '#c9802a']])}"/>`);
for (const [x, k] of [[1206, 1], [1320, -1], [1434, 1]]) add(`<path d="M${x},580 C${x - 22 * k},542 ${x + 18 * k},508 ${x},468 C${x - 18 * k},440 ${x + 14 * k},420 ${x + 4 * k},400" stroke="#fff6ea" stroke-width="16" fill="none" stroke-linecap="round" opacity=".32" filter="${blur(8)}"/>`);
add(`<rect x="1094" y="672" width="492" height="30" rx="5" fill="${lin(0, 672, 0, 702, [[0, '#f5f7f8'], [0.4, '#c4cacf'], [1, '#7f878d']])}"/>`);
add(`<path d="M1446,672 L1434,640 L1532,640 L1520,672Z" fill="#fbf7ee" stroke="#d9d2c4" stroke-width="2"/>`);
for (let i = 0; i < 6; i++) add(`<rect x="${1442 + i * 13}" y="${620 + (i % 2) * 6}" width="9" height="${30 - (i % 3) * 4}" rx="3" fill="#ffcc3a" transform="rotate(${(i - 2.5) * 5} ${1446 + i * 13} 648)"/>`);
add(`<path d="M1488,640 C1488,614 1532,614 1532,640Z" fill="#e9a446"/><rect x="1486" y="632" width="48" height="6" fill="#6cc04a"/>`);

// ── the track lights and pressed tin ceiling, and the pendants ──
const tin = id('t');
defs.push(`<pattern id="${tin}" width="64" height="64" patternUnits="userSpaceOnUse" x="0" y="0"><rect width="64" height="64" fill="#9ea4a9"/><rect x="2" y="2" width="60" height="60" fill="${lin(0, 0, 64, 64, [[0, '#eef1f3'], [0.5, '#c8cdd1'], [1, '#a5abb0']])}"/><rect x="9" y="9" width="46" height="46" fill="none" stroke="#98a0a5" stroke-width="2"/><rect x="10" y="10" width="45" height="45" fill="none" stroke="#f7f9fa" stroke-width="1.2" opacity=".8"/><circle cx="32" cy="32" r="8" fill="none" stroke="#98a0a5" stroke-width="2"/><circle cx="33" cy="33" r="8" fill="none" stroke="#f7f9fa" stroke-width="1.2" opacity=".8"/>${[[32, 17, 0], [47, 32, 90], [32, 47, 0], [17, 32, 90]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="3.5" ry="6" fill="#e2e6e9" stroke="#98a0a5" stroke-width="1.2" transform="rotate(${a} ${x} ${y})"/>`).join('')}</pattern>`);
add(`<rect width="${W}" height="96" fill="url(#${tin})"/><rect width="${W}" height="96" fill="${lin(0, 0, 0, 96, [[0, '#30353a', 0.4], [1, '#30353a', 0.05]])}"/>`);
add(`<rect x="0" y="92" width="${W}" height="10" fill="${lin(0, 92, 0, 102, [[0, '#ffffff'], [1, '#d6d2ca']])}"/>`);
add(`<rect x="0" y="58" width="${W}" height="7" rx="3" fill="#1d1e21"/>`);
for (let x = 60; x < W; x += 116) {
  const a = (x - 800) / 800 * 18;
  add(`<g transform="rotate(${n1(a)} ${x} 64)"><rect x="${x - 9}" y="62" width="18" height="26" rx="6" fill="#26282c"/><ellipse cx="${x}" cy="88" rx="7" ry="3" fill="#fff4d0"/></g>`);
}
const pendant = (x, y) => `<line x1="${x}" y1="102" x2="${x}" y2="${y}" stroke="#1d1e21" stroke-width="2.5"/><ellipse cx="${x}" cy="${y + 40}" rx="72" ry="54" fill="${rad(x, y + 40, 80, [[0, '#ffe2a2', 0.6], [1, '#ffe2a2', 0]])}"/><path d="M${x - 32},${y + 30} C${x - 30},${y + 6} ${x + 30},${y + 6} ${x + 32},${y + 30}Z" fill="${lin(x - 32, 0, x + 32, 0, [[0, '#121214'], [0.35, '#3a3b40'], [1, '#141416']])}"/><rect x="${x - 6}" y="${y}" width="12" height="9" rx="2" fill="#1d1e21"/><ellipse cx="${x}" cy="${y + 30}" rx="14" ry="5" fill="#fff4cf"/>`;
add(pendant(520, 162));
add(pendant(1072, 168));

// ── the cook ──
const X = 800;
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => `${n1(2 * X - +x)},${y}`);
const TORSO = 'M724,398 C690,400 652,410 632,432 C612,452 606,482 604,522 L596,742 L1004,742 L996,522 C994,482 988,452 968,432 C948,410 910,400 876,398Z';
const HEAD = 'M800,152 C866,152 912,196 916,258 C920,318 900,368 860,388 C842,398 822,402 800,402 C778,402 758,398 740,388 C700,368 680,318 684,258 C688,196 734,152 800,152Z';
const CROWN = 'M686,198 C688,150 736,110 800,106 C864,110 912,150 914,198 C880,188 840,184 800,184 C760,184 720,188 686,198Z';
const BRIM = 'M670,198 C718,180 882,180 930,198 C938,208 934,216 924,216 C880,204 720,204 676,216 C666,216 662,208 670,198Z';
const LIMBS = [
  [650, 455, 42, 590, 540, 33], [590, 540, 33, 579, 410, 27], // waving: upper arm, forearm
  [950, 455, 42, 1012, 585, 33], [1012, 585, 33, 1052, 500, 27], // spatula: upper arm, forearm
];
// his shadow on the wall
add(`<g fill="#3c3226" opacity=".16" filter="${blur(16)}" transform="translate(30 18)"><path d="${TORSO}"/><path d="${HEAD}"/><path d="${CROWN}"/><path d="${BRIM}"/>${LIMBS.map((l) => capsule(...l, { flat: '#3c3226' })).join('')}<ellipse cx="577" cy="330" rx="56" ry="80"/></g>`);
// the torso in a grey tee
add(`<path d="${TORSO}" fill="${lin(596, 0, 1004, 0, [[0, '#a3aab0'], [0.16, '#cdd2d6'], [0.5, '#e3e6e9'], [0.84, '#cbd0d4'], [1, '#9ea6ac']])}"/>`);
add(`<path d="M640,470 C660,520 668,600 664,700 M960,470 C940,520 932,600 936,700" stroke="#a9b0b6" stroke-width="5" fill="none" opacity=".6" stroke-linecap="round"/>`);
for (const l of LIMBS) add(capsule(...l, SKIN));
add(`<path d="M579,520 C585,506 596,500 606,502" stroke="#c47c55" stroke-width="3" fill="none" opacity=".5"/>`);
const sleeve = (x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  return capsule(x1, y1, 47, x2, y2, 42, TEE) + `<line x1="${n1(x2 + 41 * nx)}" y1="${n1(y2 + 41 * ny)}" x2="${n1(x2 - 41 * nx)}" y2="${n1(y2 - 41 * ny)}" stroke="${lin(x2 + 40 * nx, y2 + 40 * ny, x2 - 40 * nx, y2 - 40 * ny, [[0, '#e4e7ea'], [1, '#b3bac0']])}" stroke-width="9" stroke-linecap="round"/>`;
};
add(sleeve(652, 452, 616, 506));
add(sleeve(948, 452, 986, 512));
// the apron, dark canvas, his round red patch; pocket and pencil
add(`<path d="M748,462 L772,404 M852,462 L828,404" stroke="#1e1f22" stroke-width="14" stroke-linecap="round"/>`);
const APRON = 'M740,458 L860,458 L876,600 C902,622 930,662 940,742 L660,742 C670,662 698,622 724,600Z';
add(`<path d="${APRON}" fill="${lin(0, 458, 0, 742, [[0, '#45474d'], [0.55, '#33353a'], [1, '#26272b']])}"/>`);
add(`<path d="${APRON}" fill="${lin(660, 0, 940, 0, [[0, '#000', 0.35], [0.2, '#000', 0], [0.8, '#000', 0], [1, '#000', 0.35]])}"/>`);
add(`<path d="M748,468 L852,468 L866,594 M748,468 L734,594" stroke="#7a7d85" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity=".6"/>`);
add(`<circle cx="800" cy="522" r="31" fill="#d8342a"/><circle cx="800" cy="522" r="25" fill="none" stroke="#fff" stroke-width="1.8"/><text x="800" y="527" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="14" fill="#fff">IGGY'S</text>`);
add(`<g transform="rotate(10 826 600)"><rect x="820" y="566" width="11" height="52" rx="2" fill="#f6c431"/><rect x="820" y="562" width="11" height="9" rx="2" fill="#f08aa0"/></g>`);
add(`<rect x="764" y="598" width="74" height="56" rx="8" fill="#26272b"/><path d="M768,606 L834,606" stroke="#7a7d85" stroke-width="2.5" stroke-dasharray="6 5" opacity=".55"/>`);
// neck and the tee's round collar
add(`<path d="M756,350 L844,350 L848,414 C830,428 770,428 752,414Z" fill="${lin(0, 350, 0, 428, [[0, '#c47c55'], [0.45, '#e2a07a'], [1, '#eeb38c']])}"/>`);
add(`<path d="M744,404 C770,432 830,432 856,404 L866,414 C836,446 764,446 734,414Z" fill="#d3d7db"/><path d="M744,404 C770,432 830,432 856,404" stroke="#a9b0b6" stroke-width="3" fill="none"/>`);
// ears, head, sideburns
add(`<ellipse cx="686" cy="276" rx="24" ry="35" fill="${lin(662, 0, 710, 0, [[0, '#d58a60'], [1, '#f2b088']])}" transform="rotate(-8 686 276)"/><path d="M682,258 C672,268 674,290 686,298" stroke="#b86e48" stroke-width="5" fill="none" stroke-linecap="round"/>`);
add(`<ellipse cx="914" cy="276" rx="24" ry="35" fill="${lin(890, 0, 938, 0, [[0, '#f2b088'], [1, '#d58a60']])}" transform="rotate(8 914 276)"/><path d="M918,258 C928,268 926,290 914,298" stroke="#b86e48" stroke-width="5" fill="none" stroke-linecap="round"/>`);
const face = rad(772, 248, 210, [[0, '#ffdcbf'], [0.42, '#f7be95'], [0.82, '#e59e74'], [1, '#d48b62']]);
add(`<path d="${HEAD}" fill="${face}"/>`);
add(`<path d="M698,320 C716,372 760,400 800,402 C840,400 884,372 902,320 C890,360 850,388 800,390 C750,388 710,360 698,320Z" fill="#a8623e" opacity=".22" filter="${blur(5)}"/>`);
const SIDEBURN = 'M689,206 C687,228 689,250 696,266 L708,262 C704,248 704,228 708,206Z';
add(`<path d="${SIDEBURN}" fill="${HAIR}"/><path d="${mirror(SIDEBURN)}" fill="${HAIR}"/>`);
// his cap: dark, a red patch with a burger, its brim's shade on his brow
add(`<path d="M690,214 C730,206 870,206 910,214 L904,236 C860,228 740,228 696,236Z" fill="#3a1a0a" opacity=".22" filter="${blur(5)}"/>`);
add(`<path d="${CROWN}" fill="${lin(700, 110, 900, 200, [[0, '#4a4c52'], [0.5, '#2c2d32'], [1, '#17181b']])}"/>`);
add(`<path d="M800,108 L746,188 M800,108 L854,188" stroke="#4d4f56" stroke-width="2.5" fill="none" opacity=".8"/><circle cx="800" cy="109" r="6" fill="#2a2b2f"/>`);
add(`<circle cx="800" cy="152" r="23" fill="#d8342a"/><path d="M787,150 C787,137 813,137 813,150Z" fill="#fff"/><rect x="786" y="153" width="28" height="4" rx="2" fill="#fff"/><path d="M787,160 L813,160 C813,166 787,166 787,160Z" fill="#fff"/>`);
add(`<path d="${BRIM}" fill="${lin(0, 182, 0, 216, [[0, '#3c3e44'], [1, '#121315']])}"/><path d="M670,198 C718,180 882,180 930,198" stroke="#5c5f66" stroke-width="2.5" fill="none"/>`);
// brows
const BROW = 'M716,234 C724,212 752,204 786,210 C792,212 792,221 785,224 C760,218 740,222 728,238Z';
add(`<path d="${BROW}" fill="${HAIR}"/><path d="${mirror(BROW)}" fill="${HAIR}"/>`);
// eyes, squinting in his smile
for (const k of [-1, 1]) {
  const ex = X + k * 42, ey = 254;
  add(`<ellipse cx="${ex}" cy="${ey}" rx="22" ry="25" fill="#fffaf4"/><ellipse cx="${ex}" cy="${ey - 4}" rx="22" ry="20" fill="#7a5a48" opacity=".08"/>`);
  add(`<circle cx="${ex - k * 3}" cy="${ey + 3}" r="14" fill="${rad(ex - k * 3, ey, 15, [[0, '#a8703f'], [0.7, '#6b3d1c'], [1, '#3e220e']])}"/><circle cx="${ex - k * 3}" cy="${ey + 3}" r="7.5" fill="#1a0e07"/>`);
  add(`<circle cx="${ex - k * 3 + 5}" cy="${ey - 4}" r="5" fill="#ffffff"/><circle cx="${ex - k * 3 - 4}" cy="${ey + 9}" r="2.2" fill="#ffffff" opacity=".8"/>`);
  add(`<path d="M${ex - 23},${ey + 9} C${ex - 12},${ey + 28} ${ex + 12},${ey + 28} ${ex + 23},${ey + 9} L${ex + 26},${ey + 34} L${ex - 26},${ey + 34}Z" fill="${face}"/>`);
  add(`<path d="M${ex - 22},${ey - 2} C${ex - 18},${ey - 26} ${ex + 18},${ey - 26} ${ex + 22},${ey - 2}" stroke="#3a2214" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  add(`<path d="M${ex - 18},${ey + 16} C${ex - 8},${ey + 25} ${ex + 8},${ey + 25} ${ex + 18},${ey + 16}" stroke="#c98563" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`);
}
// cheeks, nose
for (const k of [-1, 1]) add(`<circle cx="${X + k * 72}" cy="310" r="34" fill="${rad(X + k * 72, 310, 34, [[0, '#ff7f6a', 0.5], [1, '#ff7f6a', 0]])}"/>`);
add(`<ellipse cx="800" cy="294" rx="31" ry="26" fill="${rad(790, 284, 34, [[0, '#ffd3b8'], [0.5, '#f4a888'], [1, '#d9846a']])}"/><ellipse cx="788" cy="283" rx="9" ry="6" fill="#fff0e4" opacity=".7"/><ellipse cx="787" cy="310" rx="6" ry="3.5" fill="#9a5440" opacity=".55"/><ellipse cx="813" cy="310" rx="6" ry="3.5" fill="#9a5440" opacity=".55"/>`);
// the open smile, then the mustache over it
const MOUTH = 'M758,340 C778,350 822,350 842,340 C838,374 818,392 800,392 C782,392 762,374 758,340Z';
const mclip = id('c');
defs.push(`<clipPath id="${mclip}"><path d="${MOUTH}"/></clipPath>`);
add(`<path d="${MOUTH}" fill="#6a1818"/><g clip-path="url(#${mclip})"><rect x="750" y="334" width="100" height="22" fill="#fffdf6"/><ellipse cx="800" cy="390" rx="27" ry="14" fill="#e2625a"/></g><path d="${MOUTH}" fill="none" stroke="#4a1010" stroke-width="2.5"/>`);
add(`<ellipse cx="800" cy="399" rx="28" ry="7" fill="#ffe0c8" opacity=".35"/>`);
const STACHE = 'M800,306 C784,303 762,306 744,316 C728,325 712,332 692,325 C698,345 724,355 752,349 C772,345 790,338 800,334 C810,338 828,345 848,349 C876,355 902,345 908,325 C888,332 872,325 856,316 C838,306 816,303 800,306Z';
add(`<path d="${STACHE}" fill="${lin(0, 303, 0, 355, [[0, '#4e2e19'], [1, '#22130a']])}"/>`);
for (const [a, b, c, d] of [[760, 318, 744, 334], [776, 314, 764, 336], [824, 314, 836, 336], [840, 318, 856, 334], [712, 332, 704, 340], [888, 332, 896, 340]]) add(`<path d="M${a},${b} Q${(a + c) / 2 - 4},${(b + d) / 2} ${c},${d}" stroke="#6e4628" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>`);
// the waving hand, fingers up, thumb toward his face
const HAND = { light: '#ffdcbf', base: '#f6bc93', shade: '#e09c72', deep: '#c98058' };
add(`<ellipse cx="578" cy="364" rx="41" ry="45" fill="${rad(570, 352, 50, [[0, '#ffdcbf'], [0.7, '#f4b48b'], [1, '#d99068']])}"/>`);
for (const f of [[548, 344, 11.5, 530, 294, 10], [562, 332, 12.5, 552, 270, 11], [580, 328, 13, 580, 260, 11.5], [598, 334, 12.5, 606, 272, 11]]) add(capsule(...f, HAND));
add(capsule(606, 380, 14, 646, 350, 12, HAND));
for (const [x, y] of [[530, 290], [552, 266], [580, 256], [606, 268], [647, 347]]) add(`<ellipse cx="${x}" cy="${y + 2}" rx="5.5" ry="4.5" fill="#ffe9da" opacity=".85"/>`);
add(`<path d="M556,380 C568,392 588,394 602,384" stroke="#c98058" stroke-width="2.5" fill="none" opacity=".45" stroke-linecap="round"/>`);
// the spatula, held up; his fist round its handle
add(`<line x1="1040" y1="552" x2="1098" y2="404" stroke="#7a4a22" stroke-width="18" stroke-linecap="round"/><line x1="1043" y1="540" x2="1096" y2="404" stroke="#a8703c" stroke-width="5" stroke-linecap="round" opacity=".8"/>`);
add(`<line x1="1097" y1="406" x2="1106" y2="383" stroke="#9aa2a8" stroke-width="17" stroke-linecap="round"/>`);
{
  const bx = 1106, by = 384, dx = 0.357, dy = -0.934, nx = 0.934, ny = 0.357, L = 112;
  const tx = bx + L * dx, ty = by + L * dy;
  const blade = [[bx + 22 * nx, by + 22 * ny], [tx + 34 * nx, ty + 34 * ny], [tx - 34 * nx, ty - 34 * ny], [bx - 22 * nx, by - 22 * ny]];
  add(`<polygon points="${pts(blade)}" fill="${lin(bx - 30 * nx, by - 30 * ny, bx + 30 * nx, by + 30 * ny, [[0, '#f7f9fa'], [0.5, '#c6ccd1'], [1, '#8e979d']])}" stroke="#c6ccd1" stroke-width="10" stroke-linejoin="round"/>`);
  for (const o of [-14, 0, 14]) add(`<line x1="${n1(bx + 34 * dx + o * nx)}" y1="${n1(by + 34 * dy + o * ny)}" x2="${n1(bx + 92 * dx + o * 1.2 * nx)}" y2="${n1(by + 92 * dy + o * 1.2 * ny)}" stroke="#6e767b" stroke-width="6" stroke-linecap="round"/>`);
}
add(`<ellipse cx="1058" cy="498" rx="36" ry="31" fill="${rad(1048, 488, 40, [[0, '#ffdcbf'], [0.7, '#f2b088'], [1, '#d48a62']])}" transform="rotate(-24 1058 498)"/>`);
for (const [x, y] of [[1030, 486], [1034, 504], [1040, 521]]) add(`<path d="M${x},${y} q14,-6 26,0" stroke="#c47c55" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`);
add(capsule(1044, 474, 12, 1076, 466, 11, HAND));

// ── the counter: a white top, pale wood slats ──
add(`<rect x="0" y="700" width="${W}" height="18" fill="#3a2a1a" opacity=".2" filter="${blur(6)}"/>`);
add(`<rect x="-10" y="708" width="1620" height="48" fill="${lin(0, 708, 0, 756, [[0, '#ecebe6'], [1, '#fbfaf7']])}"/>`);
for (const d of ['M-10,722 C200,716 380,736 640,724 S1100,716 1610,730', 'M120,744 C320,736 520,752 760,740 S1240,734 1610,748', 'M-10,738 C140,734 260,746 400,738']) add(`<path d="${d}" stroke="#c9c6bf" stroke-width="1.6" fill="none" opacity=".45"/>`);
add(`<rect x="-10" y="752" width="1620" height="7" fill="#ffffff"/><rect x="-10" y="759" width="1620" height="8" fill="${lin(0, 759, 0, 767, [[0, '#9a8f7e', 0.5], [1, '#9a8f7e', 0]])}"/>`);
add(`<rect x="-10" y="759" width="1620" height="307" fill="${lin(0, 759, 0, 1066, [[0, '#ecd8b6'], [0.6, '#e1c7a0'], [1, '#d2b58a']])}"/>`);
for (let x = 20; x < W; x += 46) add(`<rect x="${x}" y="767" width="2" height="270" fill="#c2a47b"/><rect x="${x + 2}" y="767" width="1" height="270" fill="#f6e8cf" opacity=".8"/>`);
for (let i = 0; i < 70; i++) { const x = rnd() * W, y = 780 + rnd() * 240; add(`<path d="M${n1(x)},${n1(y)} q3,${n1(12 + rnd() * 18)} 0,${n1(30 + rnd() * 40)}" stroke="#b9996f" stroke-width="1.2" fill="none" opacity=".35"/>`); }
add(`<rect x="-10" y="1036" width="1620" height="30" fill="#2a2a2d"/>`);
// on the counter, left: the glass case of ice cream, the till, the minnows sign
add(`<rect x="34" y="694" width="388" height="20" rx="3" fill="${lin(0, 694, 0, 714, [[0, '#e6e9eb'], [1, '#8d959b']])}"/>`);
add(`<rect x="40" y="598" width="376" height="98" fill="#eef6f8" opacity=".35"/>`);
for (const [i, c, top] of [[0, '#f7a6c1', '#ffc3d6'], [1, '#a8e6c9', '#c9f2de'], [2, '#7a4a2e', '#9a6646'], [3, '#f6ead0', '#fffaf0'], [4, '#c46a9c', '#dc8cb8']]) {
  const x = 56 + i * 72;
  add(`<rect x="${x}" y="648" width="62" height="44" rx="4" fill="${lin(x, 0, x + 62, 0, [[0, '#c9cfd3'], [0.5, '#f4f6f7'], [1, '#b5bcc1']])}"/><path d="M${x + 4},652 C${x + 10},632 ${x + 26},630 ${x + 31},640 C${x + 36},628 ${x + 54},632 ${x + 58},652Z" fill="${top}"/><rect x="${x + 4}" y="648" width="54" height="10" fill="${c}"/>`);
  if (i === 1) for (let j = 0; j < 6; j++) add(`<circle cx="${x + 12 + j * 7}" cy="${642 + (j % 2) * 5}" r="2" fill="#3a2414"/>`);
  add(`<rect x="${x + 16}" y="682" width="30" height="12" rx="2" fill="#fff"/><rect x="${x + 20}" y="687" width="22" height="2.4" fill="#8a8f96"/>`);
}
add(`<path d="M40,696 L40,640 C40,610 64,598 100,598 L416,598 L416,696" fill="none" stroke="#f7fbfc" stroke-width="3" opacity=".9"/><path d="M60,690 L140,604 M110,690 L190,604" stroke="#ffffff" stroke-width="6" opacity=".35" stroke-linecap="round"/><rect x="40" y="594" width="378" height="6" rx="2" fill="${lin(0, 594, 0, 600, [[0, '#f7f8f9'], [1, '#9aa2a8']])}"/>`);
add(`<rect x="458" y="692" width="44" height="18" rx="4" fill="#2a2b2f"/><rect x="474" y="650" width="10" height="44" fill="#3a3b40"/><g transform="rotate(-14 480 640)"><rect x="440" y="610" width="82" height="60" rx="6" fill="#1d1e21"/><rect x="446" y="616" width="70" height="48" rx="3" fill="${lin(0, 616, 0, 664, [[0, '#f4f8fb'], [1, '#dfe8ef']])}"/><rect x="446" y="616" width="70" height="10" fill="#d8342a"/><text x="472" y="652" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="16" fill="#1d1d1f">20</text>${fishIcon(497, 646, 0.6)}</g>`);
add(`<path d="M536,712 L546,628 L612,628 L622,712Z" fill="#1d1e21"/><text x="579" y="658" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="13" fill="#fff">PAY WITH</text><text x="579" y="676" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="13" fill="#fff">MINNOWS</text>${fishIcon(574, 694, 0.7, '#9fdcff')}`);

// ── light: daylight from the windows behind you, the corners a little darker, a little grain ──
add(`<rect width="${W}" height="${H}" fill="${rad(800, 420, 980, [[0.6, '#2a1a0e', 0], [1, '#2a1a0e', 0.4]])}"/>`);
const grain = id('g');
defs.push(`<filter id="${grain}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  0 0 0 1.6 -.55"/></filter>`);
add(`<rect width="${W}" height="${H}" filter="url(#${grain})" opacity=".14"/>`);

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs.join('')}</defs>${out.join('\n')}</svg>\n`);
