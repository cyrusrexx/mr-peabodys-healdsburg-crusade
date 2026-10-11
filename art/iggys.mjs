// Iggy's Burgers, inside: Iggy behind his counter, waving, his spatula in the other hand; his menu board, the grill
// through the kitchen's pass, string lights, his till, ketchup and mustard on the counter (Cyrus, 10 Oct 2026: "Maybe
// make Iggy's like the other store? A burger guy at a counter"). Drawn in code, 1600 x 1066 like assets/petshop.webp, so
// the shop screen frames it as it frames Fideaux Pets: Iggy in the middle, the bubble's room to his right, the counter
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

// a limb: two circles and the band that joins them, shaded across like a cylinder (light from the upper left)
function capsule(x1, y1, r1, x2, y2, r2, tone, extra = '') {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const s = (r1 - r2) / L, c = Math.sqrt(1 - s * s);
  const u = [s * ux + c * nx, s * uy + c * ny], v = [s * ux - c * nx, s * uy - c * ny];
  const R = Math.max(r1, r2), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  // the lit side is the one facing up and left
  const sg = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1;
  const fill = tone.flat ? tone.flat : lin(mx + sg * R * nx, my + sg * R * ny, mx - sg * R * nx, my - sg * R * ny, [[0, tone.light], [0.45, tone.base], [0.85, tone.shade], [1, tone.deep]]);
  return `<g fill="${fill}"${extra}><circle cx="${n1(x1)}" cy="${n1(y1)}" r="${n1(r1)}"/><circle cx="${n1(x2)}" cy="${n1(y2)}" r="${n1(r2)}"/><polygon points="${pts([[x1 + r1 * u[0], y1 + r1 * u[1]], [x2 + r2 * u[0], y2 + r2 * u[1]], [x2 + r2 * v[0], y2 + r2 * v[1]], [x1 + r1 * v[0], y1 + r1 * v[1]]])}"/></g>`;
}
const SKIN = { light: '#ffd7b6', base: '#f4b88e', shade: '#dd966b', deep: '#c47c55' };
const SHIRT = { light: '#ffffff', base: '#f7f3ed', shade: '#ddd5ca', deep: '#c9bfb2' };
const HAIR = '#2b190e';

// ── the wall ──
add(`<rect width="${W}" height="${H}" fill="${lin(0, 0, 0, 760, [[0, '#ecc38c'], [0.42, '#fae3bc'], [1, '#f3d6a9']])}"/>`);
// mid-century stars on the upper wall
for (const [x, y, s, c] of [[560, 120, 16, '#e0544a'], [1040, 92, 12, '#3aa39a'], [985, 330, 14, '#e0544a'], [520, 360, 11, '#3aa39a'], [1580, 330, 13, '#3aa39a'], [40, 520, 0, ''], [1010, 210, 9, '#e8a33a'], [600, 250, 9, '#e8a33a']]) {
  if (!s) continue;
  const k = s * 0.28;
  add(`<path d="M${x},${y - s} L${x + k},${y - k} L${x + s},${y} L${x + k},${y + k} L${x},${y + s} L${x - k},${y + k} L${x - s},${y} L${x - k},${y - k}Z" fill="${c}" opacity=".55"/>`);
}
// subway tiles under a red band
const tile = id('t');
defs.push(`<pattern id="${tile}" width="72" height="72" patternUnits="userSpaceOnUse" x="0" y="458">
  <rect width="72" height="72" fill="#e6d3b4"/>
  <rect x="1.5" y="1.5" width="69" height="33" rx="4" fill="${lin(0, 0, 0, 36, [[0, '#fffdf6'], [1, '#f4e8d2']])}"/>
  <rect x="-34.5" y="37.5" width="69" height="33" rx="4" fill="#f8eedb"/><rect x="37.5" y="37.5" width="69" height="33" rx="4" fill="#f8eedb"/>
</pattern>`);
add(`<rect x="0" y="458" width="${W}" height="300" fill="url(#${tile})"/>`);
add(`<rect x="0" y="458" width="${W}" height="300" fill="${lin(0, 458, 0, 758, [[0, '#7a3a14', 0.18], [0.3, '#7a3a14', 0], [1, '#7a3a14', 0.12]])}"/>`);
add(`<rect x="0" y="420" width="${W}" height="6" fill="#fff6e4"/><rect x="0" y="426" width="${W}" height="30" fill="${lin(0, 426, 0, 456, [[0, '#e3443a'], [1, '#bf2c22']])}"/><rect x="0" y="456" width="${W}" height="5" fill="#7e1a12"/>`);

// ── the menu board, left ──
add(`<rect x="70" y="152" width="430" height="330" rx="18" fill="#3a1a0a" opacity=".32" filter="${blur(12)}" transform="translate(10 14)"/>`);
add(`<rect x="62" y="142" width="430" height="330" rx="18" fill="${lin(62, 142, 492, 472, [[0, '#7b4a28'], [0.5, '#5a3218'], [1, '#3e2210']])}"/>`);
add(`<rect x="80" y="160" width="394" height="294" rx="8" fill="${rad(277, 250, 300, [[0, '#2c3c36'], [1, '#18221f']])}"/>`);
add(`<rect x="80" y="160" width="394" height="294" rx="8" fill="${lin(80, 160, 300, 330, [[0, '#ffffff', 0.10], [1, '#ffffff', 0]])}"/>`);
add(`<text x="279" y="219" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="50" fill="#a8261e">IGGY'S</text><text x="277" y="215" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="50" fill="#ffd04f">IGGY'S</text>`);
for (const x of [130, 424]) add(`<path d="M${x},${196 - 12} L${x + 4},${196 - 4} L${x + 12},${196} L${x + 4},${196 + 4} L${x},${196 + 12} L${x - 4},${196 + 4} L${x - 12},${196} L${x - 4},${196 - 4}Z" fill="#ffd04f"/>`);
const fishIcon = (x, y, s, col = '#9fdcff') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12,0 C-6,-7 6,-8 12,0 C6,8 -6,7 -12,0Z" fill="${col}"/><path d="M11,0 L18,-6 L18,6Z" fill="${col}"/><circle cx="5" cy="-1.5" r="1.6" fill="#18221f"/></g>`;
[['IGGY BURGER', '20', 286], ['FRIES', '10', 340], ['MILKSHAKE', 'FREE', 394]].forEach(([name, price, y]) => {
  add(`<text x="104" y="${y}" font-family="Fredoka" font-weight="600" font-size="30" fill="#f6f1e6">${name}</text>`);
  for (let x = 306; x <= 360; x += 9) add(`<circle cx="${x}" cy="${y - 8}" r="2.2" fill="#f6f1e6" opacity=".55"/>`);
  if (price === 'FREE') add(`<text x="452" y="${y}" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="30" fill="#ff9a8c">FREE</text>`);
  else add(`<text x="418" y="${y}" text-anchor="end" font-family="Fredoka" font-weight="700" font-size="30" fill="#9fdcff">${price}</text>` + fishIcon(438, y - 10, 1));
});
add(`<text x="277" y="440" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="19" letter-spacing="3" fill="#f6f1e6" opacity=".7">PAY WITH MINNOWS</text>`);

// ── the kitchen's pass, right: the grill behind it ──
add(`<rect x="1090" y="300" width="486" height="408" rx="20" fill="#3a1a0a" opacity=".3" filter="${blur(12)}" transform="translate(8 12)"/>`);
add(`<rect x="1082" y="288" width="486" height="408" rx="20" fill="${lin(1082, 288, 1568, 696, [[0, '#f4f6f7'], [0.35, '#c3c9ce'], [0.7, '#9aa2a8'], [1, '#d7dcdf']])}"/>`);
add(`<rect x="1100" y="306" width="450" height="374" rx="10" fill="${lin(0, 306, 0, 680, [[0, '#7a4b33'], [0.6, '#5a3524'], [1, '#3a2216']])}"/>`);
// its back wall: steel tiles, the hood, the grill's glow
const ktile = id('t');
defs.push(`<pattern id="${ktile}" width="44" height="44" patternUnits="userSpaceOnUse" x="1100" y="380"><rect width="44" height="44" fill="#5b5450"/><rect x="2" y="2" width="40" height="40" rx="3" fill="#6e6762"/></pattern>`);
add(`<rect x="1100" y="380" width="450" height="210" fill="url(#${ktile})" opacity=".55"/>`);
add(`<rect x="1110" y="452" width="430" height="8" rx="2" fill="${lin(0, 452, 0, 460, [[0, '#e3e7ea'], [1, '#8b939a']])}"/>`);
for (let i = 0; i < 5; i++) add(`<ellipse cx="1170" cy="${448 - i * 6}" rx="34" ry="6" fill="#f7f4ee" stroke="#c9c2b8" stroke-width="1.5"/>`);
for (const [x, c] of [[1248, '#d8342a'], [1286, '#3aa39a'], [1324, '#f2b632']]) add(`<path d="M${x - 14},420 L${x + 14},420 L${x + 11},452 L${x - 11},452Z" fill="${c}"/><path d="M${x + 13},428 q12,2 0,16" stroke="${c}" stroke-width="4" fill="none"/>`);
for (let i = 0; i < 4; i++) add(`<ellipse cx="${1420 + i * 8}" cy="${432 - i * 2}" rx="7" ry="20" fill="#e9f3f7" opacity=".75" transform="rotate(${-8 + i * 5} ${1420 + i * 8} 440)"/>`);
add(`<polygon points="1170,380 1480,380 1540,600 1110,600" fill="${lin(0, 380, 0, 600, [[0, '#ffd28a', 0.32], [1, '#ffd28a', 0]])}"/>`);
add(`<polygon points="1118,306 1532,306 1500,372 1150,372" fill="${lin(0, 306, 0, 372, [[0, '#d5dadd'], [1, '#8d959b']])}"/><rect x="1150" y="372" width="350" height="8" fill="#2b2522"/><rect x="1160" y="378" width="330" height="7" fill="#ffe2a8" opacity=".95" filter="${blur(3)}"/>`);
add(`<rect x="1100" y="306" width="450" height="374" fill="${rad(1325, 610, 300, [[0, '#ff9a4a', 0.7], [0.5, '#ff7a30', 0.25], [1, '#ff7a30', 0]])}"/>`);
// ticket rail and its orders
add(`<rect x="1112" y="318" width="426" height="10" rx="4" fill="${lin(0, 318, 0, 328, [[0, '#eef1f3'], [1, '#8c949a']])}"/>`);
for (const [x, r] of [[1160, -4], [1236, 3], [1420, -2]]) {
  add(`<g transform="rotate(${r} ${x + 22} 324)"><rect x="${x}" y="324" width="44" height="62" rx="2" fill="#fbf8f0"/><rect x="${x + 6}" y="332" width="32" height="4" fill="#d8342a"/>${[344, 352, 360, 368].map((y, i) => `<rect x="${x + 6}" y="${y}" width="${[28, 22, 30, 16][i]}" height="2.6" fill="#8a8f96"/>`).join('')}</g>`);
}
// the flat-top: three patties, cheese on one, buns toasting
add(`<rect x="1112" y="582" width="426" height="52" rx="6" fill="${lin(0, 582, 0, 634, [[0, '#5a5a62'], [1, '#2e2e33']])}"/>`);
add(`<rect x="1106" y="626" width="438" height="34" rx="5" fill="${lin(0, 626, 0, 660, [[0, '#e7eaec'], [0.5, '#a7aeb3'], [1, '#6f777c']])}"/>`);
for (const x of [1150, 1205, 1260, 1390, 1445, 1500]) add(`<circle cx="${x}" cy="644" r="8" fill="#1d1d21"/><circle cx="${x - 2}" cy="642" r="2.5" fill="#6d6d74"/>`);
for (const [x, y] of [[1196, 594], [1310, 598], [1424, 594]]) {
  add(`<ellipse cx="${x}" cy="${y}" rx="50" ry="15" fill="${rad(x - 10, y - 4, 56, [[0, '#9a5630'], [0.7, '#5e2c14'], [1, '#3e1c0c']])}"/><path d="M${x - 30},${y - 4} q15,-6 30,-2 M${x - 8},${y + 4} q16,-6 30,-2" stroke="#c07a45" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`);
}
add(`<path d="M1272,590 L1348,586 L1354,600 L1344,614 L1334,602 L1318,610 L1302,600 L1288,610 L1276,598Z" fill="#ffc83a"/><path d="M1276,590 L1346,587" stroke="#fff0a0" stroke-width="3" opacity=".8"/>`);
for (const x of [1490, 1520]) add(`<ellipse cx="${x}" cy="598" rx="22" ry="9" fill="${lin(0, 589, 0, 607, [[0, '#f6c063'], [1, '#c9802a']])}"/>`);
// steam off the grill
for (const [x, k] of [[1196, 1], [1310, -1], [1424, 1]]) add(`<path d="M${x},578 C${x - 22 * k},540 ${x + 18 * k},506 ${x},466 C${x - 18 * k},430 ${x + 14 * k},404 ${x + 4 * k},372" stroke="#fff6ea" stroke-width="16" fill="none" stroke-linecap="round" opacity=".32" filter="${blur(8)}"/>`);
// the pass shelf: the bell and an order waiting in its basket
add(`<rect x="1090" y="668" width="470" height="30" rx="6" fill="${lin(0, 668, 0, 698, [[0, '#f5f7f8'], [0.4, '#c4cacf'], [1, '#7f878d']])}"/>`);
add(`<path d="M1116,670 C1116,644 1164,644 1164,670Z" fill="${lin(1116, 646, 1164, 670, [[0, '#fff5cf'], [0.5, '#e2b947'], [1, '#9c7420']])}"/><rect x="1110" y="668" width="60" height="6" rx="3" fill="#7a5a1a"/><circle cx="1140" cy="644" r="5" fill="#d9ac3a"/>`);
add(`<path d="M1432,668 L1418,632 L1528,632 L1514,668Z" fill="${lin(0, 632, 0, 668, [[0, '#e8453a'], [1, '#a8261e']])}"/>`);
for (let i = 0; i < 6; i++) add(`<rect x="${1430 + i * 14}" y="${612 + (i % 2) * 6}" width="9" height="${30 - (i % 3) * 4}" rx="3" fill="#ffcc3a" transform="rotate(${(i - 2.5) * 5} ${1434 + i * 14} 640)"/>`);
add(`<path d="M1482,632 C1482,604 1530,604 1530,632Z" fill="#e9a446"/><rect x="1480" y="624" width="52" height="6" fill="#6cc04a"/>`);

// ── a neon OPEN on the far right ──
add(`<g filter="${blur(8)}" opacity=".75"><rect x="1362" y="150" width="136" height="72" rx="14" fill="none" stroke="#ff3d6e" stroke-width="9"/><text x="1430" y="202" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="42" fill="none" stroke="#ff6a8e" stroke-width="8">OPEN</text></g>`);
add(`<rect x="1362" y="150" width="136" height="72" rx="14" fill="#2a0c12" fill-opacity=".25" stroke="#ff5a80" stroke-width="4.5"/><rect x="1362" y="150" width="136" height="72" rx="14" fill="none" stroke="#ffd9e2" stroke-width="1.5"/>`);
add(`<text x="1430" y="202" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="42" fill="none" stroke="#ff7a9a" stroke-width="4.5">OPEN</text><text x="1430" y="202" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="42" fill="none" stroke="#fff0f4" stroke-width="1.5">OPEN</text>`);

// ── warm light behind Iggy ──
add(`<rect width="${W}" height="${H}" fill="${rad(800, 300, 560, [[0, '#fff2d0', 0.85], [0.55, '#ffe2b0', 0.35], [1, '#ffe2b0', 0]])}"/>`);

// ── Iggy ──
const X = 800;
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => `${n1(2 * X - +x)},${y}`);
const TORSO = 'M724,398 C690,400 652,410 632,432 C612,452 606,482 604,522 L596,742 L1004,742 L996,522 C994,482 988,452 968,432 C948,410 910,400 876,398Z';
const HEAD = 'M800,152 C866,152 912,196 916,258 C920,318 900,368 860,388 C842,398 822,402 800,402 C778,402 758,398 740,388 C700,368 680,318 684,258 C688,196 734,152 800,152Z';
const CAP = 'M672,226 C684,184 724,138 800,112 C872,132 916,174 934,216 C902,206 862,198 800,200 C742,202 702,212 672,226Z';
const LIMBS = [
  [650, 455, 42, 590, 540, 33], [590, 540, 33, 579, 410, 27], // waving: upper arm, forearm
  [950, 455, 42, 1012, 585, 33], [1012, 585, 33, 1052, 500, 27], // spatula: upper arm, forearm
];
// his shadow on the wall
add(`<g fill="#3c1a08" opacity=".2" filter="${blur(16)}" transform="translate(30 18)"><path d="${TORSO}"/><path d="${HEAD}"/><path d="${CAP}"/>${LIMBS.map((l) => capsule(...l, { flat: '#3c1a08' })).join('')}<ellipse cx="577" cy="330" rx="56" ry="80"/></g>`);
// the torso in his white T-shirt
add(`<path d="${TORSO}" fill="${lin(596, 0, 1004, 0, [[0, '#d2c9bd'], [0.16, '#f2ede6'], [0.5, '#ffffff'], [0.84, '#efe9e1'], [1, '#cbc2b5']])}"/>`);
add(`<path d="M640,470 C660,520 668,600 664,700 M960,470 C940,520 932,600 936,700" stroke="#cfc6b9" stroke-width="5" fill="none" opacity=".6" stroke-linecap="round"/>`);
// arms (skin) under the sleeves
for (const l of LIMBS) add(capsule(...l, SKIN));
add(`<path d="M579,520 C585,506 596,500 606,502" stroke="#c47c55" stroke-width="3" fill="none" opacity=".5"/>`);
// sleeves with a rolled cuff
const sleeve = (x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  return capsule(x1, y1, 47, x2, y2, 42, SHIRT) + `<line x1="${n1(x2 + 40 * nx)}" y1="${n1(y2 + 40 * ny)}" x2="${n1(x2 - 40 * nx)}" y2="${n1(y2 - 40 * ny)}" stroke="${lin(x2 + 40 * nx, y2 + 40 * ny, x2 - 40 * nx, y2 - 40 * ny, [[0, '#ffffff'], [1, '#d6cdc1']])}" stroke-width="20" stroke-linecap="round"/><line x1="${n1(x2 + 38 * nx + dx / L * 9)}" y1="${n1(y2 + 38 * ny + dy / L * 9)}" x2="${n1(x2 - 38 * nx + dx / L * 9)}" y2="${n1(y2 - 38 * ny + dy / L * 9)}" stroke="#cfc5b8" stroke-width="3" stroke-linecap="round"/>`;
};
add(sleeve(652, 452, 616, 506));
add(sleeve(948, 452, 986, 512));
// the apron: straps, bib, emblem, pocket and pencil
add(`<path d="M748,462 L772,404 M852,462 L828,404" stroke="#a8261e" stroke-width="15" stroke-linecap="round"/>`);
add(`<path d="M740,458 L860,458 L876,600 C902,622 930,662 940,742 L660,742 C670,662 698,622 724,600Z" fill="${lin(0, 458, 0, 742, [[0, '#e8493c'], [0.55, '#cc3328'], [1, '#a8261e']])}"/>`);
add(`<path d="M740,458 L860,458 L876,600 C902,622 930,662 940,742 L660,742 C670,662 698,622 724,600Z" fill="${lin(660, 0, 940, 0, [[0, '#5a0c06', 0.35], [0.2, '#5a0c06', 0], [0.8, '#5a0c06', 0], [1, '#5a0c06', 0.35]])}"/>`);
add(`<path d="M748,468 L852,468 L866,594" stroke="#ffd0c8" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity=".6"/><path d="M748,468 L734,594" stroke="#ffd0c8" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity=".6"/>`);
add(`<circle cx="800" cy="526" r="33" fill="#fff8ec"/><circle cx="800" cy="526" r="33" fill="none" stroke="#f2d9b8" stroke-width="3"/><path d="M780,522 C780,500 820,500 820,522Z" fill="#e39a3c"/><rect x="778" y="522" width="44" height="5" rx="2.5" fill="#66b843"/><rect x="779" y="527" width="42" height="7" rx="3.5" fill="#6b3518"/><path d="M780,535 L820,535 C820,545 780,545 780,535Z" fill="#e39a3c"/>`);
add(`<g transform="rotate(10 826 600)"><rect x="820" y="566" width="11" height="52" rx="2" fill="#f6c431"/><rect x="820" y="562" width="11" height="9" rx="2" fill="#f08aa0"/></g>`);
add(`<rect x="764" y="598" width="74" height="56" rx="8" fill="#b52a21"/><path d="M768,606 L834,606" stroke="#ffd0c8" stroke-width="2.5" stroke-dasharray="6 5" opacity=".55"/>`);
// neck, collar, red neckerchief
add(`<path d="M756,350 L844,350 L848,414 C830,428 770,428 752,414Z" fill="${lin(0, 350, 0, 428, [[0, '#c47c55'], [0.45, '#e2a07a'], [1, '#eeb38c']])}"/>`);
add(`<path d="M742,402 C770,430 830,430 858,402 L870,414 C838,446 762,446 730,414Z" fill="#f6f2eb"/><path d="M742,402 C770,430 830,430 858,402" stroke="#d7cfc3" stroke-width="3" fill="none"/>`);
add(`<path d="M766,424 L834,424 L800,474Z" fill="${lin(0, 424, 0, 474, [[0, '#e3443a'], [1, '#b02a20']])}"/><ellipse cx="800" cy="426" rx="17" ry="11" fill="#c0302a"/><path d="M786,432 L774,450 M814,432 L826,450" stroke="#c0302a" stroke-width="9" stroke-linecap="round"/>`);
// ears, head, sideburns
add(`<ellipse cx="686" cy="276" rx="24" ry="35" fill="${lin(662, 0, 710, 0, [[0, '#d58a60'], [1, '#f2b088']])}" transform="rotate(-8 686 276)"/><path d="M682,258 C672,268 674,290 686,298" stroke="#b86e48" stroke-width="5" fill="none" stroke-linecap="round"/>`);
add(`<ellipse cx="914" cy="276" rx="24" ry="35" fill="${lin(890, 0, 938, 0, [[0, '#f2b088'], [1, '#d58a60']])}" transform="rotate(8 914 276)"/><path d="M918,258 C928,268 926,290 914,298" stroke="#b86e48" stroke-width="5" fill="none" stroke-linecap="round"/>`);
const face = rad(772, 248, 210, [[0, '#ffdcbf'], [0.42, '#f7be95'], [0.82, '#e59e74'], [1, '#d48b62']]);
add(`<path d="${HEAD}" fill="${face}"/>`);
add(`<path d="M698,320 C716,372 760,400 800,402 C840,400 884,372 902,320 C890,360 850,388 800,390 C750,388 710,360 698,320Z" fill="#a8623e" opacity=".22" filter="${blur(5)}"/>`);
const SIDEBURN = 'M689,214 C687,232 689,250 696,266 L708,262 C704,248 704,232 708,214Z';
add(`<path d="${SIDEBURN}" fill="${HAIR}"/><path d="${mirror(SIDEBURN)}" fill="${HAIR}"/>`);
// the paper cap: white, a red band, IGGY'S
add(`<path d="${CAP}" fill="${lin(700, 120, 900, 226, [[0, '#ffffff'], [0.6, '#f4efe7'], [1, '#ddd5c9']])}"/>`);
add(`<path d="M674,224 C702,212 742,202 800,200 C862,198 902,206 932,214 L928,195 C898,188 860,182 800,184 C740,186 700,196 678,206Z" fill="${lin(0, 184, 0, 224, [[0, '#e8463b'], [1, '#b72a20']])}"/>`);
add(`<path d="M800,116 C801,134 802,148 803,160" stroke="#d9d1c5" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M704,182 C744,166 860,160 912,184" stroke="#e6dfd4" stroke-width="3" fill="none" stroke-linecap="round"/>`);
add(`<text x="806" y="175" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="30" fill="#d8342a" transform="rotate(-3 806 175)">IGGY'S</text>`);
// brows
const BROW = 'M716,232 C724,208 752,196 786,203 C792,205 792,214 785,217 C760,211 740,216 728,236Z';
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

// ── string lights across the top ──
add(`<rect x="0" y="0" width="${W}" height="30" fill="${lin(0, 0, 0, 30, [[0, '#5a170f'], [1, '#7e2216']])}"/><rect x="0" y="30" width="${W}" height="4" fill="#3e0f09"/>`);
for (const [x0, x1, sag] of [[-40, 540, 52], [540, 1060, 52], [1060, 1640, 52]]) {
  const y = 34, cy = y + 2 * sag;
  add(`<path d="M${x0},${y} Q${(x0 + x1) / 2},${cy} ${x1},${y}" stroke="#2a1a12" stroke-width="3" fill="none"/>`);
  if (x0 > 0) add(`<circle cx="${x0}" cy="${y}" r="5" fill="#2a1a12"/>`);
  for (let i = 1; i < 10; i++) {
    const t = i / 10, bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1, by = y + 4 * t * (1 - t) * sag;
    add(`<circle cx="${n1(bx)}" cy="${n1(by + 16)}" r="34" fill="${rad(bx, by + 16, 34, [[0, '#ffd88a', 0.8], [0.4, '#ffc870', 0.3], [1, '#ffc870', 0]])}"/><rect x="${n1(bx - 4.5)}" y="${n1(by)}" width="9" height="9" rx="2" fill="#2a1a12"/><ellipse cx="${n1(bx)}" cy="${n1(by + 17)}" rx="8" ry="10.5" fill="#fff6d6"/><ellipse cx="${n1(bx - 2.5)}" cy="${n1(by + 13)}" rx="2.5" ry="3.5" fill="#ffffff"/>`);
  }
}

// ── the counter ──
add(`<rect x="0" y="706" width="${W}" height="16" fill="#5a2a10" opacity=".25" filter="${blur(6)}"/>`);
add(`<path d="M-10,712 L1610,712 L1610,764 L-10,764Z" fill="${lin(0, 712, 0, 764, [[0, '#f3e6cd'], [1, '#fff8ea']])}"/>`);
for (const [x, y, r, c] of [[120, 734, 0, '#d8342a'], [420, 742, 30, '#3aa39a'], [690, 730, -20, '#e8a33a'], [980, 744, 15, '#d8342a'], [1240, 732, -35, '#3aa39a'], [1480, 742, 25, '#e8a33a'], [260, 748, -10, '#e8a33a'], [1110, 726, 40, '#3aa39a']]) add(`<path d="M${x - 16},${y} q16,-10 32,0 q-16,4 -32,0Z" fill="${c}" opacity=".28" transform="rotate(${r} ${x} ${y})"/>`);
add(`<rect x="-10" y="760" width="1620" height="30" fill="${lin(0, 760, 0, 790, [[0, '#ffffff'], [0.3, '#d7dce0'], [0.65, '#8b939a'], [1, '#e3e7ea']])}"/>`);
add(`<rect x="-10" y="790" width="1620" height="276" fill="${lin(0, 790, 0, 1066, [[0, '#d63a2e'], [0.6, '#b52a21'], [1, '#8e1f18']])}"/>`);
for (let x = 0; x <= W; x += 266) add(`<rect x="${x - 6}" y="790" width="12" height="276" fill="${lin(x - 6, 0, x + 6, 0, [[0, '#8b939a'], [0.5, '#f4f6f7'], [1, '#8b939a']])}"/>`);
add(`<rect x="-10" y="790" width="1620" height="16" fill="#5a0c06" opacity=".3"/><rect x="-10" y="1030" width="1620" height="36" fill="#5a0c06" opacity=".35"/>`);
// on the counter, left (the grill stays in view on the right): the till, napkins, ketchup, mustard
add(`<ellipse cx="270" cy="720" rx="250" ry="10" fill="#5a2a10" opacity=".24" filter="${blur(5)}"/>`);
add(`<g transform="translate(-1262 0)"><path d="M1296,718 L1312,606 L1528,606 L1544,718Z" fill="${lin(1296, 0, 1544, 0, [[0, '#4a9c90'], [0.3, '#8fe0d2'], [0.7, '#6cc4b6'], [1, '#3f8a7f']])}"/>`);
add(`<path d="M1330,606 L1346,552 L1494,552 L1510,606Z" fill="${lin(0, 552, 0, 606, [[0, '#a9ece1'], [1, '#5fb5a8']])}"/><rect x="1360" y="560" width="120" height="34" rx="5" fill="#1d2925"/><text x="1416" y="586" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="24" fill="#9fdcff">20</text>${fishIcon(1454, 578, 0.75)}`);
for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) add(`<circle cx="${1346 + c * 30 + r * 4}" cy="${630 + r * 22}" r="8.5" fill="${lin(0, 622 + r * 22, 0, 638 + r * 22, [[0, '#ffffff'], [1, '#b7bec4']])}"/>`);
add(`<rect x="1300" y="698" width="240" height="20" rx="4" fill="${lin(0, 698, 0, 718, [[0, '#e9eef0'], [1, '#8b939a']])}"/></g>`);
add(`<g transform="translate(176 0)"><rect x="132" y="640" width="96" height="80" rx="10" fill="${lin(132, 0, 228, 0, [[0, '#9aa2a8'], [0.3, '#f3f5f6'], [0.7, '#c3c9ce'], [1, '#7f878d']])}"/><path d="M150,640 L166,612 L194,622 L210,640Z" fill="#fffdf8"/><rect x="148" y="670" width="64" height="22" rx="4" fill="#d8342a"/><text x="180" y="687" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="15" fill="#fff">IGGY'S</text></g>`);
add(`<g transform="translate(160 0)"><path d="M262,718 L262,640 C262,624 306,624 306,640 L306,718Z" fill="${lin(262, 0, 306, 0, [[0, '#9e1d14'], [0.35, '#e8453a'], [1, '#b2251b']])}"/><path d="M276,626 L284,594 L292,626Z" fill="#c5281e"/><rect x="262" y="664" width="44" height="22" fill="#fff6e6" opacity=".9"/><rect x="270" y="640" width="6" height="70" rx="3" fill="#fff" opacity=".35"/></g>`);
add(`<g transform="translate(152 0)"><path d="M322,718 L322,650 C322,634 366,634 366,650 L366,718Z" fill="${lin(322, 0, 366, 0, [[0, '#c99a12'], [0.35, '#ffd33d'], [1, '#d6a516']])}"/><path d="M336,636 L344,604 L352,636Z" fill="#e8b81e"/><rect x="322" y="672" width="44" height="22" fill="#fff6e6" opacity=".9"/><rect x="330" y="650" width="6" height="62" rx="3" fill="#fff" opacity=".4"/></g>`);

// ── light: warm from above, the corners darker, a little grain ──
add(`<rect width="${W}" height="${H}" fill="${lin(0, 0, 0, 520, [[0, '#ffb870', 0.16], [1, '#ffb870', 0]])}"/>`);
add(`<rect width="${W}" height="${H}" fill="${rad(800, 480, 1000, [[0.55, '#46180a', 0], [1, '#46180a', 0.55]])}"/>`);
const grain = id('g');
defs.push(`<filter id="${grain}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .4  0 0 0 0 .3  0 0 0 1.6 -.55"/></filter>`);
add(`<rect width="${W}" height="${H}" filter="url(#${grain})" opacity=".18"/>`);

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs.join('')}</defs>${out.join('\n')}</svg>\n`);
