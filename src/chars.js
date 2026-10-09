import * as THREE from 'three';
import { tex, std, phys, addRim, mats } from './materials.js';
import { damp, clamp } from './util.js';
import { sculptSkinned, bakeRigid, triplanarSkin, hairCardMaterial } from './sculpt.js';

// ───────────────────────── geometry helpers ─────────────────────────
const G = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  sphereLo: new THREE.SphereGeometry(1, 14, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  cone: new THREE.ConeGeometry(1, 1, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
};
const capCache = new Map();
function capsule(r, len) {
  const k = r.toFixed(3) + ':' + len.toFixed(3);
  if (!capCache.has(k)) capCache.set(k, new THREE.CapsuleGeometry(r, len, 8, 16));
  return capCache.get(k);
}
function add(parent, geo, mat, p = [0, 0, 0], s = 1, r = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(p[0], p[1], p[2]);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]);
  m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = shadow; m.receiveShadow = false;
  parent.add(m);
  return m;
}
function group(parent, p = [0, 0, 0], r = [0, 0, 0]) {
  const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); g.rotation.set(r[0], r[1], r[2]); parent.add(g); return g;
}
// Tapered hair lock along a gentle arc. Built pointing toward -x (flowing back).
const lockCache = new Map();
function lockGeo(len, thick, lift = 0.35, droop = 0.6) {
  const k = [len, thick, lift, droop].map((v) => v.toFixed(3)).join(':');
  if (lockCache.has(k)) return lockCache.get(k);
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push(new THREE.Vector3(-t * len, Math.sin(t * Math.PI * 0.7) * len * lift - droop * t * t * len, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubular = 12, radial = 6;
  const geo = new THREE.TubeGeometry(curve, tubular, thick, radial, false);
  const pos = geo.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular; curve.getPointAt(t, c);
    const taper = 1 - 0.88 * Math.pow(t, 1.4);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j; v.fromBufferAttribute(pos, idx);
      v.sub(c).multiplyScalar(taper).add(c); pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  lockCache.set(k, geo);
  return geo;
}
function eye(parent, p, r, irisColor = 0x1a1210) {
  const g = group(parent, p);
  add(g, G.sphere, eyeMat(irisColor), [0, 0, 0], r, [0, 0, 0], false);
  add(g, G.sphereLo, M.glint, [r * 0.45, r * 0.38, r * 0.55], r * 0.32, [0, 0, 0], false);
  add(g, G.sphereLo, M.glint, [r * 0.2, -r * 0.35, r * 0.75], r * 0.14, [0, 0, 0], false);
  return g;
}
const eyeMats = new Map();
function eyeMat(c) {
  if (!eyeMats.has(c)) eyeMats.set(c, new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
  return eyeMats.get(c);
}

// ───────────────────────── materials ─────────────────────────
export const M = {};
export function buildCharMaterials() {
  M.glint = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  M.skin = phys(0xffffff, { map: tex.skin, roughness: 0.46, extra: { sheen: 0.6, sheenColor: new THREE.Color(0x8a94a8), sheenRoughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.5 }, rimColor: 0xc8d6f0, rimStrength: 0.42, rimPower: 2.6 });
  { const lt = tex.skin.clone(); lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.repeat.set(0.18, 0.5); lt.needsUpdate = true;
    M.skinLimb = phys(0xffffff, { map: lt, roughness: 0.46, extra: { sheen: 0.6, sheenColor: new THREE.Color(0x8a94a8), sheenRoughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.5 }, rimColor: 0xc8d6f0, rimStrength: 0.42, rimPower: 2.6 }); }
  M.skinPink = phys(0x3b383d, { roughness: 0.5, rimStrength: 0.3 });
  M.tongue = phys(0xe88a96, { roughness: 0.35, extra: { clearcoat: 0.6 }, rimStrength: 0.2 });
  M.hair = phys(0xfbfaf7, { roughness: 0.7, extra: { sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.4 }, rimColor: 0xfff6e0, rimStrength: 0.5, rimPower: 2.0 });
  M.nose = phys(0x161214, { roughness: 0.25, extra: { clearcoat: 1, clearcoatRoughness: 0.1 }, rim: false });
  M.tabby = std(0xffffff, { map: tex.tabby, roughness: 0.75, rimColor: 0xffd59a, rimStrength: 0.45 });
  M.catWhite = std(0xfff3e4, { roughness: 0.8 });
  M.catPink = std(0xf2a0a8, { roughness: 0.6 });
  M.catOrange = std(0xe88a36, { roughness: 0.8, rimColor: 0xffd59a, rimStrength: 0.4 });
  M.foxEar = std(0x8e8780, { roughness: 0.85, rimColor: 0xf0e6dc, rimStrength: 0.4 });
  M.foxRust = std(0xb86a3a, { roughness: 0.85 });
  M.pigeon = std(0x8a93a6, { roughness: 0.7, rimColor: 0xdfe8ff });
  M.pigeonDark = std(0x5b6170, { roughness: 0.7 });
  M.pigeonNeck = phys(0x5a7d6a, { roughness: 0.35, extra: { iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600] }, rimColor: 0xb6ffd8, rimStrength: 0.6 });
  M.beak = std(0x3a3036, { roughness: 0.5 });
  M.orange = std(0xf2a33a, { roughness: 0.5 });
  M.red = std(0xe03a2f, { roughness: 0.5 });
  M.fox = std(0xe8662a, { roughness: 0.75, rimColor: 0xffc48a, rimStrength: 0.55 });
  M.foxWhite = std(0xfff6ea, { roughness: 0.8 });
  M.black = std(0x222024, { roughness: 0.7 });
  M.racGrey = std(0x8d8a86, { roughness: 0.85, rimColor: 0xe8e2d6 });
  M.racDark = std(0x2d2b2d, { roughness: 0.85 });
  M.racLight = std(0xe2ddd3, { roughness: 0.85 });
  M.chicken = std(0xfffbf2, { roughness: 0.8, rimColor: 0xfff2c8 });
  M.yellow = std(0xf7c72f, { roughness: 0.5 });
  M.furBlack = phys(0x1d1c20, { roughness: 0.7, extra: { sheen: 1, sheenColor: new THREE.Color(0x6a6a80), sheenRoughness: 0.6 }, rimColor: 0xbac4ff, rimStrength: 0.55 });
  M.furWhite = phys(0xf6f4ef, { roughness: 0.75, extra: { sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5 }, rimColor: 0xfff4dd, rimStrength: 0.5 });
  M.jSkin = phys(0xf3c9a8, { roughness: 0.5, extra: { sheen: 0.3, sheenColor: new THREE.Color(0xffc0a0) }, rimColor: 0xffe2c8, rimStrength: 0.4 });
  M.jBlack = phys(0x1e1e22, { roughness: 0.75, extra: { sheen: 0.6, sheenColor: new THREE.Color(0x55556a), sheenRoughness: 0.6 }, rimColor: 0xc8ccff, rimStrength: 0.5 });
  M.jHair = phys(0x3a2820, { roughness: 0.45, extra: { sheen: 1, sheenColor: new THREE.Color(0xa0765a), sheenRoughness: 0.35 }, rimColor: 0xffd2a8, rimStrength: 0.55, rimPower: 2.2 });
  M.jHairHi = phys(0x5a4030, { roughness: 0.45, extra: { sheen: 1, sheenColor: new THREE.Color(0xc0906a), sheenRoughness: 0.35 }, rimColor: 0xffd2a8, rimStrength: 0.5 });
  M.jPants = phys(0x2c2e34, { roughness: 0.8, extra: { sheen: 0.4, sheenColor: new THREE.Color(0x5a5e6a) }, rimColor: 0xc8ccff, rimStrength: 0.4 });
  M.jCoat = phys(0x17171a, { roughness: 0.7, extra: { sheen: 0.7, sheenColor: new THREE.Color(0x4a4a58), sheenRoughness: 0.5 }, rimColor: 0xc8ccff, rimStrength: 0.55 });
  M.ink = phys(0x2a3038, { roughness: 0.5, rim: false });
  M.sclera = phys(0xfbf8f4, { roughness: 0.25, extra: { clearcoat: 1 }, rim: false });
  { // tattooed skin (neck + hands): skin tone with blue-grey / teal linework
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#f0c7a8'; g.fillRect(0, 0, 256, 128);
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = Math.random() < 0.25 ? 'rgba(70,140,140,0.75)' : 'rgba(50,62,78,0.8)'; g.lineWidth = 1.5 + Math.random() * 3;
      const x = Math.random() * 256, y = Math.random() * 128, r = 6 + Math.random() * 16;
      g.beginPath(); g.arc(x, y, r, Math.random() * 6, Math.random() * 6 + 3); g.stroke();
    }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(70,140,140,0.55)'; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 128, 5 + Math.random() * 7, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    M.jTat = phys(0xffffff, { map: t, roughness: 0.5, extra: { sheen: 0.3, sheenColor: new THREE.Color(0xffc0a0) }, rimColor: 0xffe2c8, rimStrength: 0.4 });
  }
  M.beanie = phys(0xe2a618, { roughness: 0.88, extra: { sheen: 1, sheenColor: new THREE.Color(0xffe08a), sheenRoughness: 0.7 }, rimColor: 0xfff0c0, rimStrength: 0.45 });
  M.blush = new THREE.MeshBasicMaterial({ color: 0xff8f8f, transparent: true, opacity: 0.45, depthWrite: false });
  M.wing = phys(0xffffff, { roughness: 0.3, extra: { sheen: 1, sheenColor: new THREE.Color(0xbfe6ff), transmission: 0 }, rimColor: 0xbfe6ff, rimStrength: 0.9, rimPower: 1.6 });
  M.wing.transparent = true; M.wing.opacity = 0.92; M.wing.side = THREE.DoubleSide;
  M.ice = new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1, emissive: 0x4fb6ff, emissiveIntensity: 0.25, depthWrite: false });
}

// shared blob shadow for all characters
const blobGeo = new THREE.PlaneGeometry(1, 1);
export function blobShadow(size) {
  const m = new THREE.Mesh(blobGeo, mats.blob);
  m.rotation.x = -Math.PI / 2; m.scale.set(size, size * 0.6, 1); m.position.y = 0.012; m.renderOrder = 1;
  return m;
}

// Smooth facing turn that swings through the camera (3/4 view bias)
function faceAngle(facing) { return facing > 0 ? -0.28 : -Math.PI + 0.28; }

// ───────────────────────── sculpting helpers ─────────────────────────
// Average normals across duplicated seam vertices so deformed spheres stay smooth
function smoothNormals(g) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, map = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(i);
  }
  const v = new THREE.Vector3();
  for (const ids of map.values()) {
    if (ids.length < 2) continue;
    v.set(0, 0, 0);
    for (const i of ids) v.x += n.getX(i), v.y += n.getY(i), v.z += n.getZ(i);
    v.normalize();
    for (const i of ids) n.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}
function sculpt(fn, ws = 40, hs = 28) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  return smoothNormals(g);
}
// Tapered limb (lathe) hanging down from the origin
const taperCache = new Map();
function taper(r1, r2, len) {
  const k = [r1, r2, len].join(':');
  if (taperCache.has(k)) return taperCache.get(k);
  const pts = [];
  for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 - (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r1), Math.sin(a) * r1)); }
  for (let i = 1; i <= 4; i++) { const t = i / 5; pts.push(new THREE.Vector2(r1 + (r2 - r1) * t + Math.sin(t * Math.PI) * r1 * 0.08, -len * t)); }
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r2), -len - Math.sin(a) * r2)); }
  pts.reverse();
  const g = new THREE.LatheGeometry(pts, 18);
  taperCache.set(k, g);
  return g;
}
// Silky hair ribbon: a bent, tapering strip with a strand texture
function ribbon(len, w0, lift, droop, twist = 0, seg = 10, curl = 0) {
  const pos = [], uv = [], idx = [];
  const c = new THREE.Vector3(), cn = new THREE.Vector3(), t = new THREE.Vector3(), s = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  const P = (u, out) => out.set(-u * len, Math.sin(u * Math.PI * 0.75) * len * lift - droop * u * u * len, curl * Math.sin(u * Math.PI) * len * 0.3);
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    P(u, c); P(Math.min(1, u + 0.01), cn); if (u >= 1) { P(0.99, cn); t.subVectors(c, cn); } else t.subVectors(cn, c);
    t.normalize();
    s.crossVectors(t, Z).normalize().applyAxisAngle(t, twist);
    const w = w0 * (1 - 0.75 * Math.pow(u, 1.3)) * (0.6 + 0.4 * Math.sin(Math.min(1, u * 4) * Math.PI / 2));
    pos.push(c.x + s.x * w, c.y + s.y * w, c.z + s.z * w, c.x - s.x * w, c.y - s.y * w, c.z - s.z * w);
    uv.push(0, 1 - u, 1, 1 - u);
    if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function hairTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 256);
  for (let i = 0; i < 150; i++) {
    const x = 4 + Math.random() * 120, w = 1 + Math.random() * 2.4;
    const end = 150 + Math.random() * 106;
    const grd = g.createLinearGradient(0, 0, 0, end);
    const b = 236 + Math.floor(Math.random() * 20);
    grd.addColorStop(0, `rgba(${b},${b - 2},${b - 6},1)`); grd.addColorStop(0.75, `rgba(255,252,246,0.95)`); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = grd; g.lineWidth = w; g.beginPath(); g.moveTo(x, 0);
    g.bezierCurveTo(x + (Math.random() - 0.5) * 10, end * 0.4, x + (Math.random() - 0.5) * 16, end * 0.7, x + (Math.random() - 0.5) * 20, end); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function pbHairTexture() {
  // clumped silky strands: soft tapered alpha, greyer roots, a satin highlight band
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 512);
  const clumps = Array.from({ length: 9 }, (_, i) => 18 + i * 27 + (Math.random() - 0.5) * 10);
  for (let i = 0; i < 420; i++) {
    const cx = clumps[i % clumps.length];
    const edge = Math.abs(cx - 128) / 128;
    const x = cx + (Math.random() - 0.5) * 30, w = 0.8 + Math.random() * 2.2;
    const end = (300 + Math.random() * 212) * (1 - edge * 0.25);
    const grd = g.createLinearGradient(0, 0, 0, end);
    const b = 228 + Math.floor(Math.random() * 27);
    grd.addColorStop(0, `rgba(${b - 26},${b - 26},${b - 22},1)`);
    grd.addColorStop(0.22, `rgba(${b},${b},${b - 3},1)`);
    grd.addColorStop(0.32, 'rgba(255,255,255,1)');
    grd.addColorStop(0.42, `rgba(${b},${b - 1},${b - 5},1)`);
    grd.addColorStop(0.8, `rgba(${b},${b - 2},${b - 6},0.9)`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = grd; g.lineWidth = w; g.beginPath(); g.moveTo(x, 0);
    const sway = (Math.random() - 0.5);
    g.bezierCurveTo(x + sway * 10, end * 0.35, x + sway * 26, end * 0.7, x + (cx - 128) * 0.12 + sway * 30, end); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function fresnelMat(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { color: { value: new THREE.Color(color) }, op: { value: 0 }, time: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 color; uniform float op; uniform float time; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.2); float flick = 0.85 + 0.15*sin(time*14.0 + vN.y*8.0); gl_FragColor = vec4(color * f * 1.6 * flick, f * op); }',
  });
}

// ───────────────────────── MR PEABODY ─────────────────────────
export function makePeabody() {
  const root = new THREE.Group();
  const yaw = group(root);
  const body = group(yaw);
  const hips = group(body, [-0.2, 0.5, 0]);
  const front = group(hips, [0.2, 0, 0]);
  // ── materials: one continuous triplanar skin + volumetric white hair cards ──
  if (!M.pbSkin) {
    M.pbSkin = triplanarSkin(tex.pbSkin, { scale: 1.6, roughness: 0.58, sheen: 0.3, sheenColor: new THREE.Color(0x7d8496), sheenRoughness: 0.55, clearcoat: 0.08, clearcoatRoughness: 0.6, rimColor: 0xc8d6f0, rimStrength: 0.3, rimPower: 2.8 });
    M.pbHair = hairCardMaterial(pbHairTexture(), { color: 0xffffff, roughness: 0.48, rimColor: 0xfff8ee, rimStrength: 0.38, rimPower: 1.8 });
  }
  const cards = []; // rigid hair cards baked into one skinned mesh after the rig is built
  const C = (owner, centerObj, centerOff) => ({ owner, centerObj, centerOff });
  function lock(parent, len, w, lift, droop, twist, curl, center, cross = true) {
    cards.push({ mesh: add(parent, ribbon(len, w, lift, droop, twist, 10, curl), M.pbHair, [0, 0, 0], 1, [0, 0, 0], false), ...center });
    if (cross) cards.push({ mesh: add(parent, ribbon(len * 0.92, w * 0.72, lift, droop, twist + Math.PI / 2, 10, curl), M.pbHair, [0, 0, 0], 1, [0, 0, 0], false), ...center });
  }

  // ── rig bones (groups) ──
  const neck = group(front, [0.26, 0.08, 0]);
  const head = group(neck, [0.12, 0.25, 0]);
  const jaw = group(head, [0.06, -0.06, 0]);
  const nose = add(head, G.sphere, M.nose, [0.217, -0.024, 0], [0.024, 0.02, 0.027], [0, 0, -0.2]);
  // tongue (lolls out when running / happy)
  const tongue = group(jaw, [0.09, 0.012, 0.016], [0.25, 0, -0.85]);
  add(tongue, G.sphere, M.tongue, [0.035, 0, 0], [0.045, 0.008, 0.021], [0, 0, 0], false);
  tongue.scale.setScalar(0.001);
  // big glossy eyes
  const eyes = [];
  for (const s of [1, -1]) {
    const e = group(head, [0.07, 0.033, 0.058 * s], [0, 0.35 * s, 0]);
    add(e, G.sphere, eyeMat(0x3a2412), [0, 0, 0], [0.034, 0.035, 0.026], [0, 0, 0], false);
    add(e, G.sphereLo, eyeMat(0x050304), [0.01, 0, 0.007 * s], [0.021, 0.024, 0.02], [0, 0, 0], false);
    add(e, G.sphereLo, M.glint, [0.02, 0.014, 0.016 * s], 0.009, [0, 0, 0], false);
    add(e, G.sphereLo, M.glint, [0.025, -0.011, 0.01 * s], 0.0045, [0, 0, 0], false);
    eyes.push(e);
  }
  // big bat ears with flowing fringe
  const ears = [];
  const earGeo = sculpt((v) => { v.y = (v.y + 1) * 0.5; const k = v.y; v.x *= 1 - k * 0.75; v.z *= (1 - k * 0.6) * 0.25; v.x -= k * k * 0.25; });
  const headC = C(null, head, [0.0, 0.0, 0]);
  for (const s of [1, -1]) {
    const ear = group(head, [-0.04, 0.085, 0.066 * s], [0.42 * s, 0, 0.12]);
    add(ear, earGeo, M.skin, [0, 0, 0], [0.085, 0.28, 0.085]);
    add(ear, earGeo, M.skinPink, [0.008, 0.02, 0.012 * s], [0.06, 0.22, 0.06]);
    const fr = group(ear, [-0.03, 0.2, 0]);
    for (let i = 0; i < 8; i++) {
      // ear furnishings: short wisps that fall down off the ear edge (gravity), not streaming backward
      const pv = group(fr, [0.01, 0.05 - i * 0.036, 0.012 * s], [0, s * 0.35, 0.95 + i * 0.07]);
      lock(pv, 0.09 + i * 0.012, 0.028, 0.04, 0.6, i * 0.5, 0, C(fr, ear, [0, 0.1, 0]), i % 2 === 0);
    }
    ears.push(ear);
  }
  // crest: crown mass, long mane down the neck, side curtains, bangs, chin beard
  const crestRoot = group(head, [-0.02, 0.1, 0]);
  const crest = [];
  const hairCard = (px, py, pz, rx, rz, len, w, lift, droop, twist, curl = 0, t = 0.5, center = headC, host = crestRoot) => {
    const pivot = group(host, [px, py, pz], [rx, 0, rz]);
    lock(pivot, len, w, lift, droop, twist, curl, center);
    crest.push({ pivot, t, base: pivot.rotation.z, baseX: pivot.rotation.x, ph: Math.random() * 6 });
  };
  const neckC = C(null, neck, [0.03, 0.08, 0]);
  // short crown tufts that give the top of the head volume
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    hairCard(0.02 * Math.cos(a), 0.0, 0.05 * Math.sin(a), Math.sin(a) * 0.9, 1.45 + Math.cos(a) * 0.25, 0.1 + Math.random() * 0.03, 0.045, 0.3, 0.7, a, 0, 0.1);
  }
  const N = 30;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), side = (i % 3) - 1;
    const px = 0.06 - t * 0.3, py = 0.03 - t * t * 0.2;
    // mane hangs straight down from the crest like a person's hair (gravity), not streaming back
    const len = 0.24 + Math.sin(t * Math.PI) * 0.1 + Math.random() * 0.05;
    hairCard(px, py, side * 0.055 + (Math.random() - 0.5) * 0.02, side * 0.28, 1.42 + t * 0.12 + (Math.random() - 0.5) * 0.1, len, 0.05 + (1 - t) * 0.02, 0.08, 0.35, (Math.random() - 0.5) * 0.8 + side * 0.5, side * 0.35, t, t > 0.45 ? neckC : headC);
  }
  for (const s of [1, -1]) {
    for (let i = 0; i < 10; i++) {
      const k = i / 9;
      hairCard(0.02 - k * 0.12, 0.02 - k * 0.02, s * (0.07 + k * 0.012), s * (0.32 + k * 0.15), 1.75 - k * 0.35,
        0.34 + Math.random() * 0.12 + (1 - Math.abs(k - 0.4)) * 0.06, 0.05, 0.12, 0.35, s * 0.25 + (Math.random() - 0.5) * 0.6, s * 0.3, 0.6);
    }
  }
  for (let i = 0; i < 11; i++) {
    const z = (i - 5) * 0.017;
    hairCard(0.06, 0.03, z, z * 4, 2.25 + Math.random() * 0.25, 0.15 + Math.random() * 0.06, 0.03, 0.25, 0.8, (i - 5) * 0.22, 0, 0.2);
  }
  const beard = group(head, [0.13, -0.085, 0]);
  for (let i = 0; i < 8; i++) {
    const pivot = group(beard, [(i % 2) * -0.03, 0, (i - 3.5) * 0.014], [(i - 3.5) * 0.13, 0, 1.7 + Math.random() * 0.2]);
    lock(pivot, 0.11 + Math.random() * 0.05, 0.026, 0.1, 0.5, (i - 3.5) * 0.35, 0, headC);
    crest.push({ pivot, t: 0.2, base: pivot.rotation.z, baseX: pivot.rotation.x, ph: Math.random() * 6 });
  }
  // tail with plume
  const tail = group(front, [-0.34, 0.05, 0], [0, 0, 0.9]);
  const tail2 = group(tail, [0, 0.24, 0], [0, 0, -0.5]);
  const plume = [];
  for (let i = 0; i < 20; i++) {
    const host = i < 7 ? tail : tail2;
    // plume trails down and back behind him (gravity), like a long silky flag sweeping toward the floor
    const p = group(host, [0, (i < 7 ? 0.11 + i * 0.017 : (i - 7) * 0.012), (i % 3 - 1) * 0.012], [(i % 3 - 1) * 0.3, 0, i < 7 ? 0.18 + (i % 6) * 0.06 : 0.72 + (i % 6) * 0.06]);
    lock(p, i < 7 ? 0.24 + (i % 4) * 0.04 : 0.34 + (i % 4) * 0.05, 0.05, 0.1, 0.32, (i % 3 - 1) * 0.8, (i % 3 - 1) * 0.3, C(null, host, [0, i < 7 ? 0.12 : 0.04, 0]));
    plume.push({ p, base: p.rotation.z, ph: i * 0.6 });
  }
  // legs: bones only (the skin is sculpted below) + white socks and furnishings
  function leg(parent, p, hind) {
    const top = group(parent, p);
    const knee = group(top, [0, -0.2, 0]);
    const foot = group(knee, [0.015, -0.2, 0]);
    const pawY = hind ? -0.035 : -0.005;
    add(foot, G.sphere, M.hair, [0.022, pawY + 0.004, 0], [0.05, 0.03, 0.038]);
    const fc = C(foot, foot, [0.02, pawY + 0.03, 0]);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const pv = group(foot, [0.02 + Math.cos(a) * 0.012, pawY + 0.075 + (i % 2) * 0.02, Math.sin(a) * 0.012], [0, a, 1.32 + (i % 3) * 0.08]);
      cards.push({ mesh: add(pv, ribbon(0.085 + (i % 3) * 0.012, 0.032, 0.18, 1.2, (i % 4) * 0.5), M.pbHair, [0, 0, 0], 1, [0, 0, 0], false), ...fc });
    }
    const kc = C(knee, knee, [0, -0.1, 0]);
    for (let i = 0; i < 8; i++) {
      const pv = group(knee, [0, -0.06 - (i % 2) * 0.03, 0], [0, (i / 8) * Math.PI * 2, 1.45]);
      cards.push({ mesh: add(pv, ribbon(0.12 + Math.random() * 0.05, 0.03, 0.06, 0.6, i), M.pbHair, [0, 0, 0], 1, [0, 0, 0], false), ...kc });
    }
    return { top, knee, foot, hind };
  }
  const legs = {
    fl: leg(front, [0.17, -0.06, 0.075], false), fr: leg(front, [0.17, -0.06, -0.075], false),
    bl: leg(body, [-0.22, 0.47, 0.08], true), br: leg(body, [-0.22, 0.47, -0.08], true),
  };

  // ── sculpted body: one continuous surface, smoothly skinned to the rig ──
  const S = [
    { bone: front, ell: [0.13, -0.01, 0], r: [0.19, 0.14, 0.112], k: 0.05, tag: 'chest' },
    { bone: front, ell: [0.16, -0.085, 0], r: [0.11, 0.07, 0.075], k: 0.06, tag: 'belly' },
    { bone: front, cone: [0.06, 0.03, 0, -0.2, 0.035, 0], r: [0.1, 0.082], k: 0.08, tag: 'back' },
    { bone: front, ell: [0.19, 0.0, 0.055], r: [0.075, 0.11, 0.045], rot: [0, 0, 0.25], mirrorZ: true, k: 0.05, tag: 'shoulder' },
    { bone: hips, ell: [-0.04, 0.02, 0], r: [0.115, 0.098, 0.092], k: 0.07, tag: 'rump' },
    { bone: neck, cone: [-0.03, -0.05, 0, 0.1, 0.2, 0], r: [0.085, 0.05], k: 0.07, tag: 'neck' },
    { bone: head, ell: [-0.01, 0.02, 0], r: [0.1, 0.088, 0.078], k: 0.04, tag: 'skull' },
    { bone: head, cone: [0.05, -0.012, 0, 0.212, -0.036, 0], r: [0.058, 0.026], k: 0.05, tag: 'muzzle' },
    { bone: head, ell: [0.035, -0.035, 0.04], r: [0.055, 0.042, 0.035], mirrorZ: true, k: 0.04, tag: 'cheek' },
    { bone: head, ell: [0.064, 0.07, 0.056], r: [0.04, 0.016, 0.03], rot: [0, 0, -0.15], mirrorZ: true, k: 0.025, tag: 'brow' },
    { bone: jaw, cone: [0, 0, 0, 0.125, 0.012, 0], r: [0.032, 0.018], k: 0.012, tag: 'jaw' },
    { bone: tail, cone: [0, -0.03, 0, 0, 0.23, 0], r: [0.03, 0.02], k: 0.04, tag: 'tail' },
    { bone: tail2, cone: [0, 0, 0, 0, 0.17, 0], r: [0.02, 0.013], k: 0.01, tag: 'tail' },
  ];
  for (const L of Object.values(legs)) {
    if (L.hind) {
      S.push({ bone: L.top, ell: [0.005, -0.06, 0], r: [0.085, 0.12, 0.055], k: 0.05, tag: 'thigh' });
      S.push({ bone: L.top, cone: [0, 0, 0, 0, -0.2, 0], r: [0.055, 0.034], k: 0.03, tag: 'leg' });
      S.push({ bone: L.knee, cone: [0, 0, 0, -0.03, -0.12, 0], r: [0.034, 0.024], k: 0.02, tag: 'leg' });
      S.push({ bone: L.knee, cone: [-0.03, -0.12, 0, 0.015, -0.2, 0], r: [0.024, 0.021], k: 0.02, tag: 'leg' });
      S.push({ bone: L.foot, cone: [0, 0, 0, 0.005, -0.03, 0], r: [0.021, 0.022], k: 0.02, tag: 'leg' });
      S.push({ bone: L.foot, ell: [0.02, -0.035, 0], r: [0.045, 0.026, 0.033], k: 0.025, tag: 'paw' });
    } else {
      S.push({ bone: L.top, ell: [0.0, -0.04, 0], r: [0.05, 0.09, 0.042], k: 0.03, tag: 'leg' });
      S.push({ bone: L.top, cone: [0, 0.03, 0, 0, -0.2, 0], r: [0.05, 0.03], k: 0.04, tag: 'leg' });
      S.push({ bone: L.knee, cone: [0, 0, 0, 0.015, -0.2, 0], r: [0.03, 0.021], k: 0.02, tag: 'leg' });
      S.push({ bone: L.foot, ell: [0.02, -0.005, 0], r: [0.045, 0.026, 0.033], k: 0.025, tag: 'paw' });
    }
  }
  const noise = (x, y, z) => 0.5 + 0.25 * Math.sin(x * 31 + y * 7) * Math.sin(y * 23 - z * 11) + 0.25 * Math.sin(z * 41 + x * 13);
  const skinMesh = sculptSkinned(root, S, M.pbSkin, {
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = noise(x, y, z);
      let c = 0.92 + n * 0.16;
      if (P.tag === 'muzzle' || P.tag === 'jaw') c *= 1.5;
      else if (P.tag === 'cheek') c *= 1.22;
      if ((P.tag === 'belly' || P.tag === 'chest') && ny < -0.55) { const k = Math.min(1, (-ny - 0.55) * 3) * 0.35; return [c * (1 + k * 1.1), c * (1 + k * 0.55), c * (1 + k * 0.6)]; }
      return [c, c, c * 1.02];
    },
  });
  // all hair cards → one skinned draw call with volumetric normals
  const _c = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const hairMesh = bakeRigid(root, cards.map((cd) => ({ mesh: cd.mesh, owner: cd.mesh.parent, center: cd.centerObj ? cd.centerObj.localToWorld(_c.set(...cd.centerOff)).clone() : null })), M.pbHair, true);
  // fairy wings for the flight power
  const wings = [];
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.bezierCurveTo(0.12, 0.25, 0.4, 0.35, 0.55, 0.22);
  wingShape.bezierCurveTo(0.42, 0.12, 0.38, 0.02, 0.45, -0.06); wingShape.bezierCurveTo(0.25, -0.02, 0.1, -0.05, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 16);
  wingGeo.rotateX(Math.PI / 2); wingGeo.rotateY(Math.PI);
  for (const s of [1, -1]) {
    const w = group(front, [0.02, 0.15, 0.06 * s]);
    const m = add(w, wingGeo, M.wing, [0, 0, 0], [1, 1, s], [0, 0, 0], false);
    w.visible = false; wings.push({ w, s });
  }
  // glowing aura shell (kick mode / Morty power)
  const auraMat = fresnelMat(0xff7a2f);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), auraMat);
  aura.scale.set(0.62, 0.55, 0.42); aura.position.y = 0.55; root.add(aura);
  const shadow = blobShadow(0.95); root.add(shadow);

  const st = { yaw: faceAngle(1), runPh: 0, blink: 0, nextBlink: 2, sq: 1, stance: 0, chop: 0, nap: 0, pee: 0, t: 0 };
  const allMats = [M.pbSkin, M.skin, M.hair, M.pbHair];

  function update(dt, s) {
    st.t += dt;
    const t = st.t;
    st.yaw = damp(st.yaw, faceAngle(s.facing), 12, dt);
    yaw.rotation.y = st.yaw;
    const spd = clamp(Math.abs(s.vx) / 6, 0, 1.6);
    st.runPh += dt * (6 + spd * 9) * (s.grounded ? 1 : 0.3);
    const ph = st.runPh;
    const run = s.grounded && spd > 0.08 && !s.napping ? Math.min(1, spd) : 0;
    st.stance = damp(st.stance, s.kickMode ? 1 : 0, 8, dt);
    st.nap = damp(st.nap, s.napping ? 1 : 0, 6, dt);
    st.pee = damp(st.pee, s.peeing ? 1 : 0, 14, dt);
    st.chop = s.attackT;

    let sy = 1;
    if (!s.grounded) sy = 1 + clamp(s.vy * 0.012, -0.1, 0.14);
    if (s.landT > 0) sy = 1 - s.landT * 0.22;
    st.sq = damp(st.sq, sy, 18, dt);
    const sxz = 1 / Math.sqrt(st.sq);
    body.scale.set(sxz, st.sq, sxz);

    // gallop: body pitches and bobs
    const pup = s.puppy ? run : 0;
    const bob = run * Math.abs(Math.sin(ph)) * (0.05 + pup * 0.13) + Math.sin(t * 2.2) * 0.006 * (1 - run);
    body.position.y = bob - st.nap * 0.26 + st.stance * 0.06;
    body.position.x = 0; body.position.z = 0; body.rotation.set(0, 0, 0);
    if (pup > 0) body.rotation.z = Math.cos(ph) * 0.2 * pup; // bounding puppy gallop: rocking-horse pitch
    let tuck = 0, paddle = 0;
    if (s.rollK >= 0) {
      // forward somersault around the torso centre
      const k = s.rollK, a = -(k * k * (3 - 2 * k)) * Math.PI * 2;
      const by = body.position.y + Math.sin(k * Math.PI) * 0.06, h = -0.42, cy = by - h;
      body.rotation.z = a; body.position.x = -h * Math.sin(a); body.position.y = cy + h * Math.cos(a);
      tuck = Math.sin(Math.min(1, k * 1.25) * Math.PI);
    }
    if (s.trickK >= 0) {
      // roll over: lie down, roll onto the back (paws paddling), and pop back up
      const k = s.trickK, lie = Math.sin(Math.min(1, k * 1.1) * Math.PI);
      const b = k < 0.18 ? 0 : k > 0.82 ? 1 : (k - 0.18) / 0.64;
      const ang = b * b * (3 - 2 * b) * Math.PI * 2;
      const by = body.position.y - lie * 0.24, h = -0.42, cy = by - h;
      body.rotation.x = ang; body.position.y = cy + h * Math.cos(ang); body.position.z = h * Math.sin(ang);
      tuck = lie * 0.7; paddle = Math.max(0, -Math.cos(ang)) * lie;
    }
    hips.rotation.z = st.stance * 1.15 + run * Math.sin(ph * 2) * 0.05 + (s.grounded ? 0 : clamp(s.vy * 0.025, -0.3, 0.3)) * (1 - st.stance) - st.nap * 0.05;
    hips.position.y = 0.5 + st.stance * 0.02;
    neck.rotation.z = -st.stance * 0.9 + st.nap * 0.6 - run * 0.12;
    head.rotation.z = -st.stance * 0.25 + st.nap * 0.45 + Math.sin(t * 1.3) * 0.04 * (1 - run) + run * Math.sin(ph * 2) * 0.05;
    head.rotation.y = Math.sin(t * 0.7) * 0.18 * (1 - run) * (1 - st.nap);
    { const tg = (run > 0.35 || s.happy) && s.barkT <= 0 ? 1 : 0.001; tongue.scale.setScalar(damp(tongue.scale.x, tg, 10, dt)); tongue.rotation.z = -0.85 - run * Math.abs(Math.sin(ph)) * 0.25; }
    jaw.rotation.z = (s.barkT > 0 ? -0.55 : 0) - run * 0.12 * Math.abs(Math.sin(ph * 0.5)) - (s.happy ? 0.12 : 0);

    const swing = run * (0.8 + pup * 0.35), air = s.grounded || tuck > 0 ? 0 : 1, fold = Math.max(st.nap, tuck), L = legs;
    const lo = 0.6 * (1 - pup * 0.85); // puppy run: front pair + back pair move together (bunny-hop gallop)
    L.fl.top.rotation.z = Math.sin(ph) * swing - air * 0.6 + fold * 1.35;
    L.fr.top.rotation.z = Math.sin(ph + lo) * swing - air * 0.45 + fold * 1.35;
    L.bl.top.rotation.z = Math.sin(ph + Math.PI) * swing + air * 0.7 - fold * 1.25;
    L.br.top.rotation.z = Math.sin(ph + Math.PI + lo) * swing + air * 0.55 - fold * 1.25;
    L.fl.knee.rotation.z = -Math.max(0, Math.cos(ph)) * swing * 1.0 - air * 0.6 - fold * 1.7;
    L.fr.knee.rotation.z = -Math.max(0, Math.cos(ph + lo)) * swing * 1.0 - air * 0.6 - fold * 1.7;
    L.bl.knee.rotation.z = Math.max(0, Math.cos(ph + Math.PI)) * swing * 1.0 + air * 0.7 + fold * 1.7;
    L.br.knee.rotation.z = Math.max(0, Math.cos(ph + Math.PI + lo)) * swing * 1.0 + air * 0.7 + fold * 1.7;
    if (st.stance > 0.01) {
      const k = st.stance;
      L.fl.top.rotation.z = L.fl.top.rotation.z * (1 - k) + k * (-1.25 + Math.sin(t * 6) * 0.12);
      L.fr.top.rotation.z = L.fr.top.rotation.z * (1 - k) + k * (-0.95 + Math.cos(t * 6) * 0.12);
      L.fl.knee.rotation.z = L.fl.knee.rotation.z * (1 - k) + k * 1.9;
      L.fr.knee.rotation.z = L.fr.knee.rotation.z * (1 - k) + k * 1.9;
      const walk = run * Math.sin(ph) * 0.55;
      L.bl.top.rotation.z = L.bl.top.rotation.z * (1 - k) + k * walk;
      L.br.top.rotation.z = L.br.top.rotation.z * (1 - k) - k * walk;
      L.bl.knee.rotation.z *= 1 - k; L.br.knee.rotation.z *= 1 - k;
    }
    if (s.fsk >= 0) {
      // FLYING SIDE KICK: body lays back, lead hind leg shoots out straight, trail leg + front paws tucked
      const k = s.fsk, ext = Math.min(1, k * 5) * (k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1);
      body.rotation.z += 0.42 * ext;
      hips.rotation.z = hips.rotation.z * (1 - ext) + 0.2 * ext;
      L.bl.top.rotation.z = 2.55 * ext; L.bl.knee.rotation.z = 0.0;
      L.br.top.rotation.z = 0.95 * ext; L.br.knee.rotation.z = 2.0 * ext;
      L.fl.top.rotation.z = 1.1 * ext; L.fl.knee.rotation.z = -1.9 * ext;
      L.fr.top.rotation.z = 0.95 * ext; L.fr.knee.rotation.z = -1.8 * ext;
      neck.rotation.z -= 0.55 * ext; head.rotation.z -= 0.2 * ext;
    } else if (st.chop > 0) {
      const a = st.chop, strike = Math.sin((1 - a) * Math.PI), v = s.atkVar || 0;
      if (s.kickMode) {
        if (v === 0) { L.bl.top.rotation.z = 1.75 * strike; L.bl.knee.rotation.z = 0.3 * (1 - strike); } // snap kick
        else if (v === 1) { // spinning roundhouse: full turn with the leg out
          const e = 1 - a, sp = e * e * (3 - 2 * e);
          yaw.rotation.y = st.yaw + sp * Math.PI * 2 * (s.facing || 1);
          L.br.top.rotation.z = 1.9 * strike; L.br.knee.rotation.z = 0.05; L.br.top.rotation.x = 0.5 * strike;
        } else if (v === 2) { // double kick: left then right
          const ph2 = (1 - a) * 2, leg = ph2 < 1 ? L.bl : L.br, e = Math.sin((ph2 % 1) * Math.PI);
          leg.top.rotation.z = 1.85 * e; leg.knee.rotation.z = 0.05;
        } else if (v === 3) { // high kick
          L.bl.top.rotation.z = 2.6 * strike; L.bl.knee.rotation.z = 0.0;
          hips.rotation.z += 0.32 * strike; neck.rotation.z -= 0.3 * strike;
        } else { // mule kick: drop onto the front paws and fire both hind legs backwards
          hips.rotation.z = hips.rotation.z * (1 - strike) - 0.3 * strike;
          L.bl.top.rotation.z = -1.75 * strike; L.br.top.rotation.z = -1.6 * strike; L.bl.knee.rotation.z = 0.0; L.br.knee.rotation.z = 0.0;
          L.fl.top.rotation.z = -0.2 * strike; L.fr.top.rotation.z = -0.15 * strike; L.fl.knee.rotation.z = 0; L.fr.knee.rotation.z = 0;
        }
      } else if (v === 2) { // uppercut: both front paws swing up
        for (const l of [L.fl, L.fr]) { l.top.rotation.z = -2.6 * strike + 0.2; l.knee.rotation.z = -0.15; }
        hips.rotation.z += 0.45 * strike; head.rotation.z -= 0.25 * strike; body.position.y += 0.08 * strike;
      } else {
        const l = v === 1 ? L.fl : L.fr;
        l.top.rotation.z = -2.3 * (a > 0.6 ? (1 - a) / 0.4 : a / 0.6) + 0.3;
        l.knee.rotation.z = -0.25;
        hips.rotation.z += 0.2 * strike; head.rotation.z -= 0.15 * strike;
      }
    }
    L.bl.top.rotation.x = st.pee * 1.1; L.bl.top.rotation.z -= st.pee * 0.4;
    if (paddle > 0) { let i = 0; for (const l of Object.values(L)) { l.top.rotation.z += Math.sin(t * 18 + i * 1.7) * 0.45 * paddle; l.knee.rotation.z *= 1 - paddle * 0.5; i++; } }
    if (tuck > 0) head.rotation.z += tuck * 0.45;
    if (s.toot > 0) { hips.rotation.z -= s.toot * 0.12; }

    const wag = (s.happy ? 1.4 : 0.7) + run * 0.4;
    tail.rotation.x = Math.sin(t * 9) * 0.35 * wag;
    tail.rotation.z = 0.9 + run * 0.25 - st.nap * 0.7 + Math.sin(t * 9) * 0.05 + (s.toot > 0 ? s.toot * 0.9 : 0);
    for (const pl of plume) pl.p.rotation.z = pl.base + Math.sin(t * 9 + pl.ph) * 0.08 - run * 0.18 - (s.toot > 0 ? s.toot * 0.6 : 0);

    const wind = clamp(Math.abs(s.vx) * 0.06 + (s.grounded ? 0 : 0.18) + st.stance * 0.1, 0, 0.65);
    for (const c of crest) {
      c.pivot.rotation.z = c.base - wind * (0.08 + c.t * 0.14) + Math.sin(t * 3 + c.ph) * 0.05 + (s.grounded ? 0 : s.vy * 0.008) * (0.5 + c.t) + run * Math.sin(ph * 2 + c.t * 3) * 0.07;
      c.pivot.rotation.x = c.baseX + Math.sin(t * 2.3 + c.ph) * 0.06;
    }
    for (let i = 0; i < 2; i++) ears[i].rotation.z = 0.12 + wind * 0.6 + Math.sin(t * 1.7 + i) * 0.03 + st.nap * 0.8 + (s.puppy ? Math.sin(ph * 1 + i) * 0.35 * run : 0);

    st.nextBlink -= dt;
    if (st.nextBlink < 0) { st.blink = 0.14; st.nextBlink = 2 + Math.random() * 3; }
    st.blink -= dt;
    const closed = s.napping ? 0.1 : (st.blink > 0 ? 0.15 : 1);
    for (const e of eyes) e.scale.y = damp(e.scale.y, closed, 30, dt);

    for (const w of wings) { w.w.visible = s.flying; if (s.flying) w.w.rotation.x = (Math.sin(t * 22) * 0.7 + 0.2) * w.s; }
    const auraOn = s.kickMode ? 0.55 : s.mortyPower ? 0.6 : 0;
    auraMat.uniforms.op.value = damp(auraMat.uniforms.op.value, auraOn, 10, dt);
    auraMat.uniforms.time.value = t;
    auraMat.uniforms.color.value.set(s.mortyPower ? 0xffe27a : 0xff6a2a);
    aura.visible = auraMat.uniforms.op.value > 0.01;
    aura.scale.set(0.56 - st.stance * 0.18, 0.46 + st.stance * 0.2, 0.36);
    aura.position.y = 0.55 + st.stance * 0.2;

    const blink = s.hurtFlash ? (Math.sin(t * 40) > 0 ? 1 : 0) : 0;
    for (const m of allMats) {
      const sh = m.userData.shader;
      if (sh) sh.uniforms.rimStrength.value = m.userData.rim.strength + blink * 1.4 + (s.mortyPower ? 0.5 + Math.sin(t * 12) * 0.3 : 0);
    }
    shadow.position.y = 0.012;
  }
  return { root, update, head, st };
}

// ───────────────────────── sculpted critter helpers ─────────────────────────
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const sat = (x) => Math.max(0, Math.min(1, x));
const fnoise = (x, y, z) => 0.5 + 0.25 * Math.sin(x * 57 + y * 13) * Math.sin(y * 41 - z * 19) + 0.25 * Math.sin(z * 67 + x * 23);
function localizer(root, bone) {
  root.updateMatrixWorld(true);
  const m = new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(root.matrixWorld), v = new THREE.Vector3();
  return (x, y, z) => v.set(x, y, z).applyMatrix4(m);
}
function critterMats() {
  if (M.critter) return;
  M.critter = triplanarSkin(tex.fur, { scale: 7, roughness: 0.82, sheen: 0.7, sheenColor: new THREE.Color(0xfff2e0), sheenRoughness: 0.5, rimColor: 0xfff0dc, rimStrength: 0.32, rimPower: 2.4 });
  M.feather = triplanarSkin(tex.fur, { scale: 9, roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color(0xd8e8ff), sheenRoughness: 0.4, clearcoat: 0.15, clearcoatRoughness: 0.5, iridescence: 0.5, iridescenceIOR: 1.5, iridescenceThicknessRange: [250, 550], rimColor: 0xdfe8ff, rimStrength: 0.35, rimPower: 2.4 });
}
let _whiskerGeo = null;
function whiskers(head, x, y, z, len = 0.11) {
  _whiskerGeo ||= new THREE.CylinderGeometry(0.0012, 0.0006, 1, 3).translate(0, 0.5, 0);
  for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(_whiskerGeo, M.whisker);
    w.position.set(x, y - i * 0.006, z * s); w.scale.set(1, len * (1 - i * 0.12), 1);
    w.rotation.set(s * (1.45 + i * 0.12), 0, -0.25 + i * 0.18);
    head.add(w);
  }
}

// ───────────────────────── CAT ─────────────────────────
// Every colour and type: tabbies, solids, tuxedo, calico, tortie, Siamese points, Russian blue,
// long-haired Persian / Maine Coon, and a hairless Sphynx (Peabody's cousin). Kittens and chonks too.
export const CAT_VARIANTS = [
  { id: 'orange', base: 0xf0953a, stripe: 0xb4561a, white: 'bib', eye: 0x4f9a2a },
  { id: 'greytabby', base: 0xa3a3a8, stripe: 0x4a4a52, white: 'bib', eye: 0x9ab82a },
  { id: 'browntabby', base: 0x8f6c49, stripe: 0x3a281a, white: 'bib', eye: 0x7aa02a },
  { id: 'black', base: 0x1e1c1e, white: 'none', eye: 0xe8c020, ear: 0x1e1c1e },
  { id: 'white', base: 0xfbf7f1, white: 'none', eye: 0x5aa0e8, ear: 0xfbf7f1 },
  { id: 'tux', base: 0x1f1d1f, white: 'tux', eye: 0x6fb02a, ear: 0x1f1d1f },
  { id: 'calico', base: 0xfbf5ec, white: 'calico', eye: 0xd09a20, ear: 0xe8862e },
  { id: 'tortie', base: 0x2a2220, white: 'tortie', eye: 0xd8a020, ear: 0x2a2220 },
  { id: 'siamese', base: 0xf1e3cc, white: 'points', point: 0x4a3426, eye: 0x4a90e8, ear: 0x4a3426 },
  { id: 'blue', base: 0x7d8796, white: 'none', eye: 0x5ab05a, ear: 0x7d8796 },
  { id: 'persian', base: 0xfbf7f1, white: 'none', eye: 0xe08a20, ear: 0xfbf7f1, long: true },
  { id: 'mainecoon', base: 0x8f8072, stripe: 0x3c3229, white: 'bib', eye: 0xb0a030, long: true },
  { id: 'calicolong', base: 0xfbf5ec, white: 'calico', eye: 0x6fb02a, ear: 0x2a2220, long: true },
  { id: 'sphynx', base: 0xdcaea6, white: 'sphynx', eye: 0x8ab83a, ear: 0xdcaea6, bigEars: true },
];
const _catEarMats = new Map();
export function makeCat(vi = 0) {
  critterMats(); M.whisker ||= std(0xfffaf0, { roughness: 0.5 });
  const V = CAT_VARIANTS[vi % CAT_VARIANTS.length], long = !!V.long;
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw, [0, 0.3, 0]);
  const head = group(body, [0.22, 0.12, 0]);
  const tail = group(body, [-0.22, 0.03, 0], [0, 0, 1.1]);
  const tail2 = group(tail, [0, 0.24, 0], [0, 0, -0.6]);
  const legs = [];
  for (const [x, z] of [[0.13, 0.07], [0.13, -0.07], [-0.13, 0.07], [-0.13, -0.07]]) legs.push(group(body, [x, -0.06, z]));
  const F = long ? 1.2 : 1, TF = long ? 1.9 : V.white === 'sphynx' ? 0.6 : 1;
  const S = [
    { bone: body, cone: [0.1, 0, 0, -0.15, 0.01, 0], r: [0.1 * F, 0.095 * F], k: 0.05, tag: 'torso' },
    { bone: body, ell: [0.12, -0.025, 0], r: [0.095 * F, 0.098 * F, 0.082 * F], k: 0.05, tag: 'chest' },
    { bone: body, ell: [-0.02, -0.035, 0], r: [0.14, 0.08 * F, 0.085 * F], k: 0.06, tag: 'belly' },
    { bone: body, ell: [-0.15, -0.02, 0.045], r: [0.075 * F, 0.092 * F, 0.048 * F], mirrorZ: true, k: 0.05, tag: 'torso' },
    { bone: body, ell: [0.13, 0.01, 0.048], r: [0.06 * F, 0.075 * F, 0.038 * F], mirrorZ: true, k: 0.05, tag: 'torso' },
    { bone: head, cone: [-0.04, -0.03, 0, -0.12, -0.1, 0], r: [0.07 * F, 0.08 * F], k: 0.05, tag: 'neck' },
    { bone: head, ell: [0, 0.005, 0], r: [0.098, 0.088, 0.1], k: 0.04, tag: 'head' },
    { bone: head, ell: [0.03, -0.03, 0.048], r: [0.065 * (long ? 1.25 : 1), 0.05 * (long ? 1.3 : 1), 0.05 * (long ? 1.3 : 1)], mirrorZ: true, k: 0.03, tag: 'cheek' },
    { bone: head, ell: [0.085, -0.035, 0], r: [0.045, 0.033, 0.05], k: 0.025, tag: 'muzzle' },
    { bone: head, ell: [0.065, -0.065, 0], r: [0.035, 0.02, 0.03], k: 0.02, tag: 'muzzle' },
    { bone: tail, cone: [0, 0, 0, 0, 0.245, 0], r: [0.038 * TF, 0.031 * TF], k: 0.035, tag: 'tail' },
    { bone: tail2, cone: [0, 0, 0, 0, 0.17, 0], r: [0.031 * TF, 0.024 * TF], k: 0.02, tag: 'tail' },
  ];
  if (long) S.push({ bone: head, ell: [-0.07, -0.09, 0], r: [0.085, 0.1, 0.12], k: 0.05, tag: 'ruff' }, { bone: body, ell: [-0.02, -0.09, 0], r: [0.16, 0.05, 0.09], k: 0.05, tag: 'belly' });
  legs.forEach((l, i) => {
    if (i >= 2) S.push({ bone: l, ell: [-0.01, -0.01, 0], r: [0.058 * F, 0.085, 0.04 * F], k: 0.04, tag: 'leg' });
    S.push({ bone: l, cone: [0, 0.03, 0, 0.01, -0.195, 0], r: [i < 2 ? 0.04 : 0.034, 0.027], k: 0.03, tag: 'leg' });
    S.push({ bone: l, ell: [0.018, -0.21, 0], r: [0.04, 0.022, 0.032], k: 0.02, tag: 'paw' });
  });
  const O = lin(V.base), D = V.stripe ? lin(V.stripe) : null, W = lin(0xfff3e6), Kb = lin(0x221d1c), Or = lin(0xe8862e), Pt = lin(V.point || 0x4a3426);
  const hl = localizer(root, head), tl = localizer(root, tail);
  const wh = V.white;
  sculptSkinned(root, S, M.critter, {
    step: 0.0072, sigma: 0.014, cacheKey: long ? 'catLong' : V.white === 'sphynx' ? 'catSphynx' : 'cat', colorKey: V.id,
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.88 + fnoise(x, y, z) * 0.24;
      let c = O, t = P.tag;
      if (wh === 'sphynx') { const wr = Math.sin(y * 120 + Math.sin(x * 40) * 2); return mul3(mix3(O, lin(0xb98a84), wr > 0.75 && (t === 'head' || t === 'neck') ? 0.6 : sat(fnoise(x * 2, y * 2, z * 2) - 0.55) * 1.4), n); }
      // white areas
      const bib = (t === 'muzzle' || t === 'paw' || (t === 'chest' && (nx > 0.25 || ny < -0.2)) || t === 'ruff' && nx > 0.1);
      const under = (t === 'belly' || t === 'torso' || t === 'chest') && ny < -0.45;
      if (wh === 'bib' || wh === 'tux') {
        if (bib || (wh === 'tux' && (t === 'leg' && y < 0.14))) return mul3(W, n);
        if (under) return mul3(mix3(O, W, sat((-ny - 0.45) * 4)), n);
        if (t === 'cheek' && ny < 0.1) c = mix3(O, W, sat((0.1 - ny) * 3));
        if (wh === 'tux' && t === 'head') { const L = hl(x, y, z); if (L.x > 0.04 && Math.abs(L.z) < 0.02 + (0.06 - L.y) * 0.3 && L.y < 0.03) return mul3(W, n); }
      }
      if (wh === 'calico') {
        const g = fnoise(x * 1.7 + 3, y * 1.7, z * 1.7);
        if (ny > -0.25 && t !== 'muzzle' && t !== 'paw') { if (g > 0.62) c = Or; else if (g < 0.36) c = Kb; else c = W; } else c = W;
        if (t === 'tail') c = fnoise(x * 4, y * 4, z * 4) > 0.5 ? Or : Kb;
        return mul3(c, n);
      }
      if (wh === 'tortie') {
        const g = fnoise(x * 3.2 + 7, y * 3.2, z * 3.2);
        c = g > 0.58 ? Or : g > 0.48 ? mix3(Or, Kb, 0.5) : Kb;
        if (t === 'muzzle' && nx > 0.5) c = mix3(Or, Kb, 0.3);
        return mul3(c, n);
      }
      if (wh === 'points') {
        let k = 0;
        if (t === 'muzzle' || t === 'paw' || t === 'tail') k = 1;
        else if (t === 'leg') k = sat((0.24 - y) * 7);
        else if (t === 'head' || t === 'cheek') { const L = hl(x, y, z); k = sat((L.x - 0.03) * 22) * 0.85; }
        return mul3(mix3(O, Pt, k), n);
      }
      // tabby stripes
      if (D) {
        if (t === 'torso' || t === 'belly' || t === 'neck' || t === 'ruff') { const s = Math.sin(x * 44 + Math.sin(z * 16) * 1.3 + y * 8); if (s > 0.35 && ny > -0.3) c = mix3(c, D, sat((s - 0.35) * 3)); }
        if (t === 'head') { const L = hl(x, y, z); if (L.y > 0.02 && L.x > -0.02) { const s = Math.sin(L.z * 80); if (s > 0.45) c = mix3(c, D, 0.8); } }
        if (t === 'tail') { const L = tl(x, y, z); const s = Math.sin((L.y + (P.bone === tail2 ? 0.25 : 0)) * 48); if (s > 0.2) c = mix3(c, D, 0.75); }
        if (t === 'leg') { const s = Math.sin(y * 70); if (s > 0.55 && nx < 0.4) c = mix3(c, D, 0.5); }
      }
      if (wh === 'none' && t === 'muzzle' && V.id === 'blue') c = mix3(O, W, 0.15);
      return mul3(c, n);
    },
  });
  const eyes = [eye(head, [0.077, 0.024, 0.058], 0.03, V.eye), eye(head, [0.077, 0.024, -0.058], 0.03, V.eye)];
  const noseC = V.id === 'black' || V.id === 'tux' || V.id === 'tortie' ? 0x3a2a2a : V.id === 'blue' ? 0x5a5a66 : V.id === 'siamese' ? 0x3a2a24 : 0xe8909a;
  add(head, G.sphere, std(noseC, { roughness: 0.5 }), [0.128, -0.016, 0], [0.016, 0.012, 0.019]);
  const earC = V.ear ?? V.base;
  if (!_catEarMats.has(earC)) _catEarMats.set(earC, std(earC, { roughness: 0.8, rimColor: 0xffe2b8, rimStrength: 0.4 }));
  const eS = V.bigEars ? 1.45 : 1;
  for (const s of [1, -1]) {
    add(head, G.cone, _catEarMats.get(earC), [-0.012, 0.1, 0.062 * s], [0.045 * eS, 0.085 * eS, 0.022], [0.32 * s, 0, 0.12]);
    add(head, G.cone, M.catPink, [-0.004, 0.096, 0.067 * s], [0.028 * eS, 0.06 * eS, 0.01], [0.32 * s, 0, 0.12]);
  }
  whiskers(head, 0.105, -0.03, 0.035);
  const ice = add(root, G.box, M.ice, [0, 0.36, 0], [0.85, 0.78, 0.6], [0, 0, 0], false);
  ice.visible = false;
  const shadow = blobShadow(0.75); root.add(shadow);
  // size: kittens, regular cats and the odd chonk
  const sizeMul = [0.78, 0.92, 1, 1, 1.06, 1.16][Math.floor(Math.random() * 6)] * (long ? 1.06 : 1);
  const st = { yaw: 0, ph: Math.random() * 6, t: Math.random() * 10, spin: 0 };
  function update(dt, e) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(e.dir), 8, dt); yaw.rotation.y = st.yaw;
    if (e.frozen) { ice.visible = true; ice.rotation.y = 0.2; return; }
    ice.visible = false;
    st.ph += dt * 10;
    const s = Math.sin(st.ph);
    legs[0].rotation.z = s * 0.55; legs[3].rotation.z = s * 0.55;
    legs[1].rotation.z = -s * 0.55; legs[2].rotation.z = -s * 0.55;
    body.position.y = 0.3 + Math.abs(s) * 0.015;
    body.rotation.z = Math.sin(st.ph * 2) * 0.03;
    tail.rotation.x = Math.sin(st.t * 3) * 0.3;
    tail2.rotation.z = -0.6 + Math.sin(st.t * 4) * 0.25;
    head.rotation.z = Math.sin(st.t * 2) * 0.05 + (e.alert ? -0.15 : 0) - body.rotation.z;
    if (!e.alive) { root.rotation.z += dt * 14 * e.spinDir; } else root.rotation.z = 0;
    shadow.visible = e.alive;
  }
  return { root, update, sizeMul };
}

// ───────────────────────── PIGEON ─────────────────────────
export function makePigeon() {
  critterMats();
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw);
  const head = group(body, [0.15, 0.15, 0]);
  const wings = [];
  for (const s of [1, -1]) wings.push({ w: group(body, [0.02, 0.05, 0.08 * s]), s });
  const S = [
    { bone: body, ell: [-0.01, 0, 0], r: [0.16, 0.115, 0.105], rot: [0, 0, 0.15], k: 0.05, tag: 'body' },
    { bone: body, ell: [0.07, -0.005, 0], r: [0.1, 0.11, 0.098], k: 0.05, tag: 'breast' },
    { bone: body, ell: [-0.235, 0.02, 0], r: [0.11, 0.024, 0.07], rot: [0, 0, 0.18], k: 0.045, tag: 'tail' },
    { bone: head, cone: [-0.02, -0.03, 0, -0.08, -0.12, 0], r: [0.05, 0.075], k: 0.04, tag: 'neck' },
    { bone: head, ell: [0, 0, 0], r: [0.064, 0.06, 0.058], k: 0.03, tag: 'head' },
    { bone: head, ell: [0.055, 0.004, 0], r: [0.018, 0.015, 0.017], k: 0.01, tag: 'cere' },
  ];
  for (const { w, s } of wings) {
    S.push({ bone: w, ell: [-0.03, 0.005, 0.07 * s], r: [0.1, 0.032, 0.085], rot: [0, 0.3 * s, 0.08], k: 0.035, tag: 'wing' });
    S.push({ bone: w, ell: [-0.07, -0.004, 0.16 * s], r: [0.075, 0.016, 0.075], rot: [0, 0.55 * s, 0.05], k: 0.03, tag: 'wingtip' });
  }
  const B = lin(0x8b95a8), Dk = lin(0x50566a), Bar = lin(0x2f333e), G1 = lin(0x3f8a66), P1 = lin(0x8a5a9a), Wc = lin(0xeceff4);
  const hl = localizer(root, head);
  sculptSkinned(root, S, M.feather, {
    step: 0.0068, sigma: 0.012, cacheKey: 'pigeon',
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.9 + fnoise(x, y, z) * 0.2; const t = P.tag;
      if (t === 'cere') return mul3(Wc, n);
      if (t === 'head') return mul3(Dk, n);
      if (t === 'neck') { const L = hl(x, y, z); const k = sat((-L.y - 0.02) * 12); return mul3(mix3(Dk, mix3(G1, P1, 0.5 + 0.5 * Math.sin(z * 60 + y * 30)), k), n); }
      if (t === 'tail') return mul3(x < -0.32 ? Bar : B, n);
      if (t === 'wingtip') return mul3(mix3(Dk, Bar, 0.4), n);
      if (t === 'wing') { if (ny > -0.2 && ((x < -0.06 && x > -0.09) || (x < -0.13 && x > -0.16))) return mul3(Bar, n); if (x < -0.17) return mul3(Dk, n); return mul3(mix3(B, lin(0xa9b2c3), 0.3), n); }
      if (t === 'breast' && nx > 0.3 && y > 0.02) return mul3(mix3(B, G1, 0.35), n);
      return mul3(B, n);
    },
  });
  add(head, G.cone, M.beak, [0.075, -0.012, 0], [0.016, 0.045, 0.016], [0, 0, -Math.PI / 2]);
  eye(head, [0.035, 0.02, 0.05], 0.017, 0xe86a1a); eye(head, [0.035, 0.02, -0.05], 0.017, 0xe86a1a);
  for (const s of [1, -1]) add(body, capsule(0.011, 0.06), M.red, [0.02, -0.14, 0.04 * s]);
  const st = { yaw: 0, t: Math.random() * 10 };
  function update(dt, e) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(e.dir), 6, dt); yaw.rotation.y = st.yaw;
    const f = Math.sin(st.t * 18);
    for (const w of wings) w.w.rotation.x = f * 0.9 * w.s;
    body.position.y = Math.sin(st.t * 18) * 0.02;
    head.rotation.z = Math.sin(st.t * 5) * 0.1;
    if (!e.alive) root.rotation.z += dt * 12 * e.spinDir; else root.rotation.z = 0;
  }
  return { root, update };
}

// ───────────────────────── FOX ─────────────────────────
export function makeFox() {
  critterMats();
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw, [0, 0.38, 0]);
  const head = group(body, [0.28, 0.13, 0]);
  const tail = group(body, [-0.27, 0.03, 0], [0, 0, 0.45]);
  const legs = [];
  for (const [x, z] of [[0.17, 0.07], [0.17, -0.07], [-0.17, 0.07], [-0.17, -0.07]]) legs.push(group(body, [x, -0.07, z]));
  const S = [
    { bone: body, cone: [0.15, 0, 0, -0.2, 0.01, 0], r: [0.115, 0.105], k: 0.06, tag: 'torso' },
    { bone: body, ell: [0.18, -0.03, 0], r: [0.105, 0.11, 0.09], k: 0.05, tag: 'chest' },
    { bone: body, ell: [-0.02, -0.04, 0], r: [0.17, 0.085, 0.095], k: 0.06, tag: 'belly' },
    { bone: body, ell: [-0.18, -0.01, 0.05], r: [0.088, 0.105, 0.052], mirrorZ: true, k: 0.05, tag: 'torso' },
    { bone: head, cone: [-0.03, -0.03, 0, -0.12, -0.13, 0], r: [0.075, 0.09], k: 0.05, tag: 'neck' },
    { bone: head, ell: [0, 0, 0], r: [0.098, 0.088, 0.1], k: 0.04, tag: 'head' },
    { bone: head, ell: [0.02, -0.035, 0.05], r: [0.07, 0.05, 0.05], mirrorZ: true, k: 0.03, tag: 'cheek' },
    { bone: head, cone: [0.05, -0.02, 0, 0.19, -0.04, 0], r: [0.055, 0.022], k: 0.03, tag: 'snout' },
    { bone: tail, cone: [0, 0, 0, -0.17, -0.02, 0], r: [0.055, 0.1], k: 0.06, tag: 'tail' },
    { bone: tail, cone: [-0.17, -0.02, 0, -0.34, -0.05, 0], r: [0.1, 0.035], k: 0.06, tag: 'tail' },
  ];
  legs.forEach((l, i) => {
    if (i >= 2) S.push({ bone: l, ell: [-0.01, -0.02, 0], r: [0.065, 0.1, 0.045], k: 0.04, tag: 'leg' });
    S.push({ bone: l, cone: [0, 0.03, 0, 0, -0.27, 0], r: [i < 2 ? 0.044 : 0.038, 0.027], k: 0.03, tag: 'leg' });
    S.push({ bone: l, ell: [0.015, -0.29, 0], r: [0.04, 0.022, 0.032], k: 0.02, tag: 'paw' });
  });
  // native California GRAY FOX: grizzled salt-and-pepper back, rusty-cinnamon neck sides / flanks / legs,
  // white throat + cheeks + belly, black muzzle stripe, black dorsal stripe ending in a black-tipped tail
  const Gr = lin(0x8d8a86), Gd = lin(0x4a4846), Gl = lin(0xc9c5bf), Ru = lin(0xb86a3a), W = lin(0xf7f2ea), K = lin(0x1c1a19);
  root.updateMatrixWorld(true);
  const tip = tail.localToWorld(new THREE.Vector3(-0.34, -0.05, 0));
  const grizzle = (x, y, z) => { const g = fnoise(x * 3.1, y * 3.1, z * 3.1); return mix3(mix3(Gr, Gd, sat(0.5 - g * 1.6)), Gl, sat(g * 1.6 - 0.6)); };
  sculptSkinned(root, S, M.critter, {
    step: 0.0078, sigma: 0.015, cacheKey: 'grayfox',
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.9 + fnoise(x, y, z) * 0.2; const t = P.tag;
      if (t === 'paw') return mul3(lin(0x6b4a34), n);
      if (t === 'tail') { const d = Math.hypot(x - tip.x, y - tip.y, z - tip.z); if (d < 0.13) return mul3(K, n); if (ny > 0.55) return mul3(K, n); return mul3(ny < -0.3 ? mix3(Ru, Gr, 0.4) : grizzle(x, y, z), n); }
      if (t === 'snout') { if (ny < -0.15) return mul3(W, n); if (ny > 0.35) return mul3(mix3(Gd, K, 0.6), n); return mul3(mix3(Gr, K, 0.35), n); }
      if (t === 'cheek') return mul3(ny < 0.25 ? W : Gl, n);
      if (t === 'neck') return mul3(ny < -0.1 ? W : Math.abs(nz) > 0.55 ? Ru : grizzle(x, y, z), n);
      if (t === 'chest') return mul3(nx > 0.2 || ny < -0.2 ? W : Ru, n);
      if (t === 'belly' || t === 'torso') { if (ny < -0.55) return mul3(W, n); if (ny < -0.15) return mul3(Ru, n); if (ny > 0.85 && Math.abs(z) < 0.03) return mul3(K, n); return mul3(grizzle(x, y, z), n); }
      if (t === 'leg') return mul3(nx > 0.3 && y > 0.12 ? Gl : Ru, n);
      if (t === 'head') return mul3(ny < -0.3 ? W : grizzle(x, y, z), n);
      return mul3(grizzle(x, y, z), n);
    },
  });
  add(head, G.sphere, M.nose, [0.2, -0.033, 0], 0.02);
  eye(head, [0.064, 0.03, 0.056], 0.022, 0xb07a1c); eye(head, [0.064, 0.03, -0.056], 0.022, 0xb07a1c);
  for (const s of [1, -1]) { add(head, G.cone, M.foxEar, [-0.02, 0.12, 0.058 * s], [0.05, 0.12, 0.024], [0.25 * s, 0, 0.1]); add(head, G.cone, M.foxRust, [-0.03, 0.115, 0.061 * s], [0.046, 0.06, 0.02], [0.25 * s, 0, 0.1]); add(head, G.cone, M.catWhite, [-0.012, 0.12, 0.064 * s], [0.03, 0.085, 0.01], [0.25 * s, 0, 0.1]); }
  const shadow = blobShadow(0.9); root.add(shadow);
  const st = { yaw: 0, ph: 0, t: Math.random() * 10 };
  function update(dt, f) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(f.facing), 7, dt); yaw.rotation.y = st.yaw;
    const sp = Math.abs(f.vx);
    st.ph += dt * (2 + sp * 5);
    const s = Math.sin(st.ph) * Math.min(1, sp / 1.5) * 0.7;
    legs[0].rotation.z = s; legs[3].rotation.z = s; legs[1].rotation.z = -s; legs[2].rotation.z = -s;
    tail.rotation.x = Math.sin(st.t * 4) * 0.2; tail.rotation.z = 0.45 + Math.sin(st.t * 2) * 0.1;
    head.rotation.z = sp < 0.2 ? Math.sin(st.t * 1.2) * 0.1 : -0.05;
  }
  return { root, update };
}

// ───────────────────────── RACCOON ─────────────────────────
export function makeRaccoon() {
  critterMats();
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw, [0, 0.3, 0]);
  const head = group(body, [0.2, 0.08, 0]);
  const tail = group(body, [-0.18, 0.02, 0], [0, 0, 0.5]);
  const legs = [];
  for (const [x, z] of [[0.11, 0.08], [0.11, -0.08], [-0.11, 0.08], [-0.11, -0.08]]) legs.push(group(body, [x, -0.1, z]));
  const S = [
    { bone: body, ell: [0, -0.01, 0], r: [0.2, 0.14, 0.14], k: 0.06, tag: 'body' },
    { bone: body, ell: [-0.07, 0.035, 0], r: [0.14, 0.12, 0.125], k: 0.06, tag: 'body' },
    { bone: body, ell: [0.12, -0.02, 0], r: [0.095, 0.1, 0.1], k: 0.05, tag: 'body' },
    { bone: head, cone: [-0.04, -0.02, 0, -0.12, -0.06, 0], r: [0.075, 0.09], k: 0.05, tag: 'neck' },
    { bone: head, ell: [0, 0, 0], r: [0.102, 0.088, 0.104], k: 0.04, tag: 'head' },
    { bone: head, ell: [-0.005, -0.03, 0.062], r: [0.07, 0.06, 0.05], mirrorZ: true, k: 0.03, tag: 'cheek' },
    { bone: head, cone: [0.06, -0.02, 0, 0.15, -0.035, 0], r: [0.045, 0.02], k: 0.03, tag: 'snout' },
    { bone: head, ell: [-0.03, 0.085, 0.066], r: [0.03, 0.04, 0.014], rot: [0.3, 0, 0], mirrorZ: true, k: 0.012, tag: 'ear' },
    { bone: tail, cone: [0, 0, 0, -0.34, 0, 0], r: [0.055, 0.042], k: 0.04, tag: 'tail' },
  ];
  legs.forEach((l) => {
    S.push({ bone: l, cone: [0, 0.03, 0, 0.005, -0.17, 0], r: [0.04, 0.028], k: 0.03, tag: 'leg' });
    S.push({ bone: l, ell: [0.018, -0.182, 0], r: [0.036, 0.018, 0.03], k: 0.02, tag: 'leg' });
  });
  const Gy = lin(0x8d8984), K = lin(0x2a282a), L = lin(0xe4dfd4);
  const hl = localizer(root, head), tl = localizer(root, tail);
  sculptSkinned(root, S, M.critter, {
    step: 0.0072, sigma: 0.014, cacheKey: 'raccoon',
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const g = fnoise(x * 1.7, y * 1.7, z * 1.7), n = 0.85 + g * 0.3; const t = P.tag;
      if (t === 'leg') return mul3(K, n);
      if (t === 'tail') { const q = tl(x, y, z); const ring = Math.sin(-q.x * 52) > 0 || q.x < -0.3; return mul3(ring ? K : mix3(Gy, L, 0.25), n); }
      if (t === 'ear') return mul3(ny > 0.6 || Math.abs(nz) < 0.5 ? L : K, n);
      if (t === 'head' || t === 'cheek' || t === 'snout') {
        const q = hl(x, y, z);
        if (t === 'snout' && q.x > 0.12) return mul3(K, n);
        const band = q.y > -0.025 && q.y < 0.045 && q.x > 0.01 && Math.abs(q.z) > 0.012;
        if (band) return mul3(K, n);
        if (q.y > 0.045 && Math.abs(q.z) < 0.02 && q.x > 0) return mul3(K, n);
        return mul3(t === 'head' && q.y > 0.05 ? Gy : L, n);
      }
      const fine = 0.9 + 0.2 * fnoise(x * 3.1, y * 3.1, z * 3.1);
      return mul3(mix3(mix3(Gy, L, sat(-ny * 0.6) * 0.5), K, sat(ny - 0.4) * 0.35), fine);
    },
  });
  add(head, G.sphere, M.nose, [0.162, -0.034, 0], 0.019);
  eye(head, [0.084, 0.02, 0.054], 0.021, 0x111111); eye(head, [0.084, 0.02, -0.054], 0.021, 0x111111);
  const shadow = blobShadow(0.75); root.add(shadow);
  const st = { yaw: 0, ph: 0, t: Math.random() * 10 };
  function update(dt, r) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(r.facing), 7, dt); yaw.rotation.y = st.yaw;
    const sp = Math.abs(r.vx);
    st.ph += dt * (2 + sp * 7);
    const s = Math.sin(st.ph) * Math.min(1, sp) * 0.7;
    legs[0].rotation.z = s; legs[3].rotation.z = s; legs[1].rotation.z = -s; legs[2].rotation.z = -s;
    body.rotation.z = r.state === 'knocking' ? 0.5 + Math.sin(st.t * 20) * 0.15 : 0;
    tail.rotation.x = Math.sin(st.t * 3) * 0.25;
  }
  return { root, update };
}

// ───────────────────────── CYCLIST ─────────────────────────
// Road cyclist on a bike, side-on along +x. Sculpted rider; legs solve 2-bone IK onto the pedals.
export function makeCyclist(variant = 0) {
  critterMats();
  const V = [
    { jersey: 0xd8342a, jersey2: 0xffffff, frame: 0xd8342a, helmet: 0xffffff, skin: 0xe8b48f, hair: 0x5a3a22 },
    { jersey: 0x1f9e9a, jersey2: 0xffd23f, frame: 0x1b4f8a, helmet: 0xffd23f, skin: 0xb07a52, hair: 0x1d1612 },
  ][variant % 2];
  const root = new THREE.Group();
  const yaw = group(root); // flips for direction
  const bike = group(yaw);
  const mFrame = phys(V.frame, { roughness: 0.25, extra: { clearcoat: 1, clearcoatRoughness: 0.08 }, rimColor: 0xffffff, rimStrength: 0.25 });
  const mTire = std(0x1b1b1d, { roughness: 0.85 });
  const mMetal = phys(0xd9dde3, { roughness: 0.2, metalness: 1 });
  const mDark = std(0x2a2a2e, { roughness: 0.5 });
  const R = 0.35, rearC = new THREE.Vector3(-0.5, R, 0), frontC = new THREE.Vector3(0.52, R, 0), BB = new THREE.Vector3(0, 0.31, 0);
  const tube = (a, b, r, mat, parent = bike) => {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), mat);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.castShadow = true; parent.add(m); return m;
  };
  const wheels = [];
  for (const c of [rearC, frontC]) {
    const w = group(bike, [c.x, c.y, 0]);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(R - 0.018, 0.02, 10, 48), mTire); tire.castShadow = true; w.add(tire);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.045, 0.012, 6, 48), mMetal); w.add(rim);
    w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.07, 12).rotateX(Math.PI / 2), mMetal));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, sp = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, R - 0.05, 3), mMetal);
      sp.position.set(Math.cos(a) * (R - 0.05) / 2, Math.sin(a) * (R - 0.05) / 2, (i % 2 ? 1 : -1) * 0.012); sp.rotation.z = a - Math.PI / 2; w.add(sp);
    }
    wheels.push(w);
  }
  const seatTop = new THREE.Vector3(-0.17, 0.86, 0), headTop = new THREE.Vector3(0.4, 0.84, 0), headBot = new THREE.Vector3(0.44, 0.7, 0);
  tube(BB, seatTop, 0.022, mFrame); tube(BB, headBot, 0.026, mFrame); tube(seatTop.clone().add(new THREE.Vector3(0.02, -0.06, 0)), headTop, 0.02, mFrame);
  tube(headBot, headTop.clone().add(new THREE.Vector3(-0.02, 0.06, 0)), 0.026, mFrame);
  for (const z of [0.035, -0.035]) {
    tube(BB.clone().setZ(z), rearC.clone().setZ(z), 0.012, mFrame); tube(seatTop.clone().add(new THREE.Vector3(0, -0.05, z)), rearC.clone().setZ(z), 0.011, mFrame);
    tube(headBot.clone().setZ(z * 0.8), frontC.clone().setZ(z), 0.013, mFrame);
  }
  // seatpost, saddle, stem, drop bars
  tube(seatTop, new THREE.Vector3(-0.2, 0.98, 0), 0.014, mMetal);
  const saddle = add(bike, G.sphere, mDark, [-0.2, 0.995, 0], [0.13, 0.025, 0.06]);
  tube(headTop.clone().add(new THREE.Vector3(-0.02, 0.06, 0)), new THREE.Vector3(0.48, 0.96, 0), 0.014, mDark);
  const bar = new THREE.Vector3(0.48, 0.96, 0);
  tube(bar.clone().setZ(-0.2), bar.clone().setZ(0.2), 0.013, mDark);
  for (const z of [0.2, -0.2]) { const dropA = new THREE.Vector3(0.55, 0.92, z), dropB = new THREE.Vector3(0.5, 0.84, z); tube(bar.clone().setZ(z), dropA, 0.013, mDark); tube(dropA, dropB, 0.013, mDark); }
  // drivetrain
  const chainring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 36), mMetal); chainring.position.set(BB.x, BB.y, 0.05); bike.add(chainring);
  const crank = group(bike, [BB.x, BB.y, 0]);
  const CR = 0.17;
  for (const s of [1, -1]) {
    const arm = add(crank, G.box, mMetal, [0, 0, 0.07 * s], [0.025, 0.01, 0.012]); arm.scale.set(0.025, CR, 0.012); arm.position.set(0, (CR / 2) * s, 0.07 * s);
    add(crank, G.box, mDark, [0, CR * s, 0.1 * s], [0.1, 0.02, 0.05]);
  }
  // ── rider (sculpted, skinned) ──
  const hip = group(bike, [-0.17, 1.03, 0]);
  const torso = group(hip, [0, 0, 0], [0, 0, -0.85]); // lean forward
  const neckB = group(torso, [0, 0.52, 0]);
  const headB = group(neckB, [0.02, 0.1, 0], [0, 0, 0.75]);
  const legs = [], arms = [];
  for (const s of [1, -1]) {
    const thigh = group(hip, [0.02, -0.02, 0.1 * s]);
    const shin = group(thigh, [0, -0.43, 0]);
    legs.push({ thigh, shin, s });
    const up = group(torso, [0.0, 0.48, 0.17 * s]);
    const fore = group(up, [0, -0.3, 0]);
    arms.push({ up, fore, s });
  }
  // static arm IK: shoulder → hoods on the bar
  root.updateMatrixWorld(true);
  const ik = (a, target, l1, l2, bendSign) => { // returns world angles (rad) in the xy plane
    const dx = target.x - a.x, dy = target.y - a.y, d = Math.min(l1 + l2 - 1e-4, Math.hypot(dx, dy));
    const base = Math.atan2(dy, dx), al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const t1 = base + al * bendSign; const kx = a.x + Math.cos(t1) * l1, ky = a.y + Math.sin(t1) * l1;
    return [t1, Math.atan2(target.y - ky, target.x - kx)];
  };
  const torsoAng = -0.85;
  for (const A of arms) {
    const sh = new THREE.Vector3(); A.up.getWorldPosition(sh);
    const [t1, t2] = ik(sh, new THREE.Vector3(0.53, 0.94, 0), 0.3, 0.3, -1);
    A.up.rotation.z = t1 + Math.PI / 2 - torsoAng; A.fore.rotation.z = t2 - t1;
  }
  const hipW = new THREE.Vector3(-0.15, 1.01, 0);
  const pedal = (a, s) => new THREE.Vector3(BB.x + Math.cos(a + (s < 0 ? Math.PI : 0)) * CR, BB.y + Math.sin(a + (s < 0 ? Math.PI : 0)) * CR, 0);
  const poseLegs = (a) => {
    for (const L of legs) {
      const [t1, t2] = ik(hipW, pedal(a, L.s), 0.43, 0.47, 1);
      L.thigh.rotation.z = t1 + Math.PI / 2; L.shin.rotation.z = t2 - t1;
    }
  };
  poseLegs(-Math.PI / 2);
  const S = [
    { bone: hip, ell: [0, 0, 0], r: [0.14, 0.11, 0.15], k: 0.05, tag: 'shorts' },
    { bone: torso, cone: [0, 0.05, 0, 0, 0.42, 0], r: [0.135, 0.15], k: 0.06, tag: 'jersey' },
    { bone: torso, ell: [0.035, 0.32, 0], r: [0.11, 0.14, 0.15], k: 0.05, tag: 'jersey' },
    { bone: torso, ell: [0, 0.47, 0.13], r: [0.075, 0.07, 0.07], mirrorZ: true, k: 0.04, tag: 'jersey' },
    { bone: neckB, cone: [0, -0.04, 0, 0.02, 0.1, 0], r: [0.05, 0.045], k: 0.03, tag: 'skin' },
    { bone: headB, ell: [0, 0.06, 0], r: [0.095, 0.115, 0.09], k: 0.03, tag: 'head' },
    { bone: headB, ell: [0.085, 0.03, 0], r: [0.025, 0.035, 0.02], k: 0.02, tag: 'skin' },
  ];
  for (const L of legs) {
    S.push({ bone: L.thigh, cone: [0, 0, 0, 0, -0.43, 0], r: [0.08, 0.055], k: 0.04, tag: 'thigh' });
    S.push({ bone: L.shin, cone: [0, 0, 0, 0, -0.4, 0], r: [0.055, 0.035], k: 0.035, tag: 'skin' });
    S.push({ bone: L.shin, ell: [0.04, -0.44, 0], r: [0.08, 0.035, 0.04], k: 0.025, tag: 'shoe' });
  }
  for (const A of arms) {
    S.push({ bone: A.up, cone: [0, 0, 0, 0, -0.3, 0], r: [0.058, 0.046], k: 0.035, tag: 'sleeve' });
    S.push({ bone: A.fore, cone: [0, 0, 0, 0, -0.27, 0], r: [0.046, 0.034], k: 0.03, tag: 'skin' });
    S.push({ bone: A.fore, ell: [0.01, -0.3, 0], r: [0.042, 0.04, 0.034], k: 0.02, tag: 'glove' });
  }
  const J = lin(V.jersey), J2 = lin(V.jersey2), SK = lin(V.skin), K = lin(0x1d1d22), HR = lin(V.hair);
  const thL = legs.map((L) => localizer(root, L.thigh)), toL = localizer(root, torso);
  sculptSkinned(root, S, M.critter, {
    step: 0.011, sigma: 0.02,
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.95 + fnoise(x, y, z) * 0.1, t = P.tag;
      if (t === 'shorts' || t === 'shoe' || t === 'glove') return mul3(t === 'shoe' ? lin(0xf4f4f4) : K, n);
      if (t === 'thigh') { const q = thL[P.bone === legs[0].thigh ? 0 : 1](x, y, z); return mul3(q.y > -0.25 ? K : SK, n); }
      if (t === 'jersey' || t === 'sleeve') { const q = toL(x, y, z); const band = t === 'sleeve' ? y < 1.05 : (q.y > 0.2 && q.y < 0.3); return mul3(band ? J2 : J, n); }
      if (t === 'head') return mul3(ny > 0.1 || nx < -0.3 ? HR : SK, n);
      return mul3(SK, n);
    },
  });
  // helmet + sunglasses
  const mHelm = phys(V.helmet, { roughness: 0.3, extra: { clearcoat: 1, clearcoatRoughness: 0.1 } });
  const helm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mHelm);
  helm.scale.set(0.135, 0.11, 0.11); helm.position.set(-0.01, 0.1, 0); helm.rotation.z = 0.15; helm.castShadow = true; headB.add(helm);
  for (let i = -2; i <= 2; i++) add(headB, G.box, mDark, [-0.01 + i * 0.03, 0.2 - Math.abs(i) * 0.012, 0], [0.012, 0.01, 0.2]);
  add(headB, G.sphere, phys(0x1a1030, { roughness: 0.05, metalness: 0.6, extra: { iridescence: 1, iridescenceIOR: 1.7 } }), [0.085, 0.075, 0], [0.025, 0.022, 0.085], [0, 0, 0], false);
  const st = { crank: 0, wob: 0, t: Math.random() * 5, stink: 0 };
  function update(dt, b) {
    st.t += dt;
    yaw.rotation.y = b.dir > 0 ? 0 : Math.PI;
    const v = Math.abs(b.vx);
    for (const w of wheels) w.rotation.z -= (v / R) * dt;
    st.crank -= v * dt * 2.1; crank.rotation.z = st.crank;
    poseLegs(st.crank - Math.PI / 2 + Math.PI / 2);
    // stink reaction: wobble, lean away, head turns from the smell
    st.stink = Math.max(0, (b.stinkT || 0));
    const wob = st.stink > 0 ? Math.sin(st.t * 18) * 0.12 * Math.min(1, st.stink) : Math.sin(st.t * 3) * 0.015;
    bike.rotation.x = wob;
    headB.rotation.y = st.stink > 0 ? 0.9 * Math.min(1, st.stink * 2) : 0;
    headB.rotation.z = 0.75 + (st.stink > 0 ? 0.3 : 0);
    torso.rotation.z = torsoAng + (st.stink > 0 ? 0.25 : Math.sin(st.t * 4) * 0.02);
  }
  return { root, update };
}

// ───────────────────────── CHICKEN ─────────────────────────
export function makeChicken() {
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw, [0, 0.32, 0]);
  add(body, G.sphere, M.chicken, [0, 0, 0], [0.2, 0.18, 0.16]);
  add(body, G.cone, M.chicken, [-0.18, 0.08, 0], [0.08, 0.16, 0.06], [0, 0, 0.9]);
  const head = group(body, [0.15, 0.18, 0]);
  add(head, G.sphere, M.chicken, [0, 0, 0], 0.09);
  add(head, G.cone, M.yellow, [0.1, -0.01, 0], [0.025, 0.06, 0.025], [0, 0, -Math.PI / 2]);
  add(head, G.sphere, M.red, [0, 0.09, 0], [0.05, 0.04, 0.02]); add(head, G.sphere, M.red, [0.06, -0.05, 0], [0.02, 0.035, 0.02]);
  eye(head, [0.05, 0.025, 0.06], 0.02); eye(head, [0.05, 0.025, -0.06], 0.02);
  const wings = []; for (const s of [1, -1]) { const w = group(body, [0, 0.03, 0.15 * s]); add(w, G.sphere, M.chicken, [-0.03, 0, 0], [0.12, 0.08, 0.03]); wings.push({ w, s }); }
  const legs = []; for (const s of [1, -1]) { const l = group(body, [0.0, -0.14, 0.06 * s]); add(l, capsule(0.015, 0.12), M.orange, [0, -0.07, 0]); legs.push(l); }
  const shadow = blobShadow(0.7); root.add(shadow);
  const st = { yaw: 0, t: 0 };
  function update(dt, c) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(c.dir), 12, dt); yaw.rotation.y = st.yaw;
    for (const w of wings) w.w.rotation.x = Math.sin(st.t * 30) * 0.8 * w.s;
    legs[0].rotation.z = Math.sin(st.t * 20) * 0.8; legs[1].rotation.z = -Math.sin(st.t * 20) * 0.8;
    head.position.x = 0.15 + Math.sin(st.t * 20) * 0.02;
    shadow.visible = c.grounded;
  }
  return { root, update };
}

// ───────────────────────── MORTY ─────────────────────────
// Morty: black-and-white long-coated spaniel mix (from the owner's photo) — sculpted body,
// white blaze/muzzle/chest/socks, black eye patches + long feathered black ears, hair-card coat.
export function makeMorty() {
  critterMats();
  if (!M.pbHair) M.pbHair = hairCardMaterial(pbHairTexture(), { color: 0xffffff, roughness: 0.48, rimColor: 0xfff8ee, rimStrength: 0.38, rimPower: 1.8 });
  if (!M.mortySkin) M.mortySkin = triplanarSkin(tex.fur, { scale: 8, roughness: 0.74, sheen: 0.22, sheenColor: new THREE.Color(0x9aa2b4), sheenRoughness: 0.6, rimColor: 0xd8e0f0, rimStrength: 0.16, rimPower: 2.8 });
  if (!M.mortyHairK) M.mortyHairK = hairCardMaterial(pbHairTexture(), { color: 0x1e1b1d, roughness: 0.45, rimColor: 0x8a94a8, rimStrength: 0.16, rimPower: 2.4 });
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw, [0, 0.55, 0]);
  const head = group(body, [0.38, 0.25, 0]);
  const tail = group(body, [-0.3, 0.07, 0], [0, 0, 0.85]);
  const ears = [];
  for (const s of [1, -1]) ears.push(group(head, [-0.015, 0.07, 0.1 * s], [-s * 0.28, 0, -0.12]));
  const legs = [];
  for (const [x, z] of [[0.21, 0.09], [0.21, -0.09], [-0.22, 0.09], [-0.22, -0.09]]) legs.push(group(body, [x, -0.1, z]));
  const S = [
    { bone: body, cone: [0.24, 0.02, 0, -0.26, 0.03, 0], r: [0.165, 0.145], k: 0.07, tag: 'torso' },
    { bone: body, ell: [0.25, -0.03, 0], r: [0.15, 0.17, 0.135], k: 0.06, tag: 'chest' },
    { bone: body, ell: [-0.02, -0.07, 0], r: [0.22, 0.095, 0.125], k: 0.07, tag: 'belly' },
    { bone: body, ell: [0.2, 0.0, 0.075], r: [0.1, 0.13, 0.06], mirrorZ: true, k: 0.05, tag: 'torso' },
    { bone: body, ell: [-0.22, -0.01, 0.07], r: [0.12, 0.14, 0.07], mirrorZ: true, k: 0.06, tag: 'torso' },
    { bone: head, cone: [-0.04, -0.05, 0, -0.17, -0.25, 0], r: [0.095, 0.125], k: 0.06, tag: 'neck' },
    { bone: head, ell: [0, 0, 0], r: [0.125, 0.112, 0.115], k: 0.04, tag: 'head' },
    { bone: head, ell: [0.06, 0.035, 0.045], r: [0.05, 0.04, 0.045], mirrorZ: true, k: 0.03, tag: 'head' },
    { bone: head, ell: [0.05, -0.04, 0.058], r: [0.07, 0.055, 0.048], mirrorZ: true, k: 0.035, tag: 'cheek' },
    { bone: head, cone: [0.07, -0.035, 0, 0.185, -0.05, 0], r: [0.07, 0.052], k: 0.035, tag: 'muzzle' },
    { bone: head, ell: [0.12, -0.085, 0], r: [0.07, 0.03, 0.05], k: 0.03, tag: 'jaw' },
    { bone: tail, cone: [0, 0, 0, -0.25, 0, 0], r: [0.05, 0.026], k: 0.04, tag: 'tail' },
  ];
  for (const e of ears) S.push({ bone: e, ell: [0.0, -0.1, 0], r: [0.072, 0.135, 0.026], k: 0.025, tag: 'ear' });
  legs.forEach((l, i) => {
    const front = i < 2;
    S.push({ bone: l, ell: [front ? 0.0 : -0.015, -0.03, 0], r: front ? [0.06, 0.12, 0.048] : [0.085, 0.14, 0.055], k: 0.04, tag: front ? 'legF' : 'legH' });
    S.push({ bone: l, cone: [0, 0.02, 0, front ? 0.012 : -0.01, -0.41, 0], r: [front ? 0.047 : 0.044, 0.033], k: 0.03, tag: front ? 'legF' : 'legH' });
    S.push({ bone: l, ell: [0.025, -0.425, 0], r: [0.055, 0.028, 0.044], k: 0.02, tag: 'paw' });
  });
  root.updateMatrixWorld(true);
  const hc = head.localToWorld(new THREE.Vector3(0, 0, 0));
  const tip = tail.localToWorld(new THREE.Vector3(-0.25, 0, 0));
  const K = lin(0x141214), Kb = lin(0x1f1a18), W = lin(0xf6f1ea), Wc = lin(0xe8ded2);
  sculptSkinned(root, S, M.mortySkin, {
    step: 0.0092, sigma: 0.016, cacheKey: 'morty4',
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.9 + fnoise(x, y, z) * 0.2, t = P.tag;
      const white = (k = 1) => mul3(mix3(Wc, W, k), n);
      const black = () => mul3(mix3(K, Kb, sat(ny * 0.5 + 0.2) * 0.5), n);
      if (t === 'muzzle' || t === 'jaw' || t === 'paw') return white();
      if (t === 'ear' || t === 'tail' && Math.hypot(x - tip.x, y - tip.y, z - tip.z) > 0.09) return black();
      if (t === 'tail') return white();
      if (t === 'head') {
        // white blaze: a stripe up the centre of the face that widens toward the muzzle
        const fx = x - hc.x, w = 0.016 + Math.max(0, fx - 0.04) * 0.55;
        if (Math.abs(z) < w && fx > -0.05 && y > hc.y - 0.06) return white(0.6);
        if (fx > 0.1 && y < hc.y - 0.015) return white();
        return black();
      }
      if (t === 'cheek') return y < hc.y - 0.035 || (z < 0 && x > hc.x + 0.02) ? white() : black();
      if (t === 'neck') return nx > -0.35 ? white() : black();
      if (t === 'chest') return nx > -0.2 || ny < -0.2 ? white() : black();
      if (t === 'belly') return ny < -0.45 ? white(0.4) : black();
      if (t === 'legF') return y < 0.3 || nx > 0.35 ? white() : black();
      if (t === 'legH') return y < 0.17 ? white() : black();
      return black();
    },
  });
  // ── hair cards (two materials: black coat, white ruff) ──
  const cardsK = [], cardsW = [];
  const hl = (list, mat, parent, pos, rz, len, w, lift, droop, twist, center, rx = 0) => {
    const pv = group(parent, pos, [rx, 0, rz]);
    list.push({ mesh: add(pv, ribbon(len, w, lift, droop, twist, 8, 0), mat, [0, 0, 0], 1, [0, 0, 0], false), center });
    list.push({ mesh: add(pv, ribbon(len * 0.9, w * 0.7, lift, droop, twist + Math.PI / 2, 8, 0), mat, [0, 0, 0], 1, [0, 0, 0], false), center });
    return pv;
  };
  const sway = [];
  const R = (a, b) => a + Math.random() * (b - a);
  // long feathered ears
  for (const e of ears) {
    const ec = e.localToWorld(new THREE.Vector3(0, -0.08, 0)).clone();
    for (let i = 0; i < 18; i++) {
      const k = (i % 9) / 8, out = i < 9 ? 0.018 : -0.018;
      sway.push(hl(cardsK, M.mortyHairK, e, [R(-0.055, 0.055), -0.02 - k * 0.15, out * Math.sign(e.position.z)], Math.PI / 2 + R(-0.3, 0.3), R(0.13, 0.21) * (0.65 + k * 0.5), 0.05, 0.08, 0.3, R(-0.6, 0.6), ec));
    }
  }
  // white chest ruff + throat
  const chestC = body.localToWorld(new THREE.Vector3(0.22, -0.02, 0)).clone();
  for (let i = 0; i < 26; i++) {
    const a = R(-1.1, 1.1), yy = R(-0.1, 0.17);
    sway.push(hl(cardsW, M.pbHair, body, [0.3 + Math.cos(a) * 0.07 - yy * 0.15, yy, Math.sin(a) * 0.12], R(1.85, 2.25), R(0.12, 0.2), 0.05, 0.12, 0.45, R(-0.5, 0.5), chestC, -Math.sin(a) * 0.5));
  }
  const neckC = head.localToWorld(new THREE.Vector3(-0.1, -0.15, 0)).clone();
  for (let i = 0; i < 12; i++) {
    const k = i / 11, a = R(-1, 1);
    hl(cardsW, M.pbHair, head, [-0.02 - k * 0.11 + 0.04, -0.08 - k * 0.15, Math.sin(a) * 0.09], R(1.7, 2.1), R(0.1, 0.15), 0.045, 0.12, 0.4, R(-0.5, 0.5), neckC, -a * 0.4);
  }
  // black coat lying back along the spine and flanks
  const bodyC = body.localToWorld(new THREE.Vector3(0, 0, 0)).clone();
  for (let i = 0; i < 30; i++) {
    const k = i / 29, side = (i % 3) - 1;
    hl(cardsK, M.mortyHairK, body, [0.18 - k * 0.44, 0.13 + Math.sin(k * Math.PI) * 0.02 - Math.abs(side) * 0.03, side * 0.07], R(0.15, 0.4), R(0.12, 0.17), 0.05, 0.25, 0.55, side * 0.5, bodyC, -side * 0.5);
  }
  // wavy flank coat lying back and down over the ribs
  for (const sz of [1, -1]) for (let i = 0; i < 14; i++) {
    const k = i / 13, yy = 0.06 - (i % 2) * 0.07;
    hl(cardsK, M.mortyHairK, body, [0.14 - k * 0.38, yy, sz * (0.135 - Math.abs(yy) * 0.2)], R(0.5, 0.85), R(0.12, 0.17), 0.055, 0.15, 0.45, R(-0.4, 0.4), bodyC, -sz * 0.45);
  }
  // belly / flank feathering hanging down
  for (const sz of [1, -1]) for (let i = 0; i < 9; i++) {
    const k = i / 8, x = 0.16 - k * 0.34;
    sway.push(hl(x > 0.1 ? cardsW : cardsK, x > 0.1 ? M.pbHair : M.mortyHairK, body, [x, -0.1, sz * 0.1], Math.PI / 2 + R(-0.2, 0.25), R(0.08, 0.12), 0.045, 0.05, 0.25, R(-0.4, 0.4), bodyC, -sz * 0.3));
  }
  // leg feathering + hind "trousers"
  legs.forEach((l, i) => {
    const lc = l.localToWorld(new THREE.Vector3(0, -0.12, 0)).clone();
    for (let j = 0; j < (i < 2 ? 4 : 3); j++) {
      if (i < 2) hl(cardsW, M.pbHair, l, [-0.035, -0.06 - j * 0.06, 0], R(0.75, 1.05), R(0.07, 0.1), 0.035, 0.08, 0.3, R(-0.4, 0.4), lc);
      else hl(cardsK, M.mortyHairK, l, [-0.07, -0.02 - j * 0.05, 0], R(0.8, 1.1), R(0.09, 0.12), 0.045, 0.08, 0.3, R(-0.4, 0.4), lc);
    }
  });
  // feathered tail: hangs down under the bone, white tip
  const tailC = tail.localToWorld(new THREE.Vector3(-0.12, 0, 0)).clone();
  const tailHair = [];
  for (let i = 0; i < 12; i++) {
    const k = i / 11, wt = k > 0.8;
    tailHair.push(hl(wt ? cardsW : cardsK, wt ? M.pbHair : M.mortyHairK, tail, [-0.03 - k * 0.22, -0.01, R(-0.012, 0.012)], R(0.45, 0.85), R(0.12, 0.18), 0.045, 0.1, 0.3, R(-0.6, 0.6), tailC, R(-0.3, 0.3)));
  }
  root.updateMatrixWorld(true);
  const bake = (list, mat) => bakeRigid(root, list.map((c) => ({ mesh: c.mesh, owner: c.mesh.parent, center: c.center })), mat, true);
  bake(cardsK, M.mortyHairK); bake(cardsW, M.pbHair);
  for (const sv of [...sway, ...tailHair]) sv.userData.base = sv.rotation.z;

  add(head, G.sphere, M.nose, [0.236, -0.035, 0], [0.034, 0.03, 0.042]);
  for (const s of [1, -1]) add(head, G.sphere, M.black, [0.266, -0.04, 0.015 * s], [0.007, 0.007, 0.006], [0, 0, 0], false);
  const tongue = add(head, G.sphere, M.catPink, [0.17, -0.105, 0], [0.04, 0.012, 0.026]);
  eye(head, [0.088, 0.032, 0.058], 0.026, 0x7a4416); eye(head, [0.088, 0.032, -0.058], 0.026, 0x7a4416);
  const shadow = blobShadow(1.3); root.add(shadow);
  const st = { yaw: 0, ph: 0, t: Math.random() * 10 };
  function update(dt, m) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(m.facing), 8, dt); yaw.rotation.y = st.yaw;
    const sp = Math.abs(m.vx), run = Math.min(1, sp / 3);
    st.ph += dt * (3 + sp * 2.2);
    const s = Math.sin(st.ph) * run * 0.7;
    legs[0].rotation.z = s; legs[3].rotation.z = s * 0.85; legs[1].rotation.z = -s; legs[2].rotation.z = -s * 0.85;
    body.position.y = 0.55 + Math.abs(Math.sin(st.ph)) * 0.035 * run;
    body.rotation.z = Math.sin(st.ph * 2) * 0.03 * run;
    tail.rotation.x = Math.sin(st.t * 11) * 0.45;
    tail.rotation.z = 0.85 - run * 0.35 + Math.sin(st.t * 5.5) * 0.05;
    const sniff = m.state === 'sniffing';
    head.rotation.z = sniff ? -0.4 + Math.sin(st.t * 18) * 0.05 : Math.sin(st.t * 2) * 0.05 - run * 0.08;
    tongue.visible = !sniff;
    ears.forEach((e, i) => { e.rotation.z = -0.12 + run * 0.35 + Math.sin(st.t * 3 + i) * 0.05 + Math.sin(st.ph * 2) * 0.06 * run; });
    for (const sv of sway) sv.rotation.z = sv.userData.base + Math.sin(st.t * 3 + sv.position.x * 30) * 0.05 + run * Math.sin(st.ph * 2 + sv.position.y * 20) * 0.08 - run * 0.15;
    for (const th of tailHair) th.rotation.z = th.userData.base - run * 0.3 + Math.sin(st.t * 11 + th.position.x * 20) * 0.08;
  }
  return { root, update };
}

// ───────────────────────── JESSICA ─────────────────────────
function makeJessica3D() {
  // Sculpted, skinned Jessica (from the owner's photos): long dark-brown shag with short blunt bangs,
  // black hoodie + black pants + boots, tattooed neck/hands, little moon tattoo by the eye, mustard beanie.
  critterMats();
  if (!tex.jFine) {
    // near-white micro texture: soft pores on skin, fine knit/weave on the clothes (vertex colours carry the colour)
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 225 + Math.floor(Math.random() * 30); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    g.globalAlpha = 0.18; g.strokeStyle = '#d0d0d0';
    for (let y = 0; y < 256; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + (Math.random() - 0.5)); g.stroke(); }
    tex.jFine = new THREE.CanvasTexture(c); tex.jFine.wrapS = tex.jFine.wrapT = THREE.RepeatWrapping; tex.jFine.colorSpace = THREE.SRGBColorSpace;
  }
  if (!M.jBody) M.jBody = triplanarSkin(tex.jFine, { scale: 6, roughness: 0.66, sheen: 0.35, sheenColor: new THREE.Color(0x8a8a9a), sheenRoughness: 0.55, rimColor: 0xffe6d4, rimStrength: 0.22, rimPower: 2.6 });
  if (!M.jHairCard) M.jHairCard = hairCardMaterial(pbHairTexture(), { color: 0x3a2619, roughness: 0.4, rimColor: 0xe0a070, rimStrength: 0.22, rimPower: 2.2 });
  const root = new THREE.Group();
  const yaw = group(root, [0, 0, 0], [0, -Math.PI / 2 - 0.5, 0]);
  const body = group(yaw);
  const hip = group(body, [0, 0.95, 0]);
  const torso = group(hip, [0, 0, 0]);
  const neck = group(torso, [0.0, 0.6, 0]);
  const head = group(neck, [0.015, 0.11, 0]);
  const legs = [], arms = [];
  for (const s of [1, -1]) {
    const thigh = group(hip, [0, -0.02, 0.095 * s]);
    const shin = group(thigh, [0, -0.46, 0]);
    legs.push({ thigh, shin, s });
    const up = group(torso, [-0.005, 0.5, 0.2 * s], [-s * 0.1, 0, 0]);
    const fore = group(up, [0, -0.29, 0]);
    arms.push({ up, fore, s });
  }
  const S = [
    { bone: torso, ell: [0, 0.03, 0], r: [0.1, 0.11, 0.15], k: 0.05, tag: 'pants' },
    { bone: torso, ell: [0, 0.1, 0], r: [0.125, 0.075, 0.172], k: 0.04, tag: 'hoodie' },
    { bone: torso, ell: [0, 0.22, 0], r: [0.108, 0.12, 0.155], k: 0.06, tag: 'hoodie' },
    { bone: torso, ell: [0.015, 0.37, 0], r: [0.112, 0.15, 0.172], k: 0.06, tag: 'hoodie' },
    { bone: torso, ell: [0.06, 0.35, 0.058], r: [0.06, 0.06, 0.058], mirrorZ: true, k: 0.04, tag: 'hoodie' },
    { bone: torso, ell: [-0.01, 0.51, 0.15], r: [0.07, 0.06, 0.075], mirrorZ: true, k: 0.05, tag: 'hoodie' },
    { bone: torso, ell: [-0.075, 0.57, 0], r: [0.065, 0.06, 0.12], k: 0.04, tag: 'hood' },
    { bone: neck, cone: [0, -0.05, 0, 0.012, 0.12, 0], r: [0.047, 0.038], k: 0.03, tag: 'neck' },
    // adult female head: narrow oval cranium, defined cheekbones, tapered jaw to a small chin, real nose bridge
    { bone: head, ell: [-0.01, 0.12, 0], r: [0.112, 0.12, 0.09], k: 0.03, tag: 'face' },
    { bone: head, ell: [0.03, 0.06, 0], r: [0.076, 0.07, 0.071], k: 0.035, tag: 'face' },
    { bone: head, ell: [0.07, 0.085, 0.047], r: [0.032, 0.02, 0.028], mirrorZ: true, k: 0.02, tag: 'face' },
    { bone: head, cone: [0.02, 0.05, 0, 0.086, 0.002, 0], r: [0.051, 0.019], k: 0.03, tag: 'face' },
    { bone: head, cone: [0.096, 0.118, 0, 0.11, 0.074, 0], r: [0.0075, 0.011], k: 0.012, tag: 'face' },
    { bone: head, ell: [0.11, 0.07, 0], r: [0.012, 0.0105, 0.0125], k: 0.01, tag: 'face' },
    { bone: head, ell: [0.102, 0.066, 0.012], r: [0.0075, 0.0065, 0.0075], mirrorZ: true, k: 0.008, tag: 'face' },
    { bone: head, ell: [0.0, 0.1, 0.1], r: [0.018, 0.028, 0.01], mirrorZ: true, k: 0.01, tag: 'face' },
    // hair volume (under the strand cards): crown, long back fall, side panels
    { bone: head, ell: [-0.03, 0.14, 0], r: [0.115, 0.115, 0.1], k: 0.02, tag: 'hair' },
    { bone: head, ell: [-0.07, -0.08, 0], r: [0.06, 0.2, 0.105], k: 0.05, tag: 'hair' },
  ];
  for (const L of legs) {
    S.push({ bone: L.thigh, cone: [0, 0, 0, 0, -0.46, 0], r: [0.086, 0.058], k: 0.045, tag: 'pants' });
    S.push({ bone: L.shin, cone: [0, 0, 0, 0, -0.33, 0], r: [0.052, 0.045], k: 0.03, tag: 'pants' });
    S.push({ bone: L.shin, cone: [0, -0.26, 0, 0, -0.41, 0], r: [0.052, 0.05], k: 0.02, tag: 'boot' });
    S.push({ bone: L.shin, ell: [0.045, -0.44, 0], r: [0.088, 0.034, 0.046], k: 0.03, tag: 'boot' });
  }
  for (const A of arms) {
    S.push({ bone: A.up, cone: [0, 0, 0, 0, -0.29, 0], r: [0.062, 0.05], k: 0.035, tag: 'hoodie' });
    S.push({ bone: A.fore, cone: [0, 0, 0, 0, -0.24, 0], r: [0.05, 0.045], k: 0.03, tag: 'hoodie' });
    S.push({ bone: A.fore, ell: [0, -0.245, 0], r: [0.044, 0.024, 0.044], k: 0.015, tag: 'cuff' });
    S.push({ bone: A.fore, ell: [0.005, -0.3, 0], r: [0.022, 0.048, 0.034], k: 0.02, tag: 'hand' });
  }
  root.updateMatrixWorld(true);
  const toL = localizer(root, torso), hdL = localizer(root, head);
  const HK = lin(0x1a1a1e), HK2 = lin(0x26262c), PK = lin(0x222328), BT = lin(0x121112), SK = lin(0xf0c4a4), SKs = lin(0xe0a888);
  const HR = lin(0x2e1e15), INK = lin(0x4a5462), LIP = lin(0xc47c78);
  const ink = (x, y, z) => { const a = Math.atan2(z, x) * 3; const line = Math.abs(Math.sin(y * 110 + Math.sin(a * 2.2) * 1.6)) < 0.2; const fill = Math.sin(y * 45 + a * 1.3) * Math.sin(a * 3.1 - y * 30) > 0.35; return line || fill; };
  sculptSkinned(root, S, M.jBody, {
    step: 0.0062, sigma: 0.012, cacheKey: 'jess15',
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.94 + fnoise(x, y, z) * 0.12, t = P.tag;
      if (t === 'boot') return mul3(BT, n);
      if (t === 'pants') return mul3(PK, n);
      if (t === 'hood') return mul3(HK2, n);
      if (t === 'hoodie' || t === 'cuff') {
        const q = toL(x, y, z);
        if (t === 'hoodie' && nx > 0.55 && q.y > 0.12 && q.y < 0.24 && Math.abs(q.z) < 0.1) return mul3(HK2, n * 1.05); // kangaroo pocket
        return mul3(t === 'cuff' ? HK2 : HK, n);
      }
      if (t === 'hair') return mul3(HR, n);
      if (t === 'lips') return mul3(LIP, n);
      if (t === 'neck' || t === 'hand') return mul3(ink(x, y, z) ? mix3(SK, INK, 0.75) : SKs, n);
      if (t === 'face') { const q = hdL(x, y, z); const blush = q.y > 0.05 && q.y < 0.09 && Math.abs(q.z) > 0.04 && nx > 0.3 ? 0.18 : 0; return mul3(mix3(SK, lin(0xe89a90), blush), n); }
      return mul3(SK, n);
    },
  });
  // ── face details: almond eyes with lids + lash line + winged liner, arched brows, full lips ──
  const lipMat = M.jLips || (M.jLips = phys(0xb27268, { roughness: 0.38, extra: { clearcoat: 0.4, clearcoatRoughness: 0.4 }, rimStrength: 0.15 }));
  const capUp = (L) => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, L);
  const capDn = (L) => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI - L, L);
  for (const s2 of [1, -1]) {
    const eg = group(head, [0.0862, 0.108, 0.036 * s2], [0, -0.12 * s2, 0]);
    eg.scale.set(1, 0.84, 1.25);
    add(eg, G.sphere, M.sclera, [0, 0, 0], 0.0145, [0, 0, 0], false);
    add(eg, G.sphere, eyeMat(0x6b5228), [0.0112, 0.0012, 0], [0.004, 0.0078, 0.0068], [0, 0, 0], false);
    add(eg, G.sphere, M.black, [0.0142, 0.0012, 0], [0.0012, 0.0034, 0.003], [0, 0, 0], false);
    add(eg, G.sphereLo, M.glint, [0.0146, 0.0032, 0.0022], 0.0012, [0, 0, 0], false);
    const lid = M.jLid || (M.jLid = std(0xd9a385, { roughness: 0.75, rim: false }));
    add(eg, capUp(0.98), M.black, [0, 0, 0], 0.0148, [0, 0, -0.22], false);      // lash line
    add(eg, capUp(0.86), lid, [0, 0, 0], 0.0153, [0, 0, -0.22], false);       // upper lid
    add(eg, capDn(0.9), lid, [0, 0, 0], 0.0151, [0, 0, 0.17], false);       // lower lid
    add(eg, G.box, M.black, [0.006, 0.0062, 0.0168 * s2], [0.0018, 0.0014, 0.0085], [-0.55 * s2, 0, 0], false); // winged liner
    const brow = new THREE.CatmullRomCurve3([new THREE.Vector3(0.104, 0.127, 0.013 * s2), new THREE.Vector3(0.1015, 0.1345, 0.035 * s2), new THREE.Vector3(0.089, 0.13, 0.056 * s2)]);
    add(head, new THREE.TubeGeometry(brow, 12, 0.0021, 5, false), M.jHair, [0, 0, 0], 1, [0, 0, 0], false);
    add(head, G.box, M.racDark, [0.1035, 0.0428, 0.0138 * s2], [0.0011, 0.0007, 0.0028], [0.55 * s2, 0, 0], false);   // soft upturned mouth corners
    add(head, G.sphere, lipMat, [0.1035, 0.0458, 0.0055 * s2], [0.0048, 0.0036, 0.0098], [0, 0, 0], false);   // upper lip (cupid's bow)
  }
  add(head, G.sphere, lipMat, [0.1025, 0.0378, 0], [0.0055, 0.0044, 0.0122], [0, 0, 0], false);              // lower lip
  add(head, G.box, M.racDark, [0.1055, 0.0418, 0], [0.0012, 0.0008, 0.017], [0, 0, 0], false);               // mouth line
  { const fr = new THREE.CylinderGeometry(0.106, 0.113, 0.046, 28, 1, true, Math.PI / 2 - 0.9, 1.8); const fm = add(head, fr, M.jHair, [-0.006, 0.169, 0], 1, [0, 0, 0], false); fm.material = M.jFringe || (M.jFringe = std(0x3a2619, { roughness: 0.7, rimStrength: 0.2, extra: { side: THREE.DoubleSide } })); }
  // crescent-moon + tiny star tattoos by the outer eye, freckles across the nose
  add(head, new THREE.TorusGeometry(0.0075, 0.0015, 6, 16, Math.PI * 1.1), M.ink, [0.077, 0.097, 0.063], 1, [0, 0.75, 0.5], false);
  add(head, G.box, M.ink, [0.083, 0.08, 0.058], [0.0018, 0.006, 0.0018], [0, 0.7, 0.6], false);
  add(head, G.box, M.ink, [0.083, 0.08, 0.058], [0.0018, 0.006, 0.0018], [0, 0.7, -0.6], false);
  for (let i = 0; i < 10; i++) { const z = (Math.random() - 0.5) * 0.07; add(head, G.sphereLo, M.freckle || (M.freckle = new THREE.MeshBasicMaterial({ color: 0x9a6248, transparent: true, opacity: 0.4, depthWrite: false })), [0.1 + (0.035 - Math.abs(z)) * 0.3, 0.076 + Math.random() * 0.014, z], 0.0012, [0, 0, 0], false); }
  // drawstrings
  for (const s2 of [1, -1]) add(torso, G.box, M.black, [0.1, 0.44, 0.035 * s2], [0.005, 0.12, 0.005], [0.05 * s2, 0, 0.18], false);
  // ── hair cards ──
  const cards = [], sway = [];
  const R = (a, b) => a + Math.random() * (b - a);
  const hc = head.localToWorld(new THREE.Vector3(-0.02, 0.08, 0)).clone();
  const card = (pos, rz, len, w, lift, droop, twist, rx = 0, curl = 0) => {
    const pv = group(head, pos, [rx, 0, rz]);
    cards.push({ mesh: add(pv, ribbon(len, w, lift, droop, twist, 10, curl), M.jHairCard, [0, 0, 0], 1, [0, 0, 0], false), center: hc });
    cards.push({ mesh: add(pv, ribbon(len * 0.92, w * 0.7, lift, droop, twist + Math.PI / 2, 10, curl), M.jHairCard, [0, 0, 0], 1, [0, 0, 0], false), center: hc });
    sway.push(pv); return pv;
  };
  // long back fall: from the crown around the back of the skull, straight down past the shoulders
  for (let i = 0; i < 48; i++) {
    const a = R(-1.3, 1.3), yy = R(0.02, 0.17);
    card([-0.045 - Math.cos(a) * 0.08, yy, Math.sin(a) * 0.1], 1.38 + R(-0.06, 0.06), R(0.42, 0.56), 0.05, 0.1, 0.12, R(-0.5, 0.5), -Math.sin(a) * 0.22, R(-0.3, 0.3));
  }
  // side layers framing the face, falling in front of the shoulders (choppy shag lengths)
  for (const s2 of [1, -1]) for (let i = 0; i < 13; i++) {
    const k = (i % 9) / 8;
    card([0.04 - k * 0.07, 0.15 - k * 0.04, s2 * (0.098 + k * 0.012)], 1.62 + R(-0.08, 0.08), R(0.3, 0.46) * (0.75 + k * 0.4), 0.045, 0.06, 0.1, R(-0.6, 0.6), -s2 * 0.12, R(-0.3, 0.3));
  }
  // short blunt baby bangs across the forehead
  for (let i = 0; i < 19; i++) {
    const a = -0.88 + (i / 18) * 1.76;
    card([-0.006 + Math.cos(a) * 0.117, 0.196, Math.sin(a) * 0.117], 1.6 + R(-0.03, 0.03), R(0.05, 0.054), 0.024, 0.01, 0.02, a, 0, 0);
  }
  root.updateMatrixWorld(true);
  bakeRigid(root, cards.map((c) => ({ mesh: c.mesh, owner: c.mesh.parent, center: c.center })), M.jHairCard, true);
  for (const sv of sway) sv.userData.base = sv.rotation.z;
  // mustard-yellow cuffed beanie, worn a little high and back
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const lathe = (pts, seg = 28) => smoothNormals(new THREE.LatheGeometry(pts, seg));
  const beanie = group(head, [-0.022, 0.18, 0], [0, 0, 0.16]);
  beanie.scale.setScalar(0.51);
  add(beanie, sculpt((v) => { if (v.y < 0) v.y *= 0.1; if (v.y > 0) v.y *= 1.12; }), M.beanie, [0, 0.03, 0], [0.235, 0.22, 0.23]);
  add(beanie, lathe([V2(0.228, -0.03), V2(0.25, -0.02), V2(0.257, 0.05), V2(0.252, 0.11), V2(0.226, 0.12)], 40), M.beanie, [0, 0, 0], [1, 1, 0.98]);
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; add(beanie, G.box, M.beanie, [Math.cos(a) * 0.257, 0.045, Math.sin(a) * 0.254], [0.012, 0.12, 0.018], [0, -a, 0], false); }
  const shadow = blobShadow(1.2); root.add(shadow);
  const st = { t: 0, open: 0, wave: 1 };
  function update(dt, j) {
    st.t += dt;
    st.open = damp(st.open, j.open ? 1 : 0, 6, dt);
    st.wave = damp(st.wave, j.waving && !j.open ? 1 : 0, 6, dt);
    body.position.y = Math.sin(st.t * 2) * 0.006 + (j.jump ? Math.abs(Math.sin(st.t * 7)) * 0.14 : 0);
    torso.rotation.z = Math.sin(st.t * 1.5) * 0.015 + st.open * 0.06;
    head.rotation.z = Math.sin(st.t * 1.1) * 0.04 - 0.05 * st.wave;
    head.rotation.x = Math.sin(st.t * 0.8) * 0.04;
    for (const A of arms) {
      const s = A.s, waving = s > 0 ? st.wave : 0;
      // rest: arms hang slightly out; wave: right arm up overhead; open: both reach forward for the catch
      A.up.rotation.x = -s * (0.1 + waving * 2.35 + st.open * 0.35 + (j.jump ? Math.abs(Math.sin(st.t * 7)) * 0.3 : 0));
      A.up.rotation.z = st.open * 1.15 + Math.sin(st.t * 1.5 + s) * 0.03;
      A.fore.rotation.x = -s * waving * (0.35 + Math.sin(st.t * 8) * 0.45);
      A.fore.rotation.z = st.open * 0.7 + 0.08;
    }
    for (const sv of sway) sv.rotation.z = sv.userData.base + Math.sin(st.t * 1.6 + sv.position.z * 40) * 0.025 + (j.jump ? Math.sin(st.t * 14) * 0.05 : 0);
    yaw.rotation.y = damp(yaw.rotation.y, j.faceCam ? -Math.PI / 2 : -Math.PI / 2 - 0.5, 4, dt);
  }
  return { root, update, head };
}

// ───────────────────────── collectibles & props ─────────────────────────
export function makeWatermelon() {
  const root = new THREE.Group();
  const spin = group(root);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.3, Math.PI * 0.05, Math.PI * 0.95, false); shape.lineTo(0, -0.02);
  const flesh = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 20 });
  flesh.translate(0, -0.12, -0.045);
  const fm = add(spin, flesh, W.flesh, [0, 0, 0], 1, [Math.PI, 0, 0]);
  const rind = add(spin, new THREE.TorusGeometry(0.315, 0.05, 10, 30, Math.PI * 0.9), W.rind, [0, 0.12, 0], 1, [0, 0, Math.PI + Math.PI * 0.05]);
  const white = add(spin, new THREE.TorusGeometry(0.285, 0.03, 8, 30, Math.PI * 0.9), W.white, [0, 0.12, 0], 1, [0, 0, Math.PI + Math.PI * 0.05]);
  for (let i = 0; i < 6; i++) { const a = Math.PI * (1.2 + i * 0.12); add(spin, G.sphereLo, W.seed, [Math.cos(a) * 0.17, 0.12 + Math.sin(a) * 0.17, 0.07], [0.018, 0.028, 0.01], [0, 0, a]); }
  spin.scale.setScalar(0.72);
  return { root, spin };
}
export function makeMinnow() {
  const root = new THREE.Group();
  const spin = group(root);
  add(spin, G.sphere, W.fish, [0, 0, 0], [0.26, 0.11, 0.07]);
  add(spin, G.sphere, W.fishBelly, [0.02, -0.035, 0], [0.2, 0.06, 0.06]);
  add(spin, G.cone, W.fin, [-0.29, 0, 0], [0.1, 0.13, 0.025], [0, 0, Math.PI / 2]);
  add(spin, G.cone, W.fin, [0.0, 0.1, 0], [0.06, 0.08, 0.015], [0, 0, -0.3]);
  eye(spin, [0.17, 0.025, 0.05], 0.025); eye(spin, [0.17, 0.025, -0.05], 0.025);
  spin.scale.setScalar(1.15);
  return { root, spin };
}
export const W = {};
export function buildPropMaterials() {
  W.flesh = phys(0xff3d5a, { roughness: 0.35, extra: { clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: new THREE.Color(0x5a0010) }, rimColor: 0xffb0b8, rimStrength: 0.4 });
  W.rind = phys(0x2f9a3a, { roughness: 0.4, extra: { clearcoat: 0.6 } });
  W.white = std(0xe9f7d0, { roughness: 0.6 });
  W.seed = std(0x1a1010, { roughness: 0.3, rim: false });
  W.fish = phys(0x4da3ff, { roughness: 0.22, metalness: 0.35, extra: { clearcoat: 1, emissive: new THREE.Color(0x0b3a7a) }, rimColor: 0xc8f0ff, rimStrength: 0.9 });
  W.fishBelly = phys(0xe8f6ff, { roughness: 0.25, metalness: 0.1, extra: { clearcoat: 1 } });
  W.fin = phys(0x5aa0e8, { roughness: 0.3, metalness: 0.3, extra: { transparent: true, opacity: 0.9 } });
  W.can = phys(0x3f7b5a, { roughness: 0.35, metalness: 0.6 });
  W.canRim = phys(0x9aa6a0, { roughness: 0.3, metalness: 0.8 });
  W.food = phys(0xffb347, { roughness: 0.4, extra: { emissive: new THREE.Color(0x6a3000) } });
  W.bed = phys(0x5b7fd6, { roughness: 0.85, extra: { sheen: 1, sheenColor: new THREE.Color(0xbcd0ff) } });
  W.bedPad = phys(0xf3e6c8, { roughness: 0.9, extra: { sheen: 1, sheenColor: new THREE.Color(0xffffff) } });
}
export function makeTrashCan() {
  const root = new THREE.Group();
  const can = group(root);
  add(can, new THREE.CylinderGeometry(0.28, 0.24, 0.8, 20), W.can, [0, 0.4, 0]);
  for (const y of [0.15, 0.4, 0.65]) add(can, new THREE.TorusGeometry(0.27, 0.015, 6, 24), W.canRim, [0, y, 0], 1, [Math.PI / 2, 0, 0]);
  const lid = group(root, [0, 0.82, 0]);
  add(lid, new THREE.CylinderGeometry(0.31, 0.31, 0.05, 20), W.canRim, [0, 0, 0]);
  add(lid, G.sphereLo, W.canRim, [0, 0.06, 0], [0.06, 0.04, 0.06]);
  const food = group(root, [0, 0.12, 0.9]);
  add(food, G.sphere, W.food, [0, 0, 0], [0.16, 0.08, 0.16]);  // burger-ish bun
  add(food, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), M.red, [0, -0.02, 0]);
  add(food, G.sphere, W.food, [0, -0.06, 0], [0.15, 0.04, 0.15]);
  food.visible = false;
  return { root, can, lid, food };
}
export function makeDogBed() {
  const root = new THREE.Group();
  add(root, new THREE.TorusGeometry(0.42, 0.13, 12, 28), W.bed, [0, 0.12, 0], [1, 0.6, 1], [Math.PI / 2, 0, 0]);
  add(root, new THREE.CylinderGeometry(0.42, 0.44, 0.12, 24), W.bedPad, [0, 0.07, 0]);
  return { root };
}

// Jessica as a hand-painted cartoon cutout (drawn from the owner's photos) standing in the 3D park.
// Two poses: waving hello, and arms out to catch Peabody. Crossfades between them; gentle idle sway + happy bounce.
export function makeJessica() {
  const root = new THREE.Group();
  const H = 1.85, W = H * 393 / 900;
  const load = (src) => { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(0, H / 2, 0);
  const mk = (src, op) => { const m = new THREE.MeshBasicMaterial({ map: load(src), transparent: true, alphaTest: 0.04, opacity: op, depthWrite: true, side: THREE.DoubleSide }); m.toneMapped = false; return m; };
  const body = new THREE.Group(); root.add(body);
  const wave = new THREE.Mesh(geo, mk('__JESS_WAVE__', 1)); body.add(wave);
  const cat = new THREE.Mesh(geo, mk('__JESS_CATCH__', 0)); cat.position.z = 0.002; cat.visible = false; body.add(cat);
  // soft contact shadow at her boots
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.36, 28), new THREE.MeshBasicMaterial({ color: 0x1d1a24, transparent: true, opacity: 0.32, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.scale.set(1, 0.42, 1); sh.position.set(0.02, 0.012, 0.05); root.add(sh);
  const head = new THREE.Group(); head.position.set(0, H * 0.86, 0); body.add(head);
  const st = { t: 0, open: 0 };
  function update(dt, j) {
    st.t += dt;
    st.open = damp(st.open, j.open ? 1 : 0, 7, dt);
    wave.material.opacity = 1 - st.open; cat.material.opacity = st.open;
    wave.visible = st.open < 0.99; cat.visible = st.open > 0.01;
    const hop = j.jump ? Math.abs(Math.sin(st.t * 7)) * 0.12 : 0;
    body.position.y = hop;
    body.rotation.z = Math.sin(st.t * 1.4) * 0.018 + (j.waving && !j.open ? Math.sin(st.t * 5) * 0.012 : 0);
    body.scale.set(1 - Math.sin(st.t * 2) * 0.004, 1 + Math.sin(st.t * 2) * 0.006, 1);
    sh.scale.set(1 - hop * 1.5, 0.42 * (1 - hop * 1.5), 1); sh.material.opacity = 0.32 * (1 - hop * 2);
  }
  return { root, update, head };
}

// ───────────────────────── BOSS: BIG RUSSIAN RIVER BOAR ─────────────────────────
// Sonoma County's feral hogs root up vineyards along the Russian River — perfect final boss.
export function makeBoar() {
  critterMats();
  M.tusk ||= std(0xf3ead2, { roughness: 0.35 });
  M.boarEar ||= std(0x3a2e27, { roughness: 0.9 });
  M.bristle ||= std(0x1c1714, { roughness: 0.95 });
  M.star ||= new THREE.MeshBasicMaterial({ color: 0xffe14a });
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw, [0, 0.3, 0]);
  const head = group(body, [0.3, 0.03, 0], [0, 0, -0.12]);
  const tail = group(body, [-0.31, 0.06, 0]);
  const legs = [];
  for (const [x, z] of [[0.17, 0.085], [0.17, -0.085], [-0.19, 0.085], [-0.19, -0.085]]) legs.push(group(body, [x, -0.08, z]));
  const S = [
    { bone: body, cone: [0.2, 0.03, 0, -0.24, 0.0, 0], r: [0.16, 0.13], k: 0.07, tag: 'torso' },
    { bone: body, ell: [0.13, 0.07, 0], r: [0.16, 0.155, 0.135], k: 0.07, tag: 'hump' },
    { bone: body, ell: [0, -0.05, 0], r: [0.25, 0.115, 0.135], k: 0.07, tag: 'belly' },
    { bone: body, ell: [-0.2, 0.0, 0.06], r: [0.1, 0.125, 0.07], mirrorZ: true, k: 0.06, tag: 'torso' },
    { bone: head, cone: [-0.09, 0.02, 0, 0.03, 0, 0], r: [0.13, 0.1], k: 0.06, tag: 'neck' },
    { bone: head, ell: [0.04, 0.0, 0], r: [0.115, 0.1, 0.095], k: 0.05, tag: 'head' },
    { bone: head, cone: [0.08, -0.01, 0, 0.25, -0.06, 0], r: [0.072, 0.046], k: 0.04, tag: 'snout' },
    { bone: head, ell: [0.255, -0.062, 0], r: [0.02, 0.045, 0.05], k: 0.012, tag: 'disk' },
    { bone: head, ell: [0.08, -0.06, 0.05], r: [0.075, 0.055, 0.042], mirrorZ: true, k: 0.035, tag: 'cheek' },
    { bone: tail, cone: [0, 0, 0, -0.03, -0.13, 0], r: [0.02, 0.011], k: 0.015, tag: 'tail' },
  ];
  legs.forEach((l, i) => {
    S.push({ bone: l, ell: [0, 0.0, 0], r: [0.075, 0.1, 0.055], k: 0.05, tag: 'leg' });
    S.push({ bone: l, cone: [0, 0.0, 0, 0.005, -0.19, 0], r: [0.05, 0.03], k: 0.03, tag: 'leg' });
    S.push({ bone: l, ell: [0.012, -0.205, 0], r: [0.036, 0.026, 0.032], k: 0.015, tag: 'hoof' });
  });
  const K1 = lin(0x2a221d), K2 = lin(0x5c4a3b), K3 = lin(0x7a6450), Sn = lin(0x3c312b), Dk = lin(0x9a7a72), Hf = lin(0x161210);
  sculptSkinned(root, S, M.critter, {
    step: 0.0085, sigma: 0.016, cacheKey: 'boar',
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.85 + fnoise(x, y, z) * 0.3, t = P.tag;
      const g = fnoise(x * 4.3, y * 4.3, z * 4.3);
      if (t === 'disk') return mul3(Dk, n);
      if (t === 'hoof') return mul3(Hf, n);
      if (t === 'snout') return mul3(mix3(Sn, Dk, sat((x - 0.5) * 3) * 0.3), n);
      let c = mix3(K1, K2, sat(g * 1.8 - 0.5));
      if (ny < -0.4) c = mix3(c, K3, 0.35);
      if ((t === 'hump' || t === 'neck') && ny > 0.5) c = mix3(c, lin(0x15110f), 0.6);
      return mul3(c, n);
    },
  });
  // tusks, ears, beady eyes, bristle mohawk
  for (const s of [1, -1]) {
    add(head, G.cone, M.tusk, [0.19, -0.035, 0.05 * s], [0.016, 0.085, 0.016], [0.25 * s, 0, -0.75]);
    add(head, G.cone, M.boarEar, [-0.02, 0.11, 0.065 * s], [0.045, 0.085, 0.02], [0.45 * s, 0, -0.35]);
  }
  const eyes = [eye(head, [0.1, 0.04, 0.072], 0.017, 0x9a2414), eye(head, [0.1, 0.04, -0.072], 0.017, 0x9a2414)];
  const brist = [];
  for (let i = 0; i < 13; i++) {
    const x = 0.3 - i * 0.045, y = x > 0.12 ? 0.23 - (x - 0.12) * 0.55 : 0.225 - (0.12 - x) * 0.32;
    const b = add(body, G.cone, M.bristle, [x, y, 0], [0.024, 0.09 + Math.sin(i * 1.7) * 0.02, 0.012], [0, 0, 0.55]); brist.push(b);
  }
  // dizzy stars
  const stars = group(head, [0.02, 0.24, 0]);
  const starG = new THREE.OctahedronGeometry(0.035, 0);
  for (let i = 0; i < 4; i++) { const m = add(stars, starG, M.star, [Math.cos(i * 1.57) * 0.15, 0, Math.sin(i * 1.57) * 0.15], 1, [0, 0, 0], false); }
  stars.visible = false;
  const shadow = blobShadow(1.2); root.add(shadow);
  const st = { yaw: 0, ph: 0, t: 0, sq: 1 };
  function update(dt, b) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(b.facing), b.state === 'charge' ? 4 : 9, dt); yaw.rotation.y = st.yaw;
    const sp = Math.abs(b.vx);
    st.ph += dt * (3 + sp * 2.6);
    const s = Math.sin(st.ph) * Math.min(1, sp / 1.2) * 0.75;
    legs[0].rotation.z = s; legs[3].rotation.z = s; legs[1].rotation.z = -s; legs[2].rotation.z = -s;
    body.position.y = 0.3 + Math.abs(Math.sin(st.ph)) * Math.min(1, sp / 3) * 0.03;
    let hz = -0.12 + Math.sin(st.t * 1.6) * 0.04, bz = 0;
    if (b.state === 'windup') { hz = -0.35; bz = 0.12; legs[0].rotation.z = -0.6 + Math.sin(st.t * 18) * 0.5; } // scrape the ground
    if (b.state === 'charge') { hz = -0.4; bz = -0.06; }
    if (b.state === 'stunned') { hz = 0.1 + Math.sin(st.t * 5) * 0.1; bz = Math.sin(st.t * 6) * 0.06; }
    if (b.state === 'stomp') { bz = b.stompK < 0.5 ? b.stompK * 0.8 : (1 - b.stompK) * 0.8; }
    head.rotation.z = damp(head.rotation.z, hz, 10, dt);
    body.rotation.z = damp(body.rotation.z, bz, 10, dt);
    head.rotation.x = b.state === 'stunned' ? Math.sin(st.t * 4) * 0.2 : 0;
    tail.rotation.x = Math.sin(st.t * 14) * 0.5;
    stars.visible = b.state === 'stunned'; stars.rotation.y = st.t * 5;
    st.sq = damp(st.sq, b.hitT > 0 ? 0.82 : 1, 30, dt);
    body.scale.set(1 / Math.sqrt(st.sq), st.sq, 1 / Math.sqrt(st.sq));
    for (let i = 0; i < brist.length; i++) brist[i].rotation.z = 0.55 + (b.state === 'windup' || b.state === 'charge' ? -0.45 : 0) + Math.sin(st.t * 3 + i) * 0.04;
    for (const e of eyes) e.scale.y = b.state === 'stunned' ? 0.3 : 1;
    shadow.visible = b.state !== 'gone';
  }
  return { root, update };
}

// ───────────────────────── BOSS: TOM, THE GIANT WILD TURKEY ─────────────────────────
// Rio Grande / Merriam's wild turkeys strut through Healdsburg's vineyards, parks and front lawns.
export function makeTurkey() {
  critterMats();
  M.tFeather ||= std(0x2a1c10, { roughness: 0.7 });
  M.tSheen ||= std(0x1e140c, { roughness: 0.4, metalness: 0.25 });
  M.tTip ||= std(0xd8b27a, { roughness: 0.75 });
  M.tBand ||= std(0x1a120c, { roughness: 0.8 });
  M.tBar ||= std(0xece4d4, { roughness: 0.8 });
  M.tRed ||= std(0xc8302a, { roughness: 0.5 });
  M.tBeak ||= std(0xd9c8a0, { roughness: 0.4 });
  M.tLeg ||= std(0xb8705e, { roughness: 0.6 });
  M.bristle ||= std(0x1c1714, { roughness: 0.95 });
  M.star ||= new THREE.MeshBasicMaterial({ color: 0xffe14a });
  const root = new THREE.Group();
  const yaw = group(root); const body = group(yaw, [0, 0.42, 0]);
  const neck = group(body, [0.12, 0.05, 0]);
  const tail = group(body, [-0.16, 0.06, 0]);
  const legs = [group(body, [0.02, -0.11, 0.055]), group(body, [0.02, -0.11, -0.055])];
  const S = [
    { bone: body, ell: [0, 0, 0], r: [0.18, 0.15, 0.13], k: 0.06, tag: 'torso' },
    { bone: body, ell: [0.09, -0.02, 0], r: [0.12, 0.135, 0.115], k: 0.06, tag: 'breast' },
    { bone: body, ell: [-0.12, 0.02, 0], r: [0.1, 0.1, 0.1], k: 0.06, tag: 'torso' },
    { bone: neck, cone: [0, 0, 0, 0.06, 0.17, 0], r: [0.05, 0.026], k: 0.03, tag: 'neck' },
    { bone: neck, ell: [0.075, 0.19, 0], r: [0.042, 0.036, 0.033], k: 0.025, tag: 'head' },
  ];
  for (const l of legs) {
    S.push({ bone: l, ell: [0, 0.02, 0], r: [0.055, 0.065, 0.042], k: 0.04, tag: 'thigh' });
    S.push({ bone: l, cone: [0, -0.02, 0, 0.01, -0.27, 0], r: [0.027, 0.018], k: 0.015, tag: 'leg' });
  }
  const K1 = lin(0x0b0704), Cu = lin(0x3c2210), Gr = lin(0x16221a), Rd = lin(0xc23a30), Bl = lin(0x8fb6dc), Wh = lin(0xe8eef5), Lg = lin(0xb8705e);
  sculptSkinned(root, S, M.critter, {
    step: 0.0085, sigma: 0.014, cacheKey: 'turkey',
    colorFn: (x, y, z, nx, ny, nz, P) => {
      const n = 0.85 + fnoise(x, y, z) * 0.3, t = P.tag;
      if (t === 'leg') return mul3(Lg, n);
      if (t === 'neck' || t === 'head') {
        let c = mix3(Rd, Bl, sat((y - 0.54) / 0.1));
        c = mix3(c, Wh, sat((y - 0.64) / 0.04));
        return mul3(c, 0.95 + fnoise(x * 3, y * 3, z * 3) * 0.1);
      }
      // iridescent bronze body: dark feathers, copper scalloped tips, green sheen on top
      const g = fnoise(x * 5.5, y * 5.5, z * 5.5);
      const scal = sat(Math.sin(x * 120 + Math.sin(z * 90) * 2) * 0.5 + Math.sin(y * 110) * 0.5);
      let c = mix3(K1, Cu, sat(g * 1.4 - 0.3) * 0.5 + scal * 0.35);
      if (ny > 0.35) c = mix3(c, Gr, 0.45);
      if (ny < -0.5) c = mix3(c, lin(0x1c140e), 0.5);
      return mul3(c, n);
    },
  });
  // head bits: beak, snood, wattle, caruncles, eyes
  add(neck, G.cone, M.tBeak, [0.122, 0.188, 0], [0.013, 0.04, 0.013], [0, 0, -Math.PI / 2]);
  const snood = add(neck, G.cone, M.tRed, [0.112, 0.17, 0], [0.009, 0.075, 0.009], [0, 0, Math.PI * 0.94]);
  add(neck, G.sphereLo, M.tRed, [0.085, 0.135, 0], [0.022, 0.048, 0.019]);
  for (let i = 0; i < 5; i++) add(neck, G.sphereLo, M.tRed, [0.035 + i * 0.008, 0.05 + i * 0.022, (i % 2 ? 1 : -1) * 0.028], 0.013, [0, 0, 0], false);
  const eyes = [eye(neck, [0.09, 0.205, 0.03], 0.009, 0x1a1210), eye(neck, [0.09, 0.205, -0.03], 0.009, 0x1a1210)];
  // beard tuft on the breast
  add(body, G.cone, M.bristle, [0.18, -0.03, 0], [0.016, 0.12, 0.012], [0, 0, Math.PI + 0.25]);
  // wings with barred flight feathers
  const wings = [];
  for (const s of [1, -1]) {
    const w = group(body, [0.02, 0.04, 0.12 * s]);
    add(w, G.sphere, M.tSheen, [-0.03, 0, 0], [0.15, 0.08, 0.03]);
    for (let i = 0; i < 6; i++) add(w, G.sphereLo, i % 2 ? M.tBar : M.tFeather, [-0.07 - i * 0.022, -0.05 + i * 0.004, 0.012 * s], [0.055, 0.011, 0.012], [0, 0, 0.25]);
    wings.push(w);
  }
  // toes
  for (const l of legs) for (const a of [-0.5, 0, 0.5]) add(l, G.cone, M.tLeg, [0.03 + Math.cos(a) * 0.02, -0.285, Math.sin(a) * 0.03], [0.008, 0.07, 0.008], [a, 0, -Math.PI / 2]);
  // the tail fan: 13 feathers on pivots so it can fold (strut) or spread (display)
  const fan = group(tail, [0, 0, 0]);
  const feathers = [];
  for (let i = 0; i < 13; i++) {
    const a = (i / 12 - 0.5) * 2.9;
    const piv = group(fan); piv.userData.a = a;
    add(piv, G.sphereLo, M.tFeather, [0, 0.13, 0], [0.008, 0.13, 0.04], [0, 0, 0], false);
    add(piv, G.sphereLo, M.tBand, [0, 0.245, 0], [0.0085, 0.025, 0.04], [0, 0, 0], false);
    add(piv, G.sphereLo, M.tTip, [0, 0.275, 0], [0.009, 0.03, 0.042], [0, 0, 0], false);
    feathers.push(piv);
  }
  // dizzy stars
  const stars = group(neck, [0.07, 0.3, 0]);
  const starG = new THREE.OctahedronGeometry(0.03, 0);
  for (let i = 0; i < 4; i++) add(stars, starG, M.star, [Math.cos(i * 1.57) * 0.12, 0, Math.sin(i * 1.57) * 0.12], 1, [0, 0, 0], false);
  stars.visible = false;
  const shadow = blobShadow(1.0); root.add(shadow);
  const st = { yaw: 0, ph: 0, t: 0, sq: 1, spread: 0.3, flap: 0 };
  function update(dt, b) {
    st.t += dt;
    st.yaw = damp(st.yaw, faceAngle(b.facing), b.state === 'charge' ? 5 : 9, dt); yaw.rotation.y = st.yaw;
    const sp = Math.abs(b.vx), flying = b.state === 'defeated' || b.state === 'stomp';
    st.ph += dt * (3 + sp * 2.2);
    const s = Math.sin(st.ph) * Math.min(1, sp / 1.0) * 0.8;
    legs[0].rotation.z = flying ? 0.5 : s; legs[1].rotation.z = flying ? 0.5 : -s;
    body.position.y = 0.42 + Math.abs(Math.sin(st.ph)) * Math.min(1, sp / 3) * 0.03;
    // head bob while walking, low and forward while charging
    let nz = Math.sin(st.ph * 2) * 0.12 * Math.min(1, sp), nx = 0, bz = 0;
    if (b.state === 'windup') { nz = 0.15 + Math.sin(st.t * 22) * 0.12; bz = 0.1; } // GOBBLE
    if (b.state === 'charge') { nz = -0.75; bz = -0.18; }
    if (b.state === 'stunned') { nz = 0.2 + Math.sin(st.t * 5) * 0.15; nx = Math.sin(st.t * 4) * 0.35; bz = Math.sin(st.t * 6) * 0.05; }
    neck.rotation.z = damp(neck.rotation.z, nz, 12, dt); neck.rotation.x = damp(neck.rotation.x, nx, 10, dt);
    body.rotation.z = damp(body.rotation.z, flying ? 0.15 : bz, 10, dt);
    snood.rotation.z = Math.PI * 0.94 + Math.sin(st.t * 9) * 0.15;
    // tail fan spreads to display when it gobbles / is angry, folds to strut otherwise
    const want = b.state === 'windup' || b.state === 'idle' && b.hp < b.hpMax / 2 ? 1 : b.state === 'charge' ? 0.15 : 0.45;
    st.spread = damp(st.spread, want, 6, dt);
    for (const f of feathers) f.rotation.x = f.userData.a * st.spread;
    fan.rotation.y = -1.2 - yaw.rotation.y;            // fan plane turned toward the camera so it reads
    fan.rotation.z = (1 - st.spread) * 0.9;              // folded fan tips back
    fan.scale.setScalar(0.7 + st.spread * 0.45);
    // wings: tucked, half out on the charge, full flaps when hopping / flying off
    const flapA = flying ? Math.sin(st.t * 24) * 1.1 : b.state === 'charge' ? 0.35 + Math.sin(st.t * 16) * 0.2 : b.state === 'windup' ? -0.15 : 0;
    st.flap = damp(st.flap, flapA, 18, dt);
    wings[0].rotation.x = -st.flap; wings[1].rotation.x = st.flap;
    stars.visible = b.state === 'stunned'; stars.rotation.y = st.t * 5;
    st.sq = damp(st.sq, b.hitT > 0 ? 0.82 : b.state === 'windup' ? 1.08 : 1, 30, dt);
    body.scale.set(1 / Math.sqrt(st.sq), st.sq, 1 / Math.sqrt(st.sq));
    for (const e of eyes) e.scale.y = b.state === 'stunned' ? 0.3 : 1;
    shadow.visible = b.state !== 'gone';
  }
  return { root, update };
}

// ───────────────────────── BENCH PEOPLE (painted cutouts, same art style as Jessica) ─────────────────────────
const BENCH_ART = [
  { src: '__BENCH_GRANDPA__', ar: 425 / 640, food: 'hotdog' },
  { src: '__BENCH_WOMAN__', ar: 421 / 640, food: 'burrito' },
  { src: '__BENCH_WINEMAKER__', ar: 426 / 640, food: 'burrito' },
  { src: '__BENCH_GRANDMA__', ar: 426 / 640, food: 'hotdog' },
];
export const BENCH_FOODS = BENCH_ART.map((b) => b.food);
export function makeBencher(i) {
  const A = BENCH_ART[i % BENCH_ART.length];
  const root = new THREE.Group();
  const H = 1.62, W = H * A.ar;
  const t = new THREE.TextureLoader().load(A.src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(0, H / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }); mat.toneMapped = false;
  const body = new THREE.Group(); root.add(body);
  const m = new THREE.Mesh(geo, mat); body.add(m);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshBasicMaterial({ color: 0x1d1a24, transparent: true, opacity: 0.28, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.scale.set(1, 0.4, 1); sh.position.set(0, 0.012, 0.15); root.add(sh);
  const st = { t: Math.random() * 6, toss: 0 };
  function update(dt, s) {
    st.t += dt; st.toss = Math.max(0, st.toss - dt * 2.5);
    if (s.tossNow) st.toss = 1;
    const k = Math.sin(st.toss * Math.PI);
    body.rotation.z = Math.sin(st.t * 1.1) * 0.012 - k * 0.06;
    body.scale.set(1 + k * 0.03, 1 + Math.sin(st.t * 1.8) * 0.006 - k * 0.02, 1);
    body.position.y = s.happy ? Math.abs(Math.sin(st.t * 6)) * 0.04 : 0;
  }
  return { root, update, food: A.food };
}

export function makeFood(kind) {
  M.bun ||= std(0xdc9a52, { roughness: 0.6 });
  M.sausage ||= std(0xa8432a, { roughness: 0.35 });
  M.mustard ||= std(0xf2c618, { roughness: 0.4, emissive: 0x403000 });
  M.tortilla ||= std(0xf0d6a0, { roughness: 0.75 });
  M.foil ||= phys(0xd8dde4, { roughness: 0.22, metalness: 0.9 });
  M.foodGlow ||= new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  const root = new THREE.Group(); const g = group(root);
  if (kind === 'hotdog') {
    add(g, capsule(0.075, 0.32), M.bun, [0, -0.02, 0.04], [1, 1, 0.8], [0, 0, Math.PI / 2]);
    add(g, capsule(0.075, 0.32), M.bun, [0, -0.02, -0.04], [1, 1, 0.8], [0, 0, Math.PI / 2]);
    add(g, capsule(0.05, 0.42), M.sausage, [0, 0.03, 0], 1, [0, 0, Math.PI / 2]);
    for (let i = 0; i < 6; i++) add(g, G.sphereLo, M.mustard, [-0.17 + i * 0.068, 0.08, Math.sin(i * 2.2) * 0.02], [0.03, 0.012, 0.02], [0, 0, 0], false);
  } else {
    add(g, capsule(0.09, 0.28), M.tortilla, [0.06, 0, 0], 1, [0, 0, Math.PI / 2]);
    add(g, G.cyl, M.foil, [-0.1, 0, 0], [0.098, 0.24, 0.098], [0, 0, Math.PI / 2]);
    add(g, G.sphereLo, std(0x5a3a2a, { roughness: 0.8 }), [0.235, 0.0, 0], [0.012, 0.06, 0.06]);
  }
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), M.foodGlow); root.add(glow);
  const sh = blobShadow(0.45); root.add(sh);
  let t = 0;
  function update(dt, onGround) { t += dt; g.rotation.y = t * 2.4; g.position.y = onGround ? 0.06 + Math.sin(t * 4) * 0.05 : 0; glow.scale.setScalar(1 + Math.sin(t * 6) * 0.08); sh.visible = onGround; sh.position.y = -root.position.y + 0.012; }
  return { root, update };
}
