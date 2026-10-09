// The 3D town of Healdsburg: sky, lighting, streets, storefronts, plaza, vineyards.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mats, tex, SHOP_NAMES, SIGN_COLS, SIGN_ROWS, addRim } from './materials.js';
import { WORLD, ZONES } from './world.js';
import { seed, rnd, srand, srandInt, spick, smoothstep } from './util.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _c = new THREE.Color();
const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14).toNonIndexed(),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6).toNonIndexed(),
  sph: new THREE.SphereGeometry(1, 12, 9).toNonIndexed(),
  sphHi: new THREE.SphereGeometry(1, 20, 14).toNonIndexed(),
  cone: new THREE.ConeGeometry(1, 1, 12).toNonIndexed(),
  ico: new THREE.IcosahedronGeometry(1, 1).toNonIndexed(),
  plane: new THREE.PlaneGeometry(1, 1).toNonIndexed(),
};

// Accumulates transformed, vertex-coloured pieces then merges them into one mesh
class GB {
  constructor(ao = true) { this.parts = []; this.ao = ao; }
  add(geo, pos, scale, rot, color, uvFn) {
    const g = geo.clone();
    _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
    _q.setFromEuler(_e);
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, typeof scale === 'number' ? _s.setScalar(scale) : _s.set(scale[0], scale[1], scale[2]));
    g.applyMatrix4(_m);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (uvFn) uvFn(g.attributes.uv);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    _c.set(color);
    const pa = g.attributes.position.array;
    for (let i = 0; i < n; i++) {
      const ao = this.ao ? 0.62 + 0.38 * smoothstep(-0.1, 1.4, pa[i * 3 + 1]) : 1;
      col[i * 3] = _c.r * ao; col[i * 3 + 1] = _c.g * ao; col[i * 3 + 2] = _c.b * ao;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.parts.push(g);
    return g;
  }
  box(w, h, d, x, y, z, color, rot) { return this.add(UNIT.box, [x, y, z], [w, h, d], rot, color); }
  mesh(mat, opts = {}) {
    if (!this.parts.length) return null;
    const geo = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
    return m;
  }
}

export class Env {
  constructor(scene, layout, quality) {
    this.scene = scene; this.layout = layout; this.q = quality;
    this.root = new THREE.Group(); scene.add(this.root);
    this.animated = [];
    this.buildSky();
    this.buildLights();
    this.buildBackdrop();
    this.buildGround();
    this.buildTown();
    this.buildZones();
  }

  buildSky() {
    const sunDir = new THREE.Vector3(-0.45, 0.32, -0.83).normalize();
    this.sunDir = sunDir;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { sunDir: { value: sunDir } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 sunDir;
        void main(){
          float h = vDir.y;
          vec3 top = vec3(0.24,0.45,0.86), mid = vec3(0.56,0.72,0.93), hor = vec3(1.0,0.80,0.62), low = vec3(0.98,0.72,0.55);
          vec3 c = mix(hor, mid, smoothstep(-0.02, 0.1, h));
          c = mix(c, top, smoothstep(0.1, 0.45, h));
          c = mix(low, c, smoothstep(-0.12, 0.0, h));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          c += vec3(1.0,0.72,0.4) * pow(s, 8.0) * 0.45 + vec3(1.0,0.9,0.7) * pow(s, 400.0) * 3.0;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    // puffy 3D clouds
    this.clouds = [];
    const cm = addRim(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffd9b8, emissiveIntensity: 0.35, fog: false }), 0xffe2c0, 0.6, 1.8);
    seed(99);
    for (let i = 0; i < 9; i++) {
      const gb = new GB(false);
      const n = srandInt(5, 9);
      for (let j = 0; j < n; j++) gb.add(UNIT.sphHi, [srand(-8, 8) * (1 - Math.abs(j - n / 2) / n), srand(0, 2.5), srand(-2, 2)], [srand(3, 5.5), srand(2.4, 4), srand(2.4, 4)], null, '#ffffff');
      gb.add(UNIT.sphHi, [0, -0.6, 0], [10, 1.6, 3.5], null, '#f0e6ee');
      const m = gb.mesh(cm, { cast: false, receive: false });
      m.position.set(i * 70 - 150, srand(40, 80), -320 - srand(0, 120));
      m.userData.par = srand(0.86, 0.93); m.userData.base = m.position.x; m.userData.drift = srand(0.3, 1);
      m.scale.setScalar(srand(1.8, 3));
      this.scene.add(m); this.clouds.push(m);
    }
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x9a7454, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffcf96, 3.6);
    sun.castShadow = true;
    const S = this.q.shadowSize;
    sun.shadow.mapSize.set(S, S);
    const cam = sun.shadow.camera; cam.left = -22; cam.right = 22; cam.top = 14; cam.bottom = -10; cam.near = 1; cam.far = 80;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    this.scene.add(sun); this.scene.add(sun.target);
    this.sun = sun;
    const rim = new THREE.DirectionalLight(0xa8c4ff, 0.9);
    rim.position.set(6, 8, -12); this.scene.add(rim); this.scene.add(rim.target);
    this.rim = rim;
    const fill = new THREE.DirectionalLight(0xffe8d2, 0.55); // camera-side fill keeps faces readable
    fill.position.set(0, 4, 20); this.scene.add(fill); this.scene.add(fill.target);
    this.fill = fill;
  }

  buildBackdrop() {
    const img = document.getElementById('img-hills');
    const t = new THREE.Texture(img); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.set(1.6, 1);
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, depthWrite: false, toneMapped: true });
    m.color.setRGB(1.0, 0.95, 0.92);
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(640, 160), m);
    this.backdrop.position.set(0, 8, -260);
    this.backdrop.renderOrder = -1;
    this.scene.add(this.backdrop);
    this.backTex = t;
  }

  buildGround() {
    const L = 560, x0 = -40;
    // sidewalk
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(L, 4.0), mats.sidewalk);
    mats.sidewalk.map.repeat.set(L / 3, 4 / 3);
    sw.rotation.x = -Math.PI / 2; sw.position.set(x0 + L / 2, 0, -0.4); sw.receiveShadow = true; this.root.add(sw);
    // curb
    const gb = new GB(false);
    gb.box(L, 0.18, 0.25, x0 + L / 2, -0.09, 1.72, '#bdb3a4');
    gb.box(L, 0.05, 0.4, x0 + L / 2, -0.17, 2.0, '#6a6660');
    // building base strip behind sidewalk (alley shadow ground)
    gb.box(L, 0.02, 10, x0 + L / 2, -0.005, -7.5, '#8f8577');
    this.root.add(gb.mesh(mats.static, { cast: false }));
    // street
    const st = new THREE.Mesh(new THREE.PlaneGeometry(L, 20), mats.asphalt);
    mats.asphalt.map.repeat.set(L / 8, 20 / 8);
    st.rotation.x = -Math.PI / 2; st.position.set(x0 + L / 2, -0.18, 11.85); st.receiveShadow = true; this.root.add(st);
  }

  // ───────────── storefronts ─────────────
  buildTown() {
    const { buildings } = this.layout;
    seed(4242);
    const CH = 28;
    const chunks = new Map();
    const chunk = (x) => {
      const k = Math.floor(x / CH);
      if (!chunks.has(k)) chunks.set(k, { st: new GB(), glass: new GB(false), lit: new GB(false), sign: new GB(false), awn: new GB(false), glow: new GB(false), fol: new GB() });
      return chunks.get(k);
    };
    const signNames = [...SHOP_NAMES, "IGGY'S BURGERS"];
    for (const b of buildings) {
      const c = chunk(b.x0 + b.w / 2);
      if (b.iggy) { this.buildIggy(b, c, signNames); continue; }
      this.buildFacade(b, c, signNames);
    }
    // street lamps + string lights + planters, by x
    for (let x = -2.5; x < 486; x += 12) {
      if (ZONES.some((z) => x > z.x0 && x < z.x1 && z.type !== 'plaza')) continue;
      const c = chunk(x);
      this.lamp(c, x, 1.3);
    }
    for (let x = -10; x < 486; x += srand(5, 9)) {
      if (ZONES.some((z) => x > z.x0 - 1 && x < z.x1)) continue;
      if (WORLD.TOWN_BENCH_X.some((bx) => Math.abs(bx - x) < 1.6)) continue;
      const c = chunk(x);
      this.planter(c, x, -1.75);
    }
    // sidewalk benches (locals sit here and share their lunch)
    for (const x of WORLD.TOWN_BENCH_X) {
      const c = chunk(x);
      for (const dz of [-0.16, 0, 0.16]) c.st.box(1.9, 0.06, 0.14, x, 0.6, -1.92 + dz, '#8a5a32');
      for (const y of [0.8, 0.98, 1.16]) c.st.box(1.9, 0.1, 0.05, x, y, -2.14, '#8a5a32');
      for (const s of [-0.82, 0.82]) { c.st.box(0.07, 0.6, 0.07, x + s, 0.3, -1.72, '#2a2a2a'); c.st.box(0.07, 1.2, 0.07, x + s, 0.6, -2.17, '#2a2a2a'); c.st.box(0.07, 0.07, 0.55, x + s, 0.74, -1.92, '#2a2a2a'); c.st.box(0.07, 0.3, 0.07, x + s, 0.6, -1.74, '#2a2a2a'); }
    }
    // parked cars across the curb (foreground depth)
    const carCols = ['#c23b22', '#2f6db5', '#f2c14e', '#6fb8a8', '#f4efe6', '#8a4fa6'];
    
    for (const [, c] of chunks) {
      for (const [k, mat, opt] of [['st', mats.static], ['glass', mats.glass, { cast: false, receive: false }], ['lit', mats.glassLit, { cast: false, receive: false }], ['sign', mats.sign, { cast: false }], ['awn', mats.awning], ['glow', mats.glow, { cast: false, receive: false }], ['fol', mats.foliage]]) {
        const m = c[k].mesh(mat, opt); if (m) this.root.add(m);
      }
    }
  }

  signUV(idx, cols = SIGN_COLS, rows = SIGN_ROWS) {
    const col = idx % cols, row = Math.floor(idx / cols);
    const u0 = col / cols, u1 = (col + 1) / cols, v1 = 1 - row / rows, v0 = 1 - (row + 1) / rows;
    return (uv) => {
      // plane non-indexed: 6 verts with uvs at corners (0/1)
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    };
  }

  buildFacade(b, c, signNames) {
    const F = WORLD.FRONT_Z, D = 7;
    const { x0, w, H } = b;
    const cx = x0 + w / 2;
    const wall = b.wall, trim = b.trim;
    // main volume
    c.st.box(w, H, D, cx, H / 2, F - D / 2, wall);
    this.facadeStyle(b, c, F, D);
    c.st.box(w + 0.06, 0.35, 0.12, cx, 0.17, F + 0.04, trim); // plinth
    // roof treatments
    if (b.roof === 'arch') {
      // Quonset hut (Spoke Folk / Running Co): corrugated half-barrel roof with a ribbed front arch
      const r = w / 2 + 0.05;
      const g = new THREE.CylinderGeometry(r, r, D, 28, 1, false, -Math.PI / 2, Math.PI).toNonIndexed();
      c.st.add(g, [cx, H - 0.02, F - D / 2], 1, [-Math.PI / 2, 0, 0], wall);
      for (let i = 0; i < 3; i++) c.st.add(new THREE.TorusGeometry(r - 0.02 - i * 0.004, 0.045, 5, 28, Math.PI).toNonIndexed(), [cx, H - 0.02, F + 0.01 - i * 0.9], 1, null, i ? '#9da09f' : trim);
      for (let dx = -r + 0.45; dx < r - 0.3; dx += 0.45) { const hh = Math.sqrt(Math.max(0, r * r - dx * dx)); c.st.box(0.03, hh, 0.02, cx + dx, H + hh / 2 - 0.02, F + 0.005, '#a3a6a5'); }
    } else if (b.roof === 'flat') {
      c.st.box(w + 0.3, 0.28, 0.5, cx, H - 0.1, F + 0.1, trim);
      c.st.box(w + 0.15, 0.12, 0.35, cx, H - 0.35, F + 0.06, trim);
      for (let dx = -w / 2 + 0.25; dx < w / 2 - 0.1; dx += 0.42) c.st.box(0.14, 0.14, 0.12, cx + dx, H - 0.5, F + 0.06, trim);
    } else if (b.roof === 'false') {
      const ext = srand(0.8, 1.4);
      c.st.box(w, ext, 0.3, cx, H + ext / 2, F - 0.1, wall);
      c.st.box(w * 0.5, 0.5, 0.3, cx, H + ext + 0.25, F - 0.1, wall);
      c.st.box(w + 0.2, 0.18, 0.4, cx, H + ext, F + 0.02, trim);
      c.st.box(w * 0.5 + 0.2, 0.15, 0.4, cx, H + ext + 0.5, F + 0.02, trim);
    } else {
      const shape = new THREE.Shape(); shape.moveTo(-w / 2 - 0.3, 0); shape.lineTo(0, srand(1.4, 2.2)); shape.lineTo(w / 2 + 0.3, 0); shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: D + 0.4, bevelEnabled: false });
      const rc = spick(['#7a4a3a', '#5d5a6a', '#8c5b3b']);
      c.st.add(g, [cx, H, F - D - 0.1], 1, null, b.roofCol || rc);
      c.st.box(w + 0.2, 0.2, 0.3, cx, H, F + 0.05, trim);
    }
    // storefront (ground floor)
    const winW = b.style === 'glass' || b.style === 'modern' ? Math.min(w - 0.9, 5.6) : Math.min(w - 1.6, 4.4);
    const doorX = b.doorX ?? (cx + (rnd() < 0.5 ? -1 : 1) * (winW / 2 + 0.05) * 0.0 + (w > 6 ? srand(-0.6, 0.6) : 0));
    // big lit windows on each side of the door
    const doorW = 0.95;
    const leftW = (winW - doorW) / 2;
    for (const s of [-1, 1]) {
      const wx = doorX + s * (doorW / 2 + leftW / 2 + 0.05);
      c.st.box(leftW + 0.16, 2.0, 0.14, wx, 1.45, F + 0.05, trim);
      c.lit.box(leftW, 1.8, 0.05, wx, 1.48, F + 0.135, '#fff');
      c.st.box(0.06, 1.8, 0.05, wx, 1.48, F + 0.18, trim);
      c.st.box(leftW + 0.2, 0.08, 0.26, wx, 0.5, F + 0.14, trim); // sill
    }
    // door
    c.st.box(doorW + 0.18, 2.35, 0.14, doorX, 1.18, F + 0.04, trim);
    c.st.box(doorW, 2.2, 0.08, doorX, 1.1, F + 0.105, '#5a3a24');
    c.glass.box(doorW * 0.7, 1.0, 0.03, doorX, 1.55, F + 0.165, '#fff');
    c.st.add(UNIT.sph, [doorX + doorW * 0.36, 1.05, F + 0.18], 0.05, null, '#d4af37');
    if (b.pet) this.buildPetExtras(c, b, doorX, doorW, F);
    // sign board above storefront
    const idx = signNames.indexOf(b.name);
    const sW = Math.min(w - 0.8, 3.3), sH = sW / 4;
    const sy = 3.05 + sH / 2;
    const shape = (b.sign && b.sign.shape) || 'rect';
    if (shape === 'rect') c.st.box(sW + 0.2, sH + 0.2, 0.12, cx, sy, F + 0.06, trim);
    else if (shape !== 'wall') for (const s of [-0.3, 0.3]) c.st.box(0.05, 0.05, 0.2, cx + s * sW, sy + sH * 0.36, F + 0.08, '#2a2a2a'); // stand-off pins
    c.sign.add(UNIT.plane, [cx, sy, F + (shape === 'wall' ? 0.02 : 0.125)], [sW, sH, 1], null, '#fff', this.signUV(idx));
    // sign lamps (gooseneck) — glow bulbs
    for (const s of [-0.33, 0.33]) {
      c.st.box(0.04, 0.04, 0.4, cx + s * sW, sy + sH / 2 + 0.2, F + 0.25, '#2a2a2a');
      c.glow.add(UNIT.sph, [cx + s * sW, sy + sH / 2 + 0.16, F + 0.44], 0.07, null, '#ffd9a0');
    }
    // upper floors
    if (b.style === 'glass') { this.curtainWall(b, c, F); }
    for (let f = 1; f < b.floors && b.style !== 'glass'; f++) {
      const fy = 3.6 + (f - 1) * 2.6 + 1.4;
      const nW = Math.max(1, Math.floor(w / 1.7));
      const span = w - 1.0;
      for (let i = 0; i < nW; i++) {
        const wx = x0 + 0.5 + (span / nW) * (i + 0.5);
        const lit = rnd() < 0.35;
        c.st.box(0.92, 1.5, 0.12, wx, fy, F + 0.04, trim);
        (lit ? c.lit : c.glass).box(0.74, 1.32, 0.04, wx, fy, F + 0.125, '#fff');
        c.st.box(0.04, 1.32, 0.04, wx, fy, F + 0.165, trim);
        c.st.box(0.74, 0.04, 0.04, wx, fy + 0.1, F + 0.165, trim);
        c.st.box(1.04, 0.1, 0.2, wx, fy - 0.8, F + 0.1, trim);
        c.st.box(1.04, 0.14, 0.12, wx, fy + 0.83, F + 0.06, trim);
        if (rnd() < 0.4 || b.flowers) { // flower box
          c.st.box(0.9, 0.22, 0.26, wx, fy - 0.95, F + 0.2, '#6b4a2b');
          for (let k = 0; k < 5; k++) c.fol.add(UNIT.ico, [wx - 0.36 + k * 0.18, fy - 0.78, F + 0.22 + srand(-0.05, 0.05)], srand(0.09, 0.13), null, spick(['#e2588e', '#ff6f61', '#ffd34d', '#ffffff', '#c86bd8', '#3f8a3a', '#4f9a3a']));
        }
        if (rnd() < 0.3) for (const s of [-1, 1]) c.st.box(0.3, 1.4, 0.05, wx + s * 0.62, fy, F + 0.125, spick(['#2f5d50', '#3d5a80', '#7a2e2e', '#2e3a4a']));
      }
      c.st.box(w + 0.04, 0.12, 0.1, cx, 3.6 + (f - 1) * 2.6 - 0.05, F + 0.04, trim); // floor band
    }
    // awning (platform)
    if (b.awning) this.awning(c, b.awning.x0, b.awning.w, b.awning.y, b.awn, F, b.stripe);
    if (b.flowers) this.flowerStand(c, b, doorX, F);
    if (b.balcony) this.balcony(c, b.balcony.x0, b.balcony.w, b.balcony.y, F);
    // string lights across the facade
    if (rnd() < 0.55) this.stringLights(c, x0 + 0.2, x0 + w - 0.2, Math.min(H - 0.6, 3.6 + sH + 0.4), F + 0.3);
  }

  // per-shop construction details so each storefront reads like the real building
  facadeStyle(b, c, F, D) {
    const { x0, w, H } = b, cx = x0 + w / 2, st = b.style || 'plain';
    const hash = (i) => { const v = Math.sin((x0 * 7.13 + i) * 12.9898) * 43758.5453; return v - Math.floor(v); };
    const shade = (hex, k) => { const col = new THREE.Color(hex); col.multiplyScalar(k); return '#' + col.getHexString(); };
    if (st === 'brick') {
      for (let y = 0.5, r = 0; y < H - 0.4; y += 0.24, r++) {
        if (y > 0.6 && y < 3.0) continue; // storefront zone stays clean
        c.st.box(w + 0.01, 0.025, 0.02, cx, y, F + 0.005, shade(b.wall, 0.72));
        for (let x = x0 + (r % 2 ? 0.25 : 0.5); x < x0 + w - 0.1; x += 0.5) c.st.box(0.025, 0.22, 0.02, x, y + 0.12, F + 0.005, shade(b.wall, 0.72));
      }
      c.st.box(w + 0.1, 0.22, 0.16, cx, 3.25, F + 0.06, b.trim); // soldier course
    } else if (st === 'board') {
      // Barndiva: stained board-and-batten barn siding with a Cor-Ten steel band
      for (let x = x0 + 0.16; x < x0 + w - 0.05; x += 0.32) c.st.box(0.06, H - 0.4, 0.05, x, H / 2 + 0.15, F + 0.02, shade(b.wall, 0.62));
      c.st.box(w + 0.08, 0.3, 0.08, cx, 2.85, F + 0.06, '#8a4b26');
      c.st.box(w + 0.08, 0.12, 0.08, cx, H - 0.2, F + 0.06, '#8a4b26');
      for (const s of [-1, 1]) c.glow.add(UNIT.sph, [cx + s * (w / 2 - 0.45), 2.55, F + 0.28], 0.09, null, '#ffcf8a');
    } else if (st === 'stone') {
      let i = 0;
      for (let y = 0.4; y < H - 0.25; y += 0.38) {
        let x = x0 + (Math.round(y * 10) % 2 ? 0 : 0.25);
        while (x < x0 + w - 0.05) {
          const len = Math.min(0.45 + hash(i++) * 0.5, x0 + w - x);
          if (!(y > 0.55 && y < 2.85 && Math.abs(x + len / 2 - cx) < w / 2 - 0.55)) c.st.box(len - 0.05, 0.33, 0.04, x + len / 2, y + 0.17, F + 0.02, shade(b.wall, 0.82 + hash(i++) * 0.3));
          x += len;
        }
      }
    } else if (st === 'stucco') {
      for (const s of [-1, 1]) {
        c.st.box(0.36, H - 0.3, 0.14, cx + s * (w / 2 - 0.18), H / 2, F + 0.06, shade(b.wall, 0.9)); // pilasters
        for (let y = 0.7; y < H - 0.6; y += 0.62) c.st.box(0.46, 0.26, 0.18, cx + s * (w / 2 - 0.2), y, F + 0.08, shade(b.wall, 1.08)); // quoins
      }
      c.st.box(w + 0.35, 0.34, 0.45, cx, H - 0.08, F + 0.12, shade(b.wall, 0.86)); // deep cornice
    } else if (st === 'modern') {
      if (b.floors >= 2) for (let y = 3.75; y < H - 0.3; y += 0.17) c.st.box(w - 0.1, 0.1, 0.05, cx, y, F + 0.03, shade(b.trim, 0.9 + hash(Math.round(y * 9)) * 0.2));
      c.st.box(w + 0.1, 0.12, 0.5, cx, 2.8, F + 0.22, '#1a1a1c'); // steel canopy fin (below the sign)
    } else if (st === 'craftsman') {
      for (let y = 0.45; y < H - 0.15; y += 0.22) c.st.box(w + 0.01, 0.035, 0.03, cx, y, F + 0.01, shade(b.wall, 0.7));
      for (const s of [-1, 1]) { // tapered porch columns on stone piers
        c.st.box(0.42, 0.9, 0.42, cx + s * (w / 2 - 0.35), 0.45, F + 0.6, '#8b8277');
        c.st.box(0.26, 1.85, 0.26, cx + s * (w / 2 - 0.35), 1.82, F + 0.6, b.trim);
      }
      c.st.box(w + 0.2, 0.18, 1.2, cx, 2.78, F + 0.55, b.trim); // porch beam (under the sign)
    } else if (st === 'quonset') {
      c.st.box(w + 0.02, 0.1, 0.06, cx, H - 0.05, F + 0.03, b.trim);
    }
  }

  curtainWall(b, c, F) {
    // Little Saint / The Matheson: steel-and-glass upper storeys
    const { x0, w, H } = b, cx = x0 + w / 2;
    const y0 = 3.6, y1 = H - 0.45;
    if (y1 <= y0 + 0.5) return;
    c.st.box(w - 0.5, y1 - y0, 0.04, cx, (y0 + y1) / 2, F + 0.08, '#41505c'); // tinted glazing (no sun glare)
    const n = Math.max(3, Math.round((w - 0.5) / 0.9));
    for (let i = 0; i <= n; i++) c.st.box(0.07, y1 - y0, 0.08, x0 + 0.25 + i * (w - 0.5) / n, (y0 + y1) / 2, F + 0.12, b.trim);
    for (let y = y0; y <= y1 + 0.01; y += 1.3) c.st.box(w - 0.4, 0.08, 0.1, cx, y, F + 0.12, b.trim);
    for (let i = 0; i < n; i += 2) c.lit.box((w - 0.5) / n - 0.12, 1.1, 0.03, x0 + 0.25 + (i + 0.5) * (w - 0.5) / n, y0 + 0.7, F + 0.105, '#fff');
  }

  flowerStand(c, b, doorX, F) {
    // Maison Fiori: buckets of blooms out front
    const cols = ['#e2588e', '#ff9fb8', '#ffffff', '#f6d04d', '#c86bd8', '#ff6f61', '#f4a3c0'];
    let k = 0;
    for (const s of [-1, 1]) {
      const bx = doorX + s * 1.25;
      for (let j = 0; j < 3; j++) {
        const px = bx + s * j * 0.42, h = 0.38 + (j % 2) * 0.16;
        c.st.add(UNIT.cyl, [px, h / 2, F + 0.55], [0.16, h, 0.16], null, '#7f8e86');
        for (let f = 0; f < 6; f++) c.fol.add(UNIT.ico, [px + Math.cos(f * 1.7) * 0.12, h + 0.08 + (f % 3) * 0.06, F + 0.55 + Math.sin(f * 1.7) * 0.12], 0.09, null, cols[k++ % cols.length]);
        c.fol.add(UNIT.ico, [px, h + 0.02, F + 0.55], 0.16, null, '#4f8a3a');
      }
    }
  }

  awning(c, ax, aw, y, color, F, stripe) {
    // sloped striped canopy from wall to past the lane, top surface ≈ y at z=0
    const z0 = F, z1 = 0.95, y0 = y + 0.33, y1 = y - 0.1;
    const len = Math.hypot(z1 - z0, y0 - y1);
    const ang = Math.atan2(y0 - y1, z1 - z0);
    const stripes = Math.max(2, Math.round(aw / 0.45));
    const g = c.awn.add(UNIT.box, [ax + aw / 2, (y0 + y1) / 2, (z0 + z1) / 2], [aw, 0.06, len], [ang, 0, 0], color);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * stripes / 2);
    // valance
    const v = c.awn.add(UNIT.box, [ax + aw / 2, y1 - 0.14, z1 + 0.02], [aw, 0.32, 0.04], null, color);
    const uv2 = v.attributes.uv; for (let i = 0; i < uv2.count; i++) uv2.setX(i, uv2.getX(i) * stripes / 2);
    // scallops
    for (let i = 0; i < stripes; i++) c.awn.add(UNIT.sph, [ax + (i + 0.5) * (aw / stripes), y1 - 0.3, z1 + 0.02], [aw / stripes / 2, 0.08, 0.02], null, color);
    // true two-colour stripes (Costeaux red/white, Noble Folk black/white, Willi's blue/white)
    if (stripe) {
      const sw = aw / (stripes * 2), nx = Math.cos(ang), ny = Math.sin(ang);
      for (let i = 0; i < stripes; i++) {
        const px = ax + (i * 2 + 1.5) * sw;
        c.awn.add(UNIT.box, [px, (y0 + y1) / 2 + 0.032 * nx, (z0 + z1) / 2 + 0.032 * ny], [sw, 0.01, len], [ang, 0, 0], stripe);
        c.awn.add(UNIT.box, [px, y1 - 0.14, z1 + 0.045], [sw, 0.32, 0.01], null, stripe);
      }
    }
    // iron brackets
    for (const s of [ax + 0.1, ax + aw - 0.1]) c.st.box(0.04, 0.04, len, s, (y0 + y1) / 2 - 0.05, (z0 + z1) / 2, '#2a2a2a', [ang, 0, 0]);
  }

  balcony(c, bx, bw, y, F) {
    c.st.box(bw, 0.16, 3.2, bx + bw / 2, y - 0.08, F + 1.6, '#cfc4b0');
    c.st.box(bw, 0.06, 0.06, bx + bw / 2, y + 0.65, 0.78, '#1f1f22');
    c.st.box(bw, 0.04, 0.04, bx + bw / 2, y + 0.12, 0.78, '#1f1f22');
    for (let x = bx + 0.05; x <= bx + bw; x += 0.18) c.st.box(0.025, 0.6, 0.025, x, y + 0.37, 0.78, '#1f1f22');
    for (const s of [bx + 0.05, bx + bw - 0.05]) c.st.box(0.05, 0.6, 3.2, s, y + 0.37, F + 1.6, '#1f1f22');
    for (let i = 0; i < 2; i++) c.fol.add(UNIT.ico, [bx + 0.4 + i * (bw - 0.8), y + 0.3, F + 0.4], 0.3, null, spick(['#3f8a3a', '#5a9a3a']));
  }

  stringLights(c, xa, xb, y, z) {
    const n = Math.max(6, Math.round((xb - xa) / 0.45));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = xa + (xb - xa) * t;
      const sag = Math.sin(t * Math.PI) * 0.45;
      if (i < n) {
        const x2 = xa + (xb - xa) * ((i + 1) / n), sag2 = Math.sin(((i + 1) / n) * Math.PI) * 0.45;
        const dx = x2 - x, dy = -sag2 + sag;
        c.st.box(Math.hypot(dx, dy), 0.015, 0.015, (x + x2) / 2, y - (sag + sag2) / 2, z, '#2b2b2b', [0, 0, Math.atan2(dy, dx)]);
      }
      c.glow.add(UNIT.sph, [x, y - sag - 0.06, z], 0.055, null, i % 3 === 0 ? '#ffe7b0' : '#ffd08a');
    }
  }

  lamp(c, x, z) {
    c.st.add(UNIT.cyl, [x, 0.25, z], [0.16, 0.5, 0.16], null, '#203a2e');
    c.st.add(UNIT.cyl, [x, 2.1, z], [0.06, 3.8, 0.06], null, '#203a2e');
    c.st.add(UNIT.cyl, [x, 3.95, z], [0.13, 0.12, 0.13], null, '#203a2e');
    c.glow.add(UNIT.sph, [x, 4.3, z], [0.24, 0.32, 0.24], null, '#ffe2a8');
    c.st.add(UNIT.cone, [x, 4.7, z], [0.2, 0.22, 0.2], null, '#203a2e');
    // hanging flower basket
    c.st.box(0.5, 0.04, 0.04, x + 0.25, 3.55, z, '#203a2e');
    for (let k = 0; k < 6; k++) c.fol.add(UNIT.ico, [x + 0.5 + srand(-0.15, 0.15), 3.25 + srand(-0.1, 0.1), z + srand(-0.15, 0.15)], 0.12, null, spick(['#e2588e', '#ff6f61', '#c86bd8', '#4f9a3a', '#4f9a3a']));
  }

  planter(c, x, z) {
    c.st.box(0.9, 0.5, 0.6, x, 0.25, z, '#8a7a66');
    c.st.box(1.0, 0.06, 0.7, x, 0.5, z, '#9d8e78');
    for (let k = 0; k < 8; k++) c.fol.add(UNIT.ico, [x + srand(-0.35, 0.35), 0.62 + srand(0, 0.2), z + srand(-0.2, 0.2)], srand(0.13, 0.2), null, spick(['#3f8a3a', '#5a9a3a', '#e2588e', '#ffd34d', '#ff6f61', '#4f9a3a']));
  }

  car(c, x, z, col) {
    const g = c.st;
    g.box(3.4, 0.6, 1.5, x, 0.35, z, col);
    g.box(2.0, 0.55, 1.36, x - 0.15, 0.9, z, col);
    g.box(3.5, 0.12, 1.55, x, 0.12, z, '#333');
    c.glass.box(1.9, 0.42, 1.38, x - 0.15, 0.92, z, '#fff');
    for (const sx of [-1.1, 1.1]) for (const sz of [-0.72, 0.72]) g.add(UNIT.cyl, [x + sx, 0.05, z + sz], [0.32, 0.22, 0.32], [Math.PI / 2, 0, 0], '#1a1a1a');
    c.glow.add(UNIT.sph, [x + 1.7, 0.45, z + 0.55], 0.08, null, '#fff3d0');
    c.glow.add(UNIT.sph, [x + 1.7, 0.45, z - 0.55], 0.08, null, '#fff3d0');
  }

  buildIggy(b, c, signNames) {
    const F = WORLD.FRONT_Z, D = 7, { x0, w } = b, H = 4.6, cx = x0 + w / 2;
    c.st.box(w, H, D, cx, H / 2, F - D / 2, '#fff3dc');
    // checkered base
    for (let i = 0; i < Math.floor(w / 0.3); i++) for (let j = 0; j < 3; j++) c.st.box(0.3, 0.3, 0.04, x0 + 0.15 + i * 0.3, 0.15 + j * 0.3, F + 0.03, (i + j) % 2 ? '#1d1d1f' : '#ffffff');
    c.st.box(w + 0.4, 0.4, 0.6, cx, H, F + 0.15, '#b3261e');
    c.st.box(w + 0.1, 0.12, 0.3, cx, 3.0, F + 0.1, '#b3261e');
    // windows
    for (const s of [-1, 1]) {
      const wx = cx + s * 2.7;
      c.st.box(3.3, 1.9, 0.14, wx, 1.75, F + 0.05, '#b3261e');
      c.lit.box(3.0, 1.65, 0.05, wx, 1.75, F + 0.145, '#fff');
    }
    // door
    const dX = WORLD.DOOR_X;
    c.st.box(1.5, 2.7, 0.16, dX, 1.35, F + 0.05, '#b3261e');
    c.lit.box(1.2, 2.45, 0.06, dX, 1.25, F + 0.16, '#fff');
    // big sign + neon outline
    const idx = signNames.indexOf("IGGY'S BURGERS");
    c.st.box(6.4, 1.8, 0.2, cx, H + 1.1, F + 0.2, '#7a1712');
    c.sign.add(UNIT.plane, [cx, H + 1.1, F + 0.32], [6.0, 1.5, 1], null, '#fff', this.signUV(idx));
    for (let i = 0; i < 26; i++) {
      const t = i / 26; const per = 2 * (6.2 + 1.7);
      let d = t * per, px, py;
      if (d < 6.2) { px = -3.1 + d; py = 0.85; } else if ((d -= 6.2) < 1.7) { px = 3.1; py = 0.85 - d; } else if ((d -= 1.7) < 6.2) { px = 3.1 - d; py = -0.85; } else { d -= 6.2; px = -3.1; py = -0.85 + d; }
      c.glow.add(UNIT.sph, [cx + px, H + 1.1 + py, F + 0.36], 0.07, null, i % 2 ? '#ffe36b' : '#ff6b5a');
    }
    // checkered awning
    this.awning(c, cx - 4.4, 8.8, 2.55, '#d8342a', F);
    c.st.box(0.1, 6, 0.1, x0 + 0.3, H / 2 + 0.5, F + 0.2, '#b3261e');
    c.st.box(0.1, 6, 0.1, x0 + w - 0.3, H / 2 + 0.5, F + 0.2, '#b3261e');
    // giant rotating burger on the roof (separate animated mesh)
    const burger = new THREE.Group();
    const bm = (col, r = 0.5) => addRim(new THREE.MeshPhysicalMaterial({ color: col, roughness: r, clearcoat: 0.4 }), 0xfff0c8, 0.4, 2.4);
    const bun = bm(0xd88a2e, 0.45), patty = bm(0x5a2f1c, 0.7), cheese = bm(0xffc21a, 0.4), lettuce = bm(0x5fbf3a, 0.6), tomato = bm(0xe0352b, 0.35);
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bun); top.position.y = 1.1; top.scale.y = 0.75; burger.add(top);
    const lt = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.14, 24), lettuce); lt.position.y = 1.02; burger.add(lt);
    const tm = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.18, 24), tomato); tm.position.y = 0.9; burger.add(tm);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 2.6), cheese); ch.position.y = 0.76; ch.rotation.y = 0.4; burger.add(ch);
    const pt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.4, 28), patty); pt.position.y = 0.52; burger.add(pt);
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.35, 0.4, 28), bun); bot.position.y = 0.15; burger.add(bot);
    for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), bm(0xfff3cf)); const a = Math.random() * 6.28, r = Math.random() * 0.9; s.position.set(Math.cos(a) * r, 1.1 + Math.sqrt(Math.max(0, 1.5 * 1.5 - r * r)) * 0.73, Math.sin(a) * r); s.scale.y = 0.5; burger.add(s); }
    burger.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    burger.position.set(cx + 4.0, H + 0.6, F - 1.6);
    burger.scale.setScalar(0.9);
    this.root.add(burger);
    this.animated.push((t) => { burger.rotation.y = t * 0.6; burger.position.y = H + 0.6 + Math.sin(t * 2) * 0.12; });
    this.iggySignPos = new THREE.Vector3(cx, H + 1.1, F);
  }

  // Fideaux Pets: open glowing doorway, floating golden bone and a FREE TREATS sandwich board
  buildPetExtras(c, b, doorX, doorW, F) {
    c.lit.box(doorW * 0.86, 2.05, 0.03, doorX, 1.05, F + 0.155, '#fff');
    c.glow.box(doorW + 0.3, 0.07, 0.07, doorX, 2.42, F + 0.2, '#ffe7a8');
    const gold = addRim(new THREE.MeshPhysicalMaterial({ color: 0xffc83a, roughness: 0.25, metalness: 0.6, clearcoat: 1, emissive: 0x6a3a00, emissiveIntensity: 0.5 }), 0xfff2c0, 0.6, 2.2);
    const bone = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.52, 16).rotateZ(Math.PI / 2), gold); bone.add(shaft);
    for (const sx of [-0.27, 0.27]) for (const sy of [-0.07, 0.07]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), gold); k.position.set(sx, sy, 0); bone.add(k); }
    bone.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    bone.position.set(doorX, 2.85, F + 0.55); this.root.add(bone);
    this.animated.push((t) => { bone.rotation.y = t * 1.4; bone.position.y = 2.85 + Math.sin(t * 2.6) * 0.08; });
    // chalk sandwich board
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320;
    const g = cv.getContext('2d');
    g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#23302a'; g.fillRect(14, 14, 228, 292);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe36b'; g.font = '700 54px Fredoka, sans-serif'; g.fillText('FREE', 128, 74);
    g.fillStyle = '#ffffff'; g.font = '700 46px Fredoka, sans-serif'; g.fillText('TREATS', 128, 128);
    g.fillStyle = '#9fe0ff'; g.font = '600 26px Fredoka, sans-serif'; g.fillText('for good dogs', 128, 172);
    g.fillStyle = '#ffb3c8'; g.font = '700 30px Fredoka, sans-serif'; g.fillText('come in!', 128, 268);
    g.fillStyle = '#ffffff'; for (const [x, y, r] of [[128, 222, 14], [108, 204, 6], [120, 198, 6], [136, 198, 6], [148, 204, 6]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.8 });
    const board = new THREE.Group();
    for (const s of [1, -1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.03), [wood, wood, wood, wood, s > 0 ? face : wood, s > 0 ? wood : face]);
      panel.position.set(0, 0.4, s * 0.12); panel.rotation.x = s * -0.16; panel.castShadow = true; board.add(panel);
    }
    board.position.set(doorX + 1.25, 0, -1.55); board.rotation.y = -0.25; this.root.add(board);
    this.petSignPos = new THREE.Vector3(doorX, 2.85, F);
  }

  // ───────────── plaza, vineyard vista, park ─────────────
  buildZones() {
    seed(777);
    const st = new GB(), fol = new GB(), glow = new GB(false), awn = new GB(false);
    const redwood = (x, z, s) => {
      st.add(UNIT.cyl, [x, 4 * s, z], [0.35 * s, 8 * s, 0.35 * s], null, '#7a3e26');
      for (let i = 0; i < 6; i++) fol.add(UNIT.cone, [x, (4 + i * 1.7) * s, z], [(2.6 - i * 0.36) * s, 2.6 * s, (2.6 - i * 0.36) * s], [0, i, 0], i % 2 ? '#2f5d34' : '#386b3a');
    };
    const oak = (x, z, s) => {
      st.add(UNIT.cyl, [x, 1.4 * s, z], [0.22 * s, 2.8 * s, 0.22 * s], null, '#6b4a2b');
      for (let i = 0; i < 7; i++) fol.add(UNIT.ico, [x + srand(-1.3, 1.3) * s, (3.2 + srand(-0.4, 0.9)) * s, z + srand(-1, 1) * s], srand(0.9, 1.4) * s, null, spick(['#4f8a3a', '#5a9a3a', '#6aa848', '#447a34']));
    };
    for (const zn of ZONES) {
      const x0 = zn.x0, x1 = Math.min(zn.x1, 500), cx = (x0 + x1) / 2;
      if (zn.type === 'plaza' || zn.type === 'park') {
        const lawn = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 30), mats.grass);
        mats.grass.map.repeat.set((x1 - x0) / 4, 30 / 4);
        lawn.rotation.x = -Math.PI / 2; lawn.position.set(cx, 0.01, -17.4); lawn.receiveShadow = true; this.root.add(lawn);
        // low hedge border
        for (let x = x0 + 0.5; x < x1; x += 0.9) fol.add(UNIT.ico, [x, 0.3, -2.6], [0.55, 0.42, 0.4], null, '#4c8a3a');
        for (let i = 0; i < Math.floor((x1 - x0) / 7); i++) redwood(x0 + 3 + i * 7 + srand(-1, 1), srand(-24, -12), srand(1.1, 1.5));
        for (let i = 0; i < Math.floor((x1 - x0) / 9); i++) oak(x0 + 5 + i * 9 + srand(-1, 1), srand(-9, -5), srand(0.9, 1.2));
        // benches
        for (let x = x0 + 6; x < x1 - 4; x += 11) { st.box(1.6, 0.08, 0.5, x, 0.5, -1.9, '#8a5a32'); st.box(1.6, 0.4, 0.06, x, 0.75, -2.15, '#8a5a32'); for (const s of [-0.7, 0.7]) st.box(0.06, 0.5, 0.5, x + s, 0.25, -1.95, '#2a2a2a'); }
        // flower beds
        for (let x = x0 + 3; x < x1 - 2; x += 5) for (let k = 0; k < 10; k++) fol.add(UNIT.ico, [x + srand(-1.2, 1.2), 0.18, -4 + srand(-0.6, 0.6)], srand(0.14, 0.24), null, spick(['#e2588e', '#ff6f61', '#ffd34d', '#ffffff', '#c86bd8', '#4f9a3a']));
      }
      if (zn.type === 'plaza') this.gazebo(st, fol, glow, 77, -7.5);
      if (zn.type === 'park') this.fountain(st, glow, WORLD.JESS_X + 3, -5);
      if (zn.type === 'vista') {
        // stone wall + vineyard rows receding toward the hills
        for (let x = x0; x < x1; x += 0.6) st.box(0.62, srand(0.5, 0.65), 0.5, x + 0.3, 0.28, -2.6, spick(['#a89a86', '#b8aa94', '#9a8c78']));
        const vine = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 30, 60), new THREE.MeshStandardMaterial({ color: 0xc9b06a, roughness: 1 }));
        vine.rotation.x = -Math.PI / 2; vine.position.set(cx, -0.02, -33); vine.receiveShadow = true; this.root.add(vine);
        for (let r = 0; r < 12; r++) {
          const zz = -4.5 - r * 3.2;
          for (let x = x0 - 12; x < x1 + 12; x += 1.1) fol.add(UNIT.ico, [x + srand(-0.2, 0.2), 0.5, zz], [0.62, 0.5, 0.38], null, spick(['#5f8a3a', '#6e9a40', '#58803a', '#7aa648']));
          if (r % 2 === 0) for (let x = x0 - 12; x < x1 + 12; x += 4.4) st.box(0.08, 1.2, 0.08, x, 0.6, zz, '#6b4a2b');
        }
        for (let i = 0; i < 4; i++) oak(x0 + 4 + i * 9, srand(-30, -20), srand(1.3, 1.8));
        // a winery barn
        st.box(8, 4.5, 6, cx + 6, 2.25, -40, '#9a2f1c'); const sh = new THREE.Shape(); sh.moveTo(-4.3, 0); sh.lineTo(0, 2.6); sh.lineTo(4.3, 0); sh.closePath();
        st.add(new THREE.ExtrudeGeometry(sh, { depth: 6.4, bevelEnabled: false }), [cx + 6, 4.5, -43.2], 1, null, '#4a4a52');
      }
    }
    // stands / canopies (platforms) everywhere in zones
    for (const s of this.layout.stands) {
      for (const px of [s.x0 + 0.1, s.x0 + s.w - 0.1]) for (const pz of [-1.6, 0.8]) st.add(UNIT.cyl, [px, s.y / 2, pz], [0.05, s.y, 0.05], null, '#f2efe6');
      const g = awn.add(UNIT.box, [s.x0 + s.w / 2, s.y + 0.05, -0.4], [s.w + 0.3, 0.1, 2.9], null, s.col);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.round(s.w / 0.45) / 2);
      // produce table
      st.box(s.w - 0.2, 0.08, 1.0, s.x0 + s.w / 2, 0.85, -1.2, '#8a5a32');
      for (let k = 0; k < 10; k++) fol.add(UNIT.ico, [s.x0 + 0.3 + (k / 10) * (s.w - 0.6), 0.98, -1.2 + srand(-0.3, 0.3)], 0.13, null, spick(['#ff6f61', '#ffd34d', '#7ac74f', '#c23b22', '#f29e38', '#8a4fa6']));
    }
    // floating cloud platforms
    const cloudMat = addRim(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, emissive: 0xfff0e0, emissiveIntensity: 0.25 }), 0xffe8c8, 0.7, 1.8);
    const cg = new GB(false);
    for (const p of this.layout.platforms) if (p.kind === 'cloud') {
      const n = Math.ceil(p.w / 0.5) + 1;
      for (let i = 0; i < n; i++) cg.add(UNIT.sphHi, [p.x + (i / (n - 1)) * p.w, p.y - 0.22 + Math.sin(i * 2.1) * 0.05, srand(-0.25, 0.25)], [0.42, 0.34, 0.6], null, '#ffffff');
      for (let i = 0; i < n - 1; i++) cg.add(UNIT.sphHi, [p.x + ((i + 0.5) / (n - 1)) * p.w, p.y - 0.06, 0], [0.36, 0.26, 0.5], null, '#ffffff');
    }
    const cm = cg.mesh(cloudMat, { cast: true, receive: false }); if (cm) this.root.add(cm);
    for (const [g, mat, o] of [[st, mats.static], [fol, mats.foliage], [glow, mats.glow, { cast: false }], [awn, mats.awning]]) { const m = g.mesh(mat, o); if (m) this.root.add(m); }

    // redwoods / hills behind the whole town (peeking above roofs) — instanced
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 1, 8); trunkGeo.translate(0, 0.5, 0);
    const crownGeo = new THREE.ConeGeometry(1, 1, 9); crownGeo.translate(0, 0.5, 0);
    const N = 160;
    const crowns = new THREE.InstancedMesh(crownGeo, addRim(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), 0xffe0b0, 0.35, 2.4), N * 3);
    let ci = 0;
    for (let i = 0; i < N; i++) {
      const x = -30 + i * 3.4 + srand(-1.2, 1.2), z = srand(-62, -34), s = srand(1.1, 1.7);
      for (let k = 0; k < 3; k++) {
        _m.compose(_p.set(x, (5 + k * 2.6) * s, z), _q.identity(), _s.set((2.4 - k * 0.55) * s, 4.2 * s, (2.4 - k * 0.55) * s));
        crowns.setMatrixAt(ci, _m);
        crowns.setColorAt(ci, _c.set(spick(['#2f6b3c', '#2a5f36', '#357843', '#3f7f45'])));
        ci++;
      }
    }
    crowns.count = ci; crowns.castShadow = false; crowns.receiveShadow = false;
    this.root.add(crowns);
    this.hills = [];
  }

  gazebo(st, fol, glow, x, z) {
    const R = 3.2;
    st.add(UNIT.cyl6, [x, 0.25, z], [R + 0.4, 0.5, R + 0.4], null, '#e9e3d6');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      st.add(UNIT.cyl, [x + Math.cos(a) * R, 2.1, z + Math.sin(a) * R], [0.12, 3.2, 0.12], null, '#fbf8f2');
      st.box(R, 0.5, 0.06, x + Math.cos(a + Math.PI / 6) * R * 0.87, 0.95, z + Math.sin(a + Math.PI / 6) * R * 0.87, '#fbf8f2', [0, -(a + Math.PI / 6) + Math.PI / 2, 0]);
    }
    st.add(UNIT.cyl6, [x, 3.8, z], [R + 0.3, 0.3, R + 0.3], null, '#fbf8f2');
    st.add(new THREE.ConeGeometry(R + 0.8, 2.2, 6).toNonIndexed(), [x, 5.05, z], 1, [0, Math.PI / 6, 0], '#5d5a6a');
    st.add(UNIT.cyl6, [x, 6.4, z], [0.4, 0.6, 0.4], null, '#fbf8f2');
    st.add(UNIT.cone, [x, 7.0, z], [0.45, 0.7, 0.45], null, '#5d5a6a');
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; glow.add(UNIT.sph, [x + Math.cos(a) * (R + 0.35), 3.62, z + Math.sin(a) * (R + 0.35)], 0.06, null, '#ffe2a0'); }
    // string lights from gazebo to the lamps
    for (const s of [-1, 1]) for (let i = 0; i <= 14; i++) {
      const t = i / 14; const px = x + s * (t * 12), pz = z + (1.3 - z) * t, py = 5.5 - t * 1.4 - Math.sin(t * Math.PI) * 0.8;
      glow.add(UNIT.sph, [px, py, pz], 0.06, null, i % 2 ? '#ffd08a' : '#ffe9b8');
    }
  }

  fountain(st, glow, x, z) {
    st.add(UNIT.cyl, [x, 0.3, z], [2.4, 0.6, 2.4], null, '#cfc6b6');
    st.add(UNIT.cyl, [x, 0.62, z], [2.1, 0.05, 2.1], null, '#5fb4d8');
    st.add(UNIT.cyl, [x, 1.3, z], [0.3, 1.6, 0.3], null, '#cfc6b6');
    st.add(UNIT.cyl, [x, 2.1, z], [1.0, 0.2, 1.0], null, '#cfc6b6');
    // heart arch for the finale
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      glow.add(UNIT.sph, [x - 3 + hx * 0.16, 4.2 + hy * 0.16, z + 1.5], 0.1, null, i % 2 ? '#ff6b9a' : '#ffd0e0');
    }
  }

  update(t, camX, playerX) {
    for (const c of this.clouds) c.position.x = camX * c.userData.par + c.userData.base + t * c.userData.drift;
    this.backdrop.position.x = camX;
    this.backTex.offset.x = camX * 0.0009;
    for (const h of this.hills) { /* static */ }
    this.sky.position.x = camX;
    // shadow camera follows the player
    // snap the shadow frustum to whole shadow-map texels so shadows don't shimmer as it follows the player
    const sc = this.sun.shadow.camera, S = this.sun.shadow.mapSize.x || 1024;
    const tx = (sc.right - sc.left) / S, ty = (sc.top - sc.bottom) / S;
    if (!this._sunRot) { this._sunRot = new THREE.Matrix4().lookAt(new THREE.Vector3(14, 22, 18), new THREE.Vector3(), new THREE.Vector3(0, 1, 0)); this._sunInv = this._sunRot.clone().invert(); this._sv = new THREE.Vector3(); }
    const v = this._sv.set(playerX + 4, 0, -2).applyMatrix4(this._sunInv);
    v.x = Math.round(v.x / tx) * tx; v.y = Math.round(v.y / ty) * ty;
    v.applyMatrix4(this._sunRot);
    this.sun.target.position.copy(v);
    this.sun.position.set(v.x + 14, v.y + 22, v.z + 18);
    this.rim.target.position.set(playerX, 1, 0); this.rim.position.set(playerX + 6, 8, -12);
    this.fill.target.position.set(playerX, 1, 0); this.fill.position.set(playerX - 3, 4, 20);
    for (const a of this.animated) a(t);
  }
}
