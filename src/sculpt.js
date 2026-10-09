// SDF sculpting → Surface Nets polygonizer → smooth-skinned single mesh.
// Lets characters be one continuous organic surface (no primitive seams) that
// still deforms with the existing group-based rig, like a real skinned model.
import * as THREE from 'three';

const _v = new THREE.Vector3();

// ── primitive SDFs (root space) ──
function sdRoundCone(px, py, pz, P) {
  const bax = P.bx - P.ax, bay = P.by - P.ay, baz = P.bz - P.az;
  const l2 = P.l2, rr = P.r1 - P.r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - P.ax, pay = py - P.ay, paz = pz - P.az;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const xvx = pax * l2 - bax * y, xvy = pay * l2 - bay * y, xvz = paz * l2 - baz * y;
  const x2 = xvx * xvx + xvy * xvy + xvz * xvz;
  const y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - P.r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - P.r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - P.r1;
}
function sdEllipsoid(px, py, pz, P) {
  // into the ellipsoid's local frame
  const dx = px - P.cx, dy = py - P.cy, dz = pz - P.cz, m = P.m;
  const lx = m[0] * dx + m[1] * dy + m[2] * dz;
  const ly = m[3] * dx + m[4] * dy + m[5] * dz;
  const lz = m[6] * dx + m[7] * dy + m[8] * dz;
  const k0 = Math.sqrt((lx / P.rx) ** 2 + (ly / P.ry) ** 2 + (lz / P.rz) ** 2);
  const k1 = Math.sqrt((lx / (P.rx * P.rx)) ** 2 + (ly / (P.ry * P.ry)) ** 2 + (lz / (P.rz * P.rz)) ** 2);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(P.rx, P.ry, P.rz);
}
function primDist(px, py, pz, P) { return P.type === 'cone' ? sdRoundCone(px, py, pz, P) : sdEllipsoid(px, py, pz, P); }
function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// Resolve primitive specs (bone-local) into root-space evaluators.
// spec: { bone, cone: [ax,ay,az, bx,by,bz], r: [r1,r2] } or { bone, ell: [cx,cy,cz], r: [rx,ry,rz], rot?: [x,y,z] }
// optional: k (blend radius), tag, mirrorZ (adds a z-mirrored twin)
function resolve(specs, rootInv) {
  const out = [];
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), m3 = new THREE.Matrix3();
  const push = (s, zs) => {
    const bm = tmpM.multiplyMatrices(rootInv, s.bone.matrixWorld);
    if (s.cone) {
      const a = new THREE.Vector3(s.cone[0], s.cone[1], s.cone[2] * zs).applyMatrix4(bm);
      const b = new THREE.Vector3(s.cone[3], s.cone[4], s.cone[5] * zs).applyMatrix4(bm);
      const P = { type: 'cone', ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, r1: s.r[0], r2: s.r[1], k: s.k ?? 0.03, bone: s.bone, tag: s.tag };
      P.l2 = Math.max(1e-8, a.distanceToSquared(b));
      const R = Math.max(P.r1, P.r2);
      P.min = [Math.min(a.x, b.x) - R, Math.min(a.y, b.y) - R, Math.min(a.z, b.z) - R];
      P.max = [Math.max(a.x, b.x) + R, Math.max(a.y, b.y) + R, Math.max(a.z, b.z) + R];
      out.push(P);
    } else {
      const c = new THREE.Vector3(s.ell[0], s.ell[1], s.ell[2] * zs).applyMatrix4(bm);
      const r = s.rot || [0, 0, 0];
      e.set(r[0] * zs, r[1] * zs, r[2]);
      q.setFromRotationMatrix(bm).multiply(new THREE.Quaternion().setFromEuler(e));
      // inverse rotation (world -> local)
      const inv = new THREE.Matrix4().makeRotationFromQuaternion(q).transpose();
      m3.setFromMatrix4(inv);
      const el = m3.elements; // column-major
      const m = [el[0], el[3], el[6], el[1], el[4], el[7], el[2], el[5], el[8]];
      const R = Math.max(s.r[0], s.r[1], s.r[2]);
      const P = { type: 'ell', cx: c.x, cy: c.y, cz: c.z, rx: s.r[0], ry: s.r[1], rz: s.r[2], m, k: s.k ?? 0.03, bone: s.bone, tag: s.tag };
      P.min = [c.x - R, c.y - R, c.z - R]; P.max = [c.x + R, c.y + R, c.z + R];
      out.push(P);
    }
  };
  for (const s of specs) { push(s, 1); if (s.mirrorZ) push(s, -1); }
  return out;
}

function evalAll(prims, x, y, z) {
  let d = 1e3;
  for (const P of prims) d = smin(d, primDist(x, y, z, P), P.k);
  return d;
}

// Surface Nets polygonizer over a regular grid
function surfaceNets(prims, step, pad = 0.04) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const P of prims) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], P.min[i] - pad); mx[i] = Math.max(mx[i], P.max[i] + pad); }
  const nx = Math.ceil((mx[0] - mn[0]) / step) + 1, ny = Math.ceil((mx[1] - mn[1]) / step) + 1, nz = Math.ceil((mx[2] - mn[2]) / step) + 1;
  const N = nx * ny * nz;
  const F = new Float32Array(N).fill(1e3);
  const idx = (i, j, k) => i + nx * (j + ny * k);
  // splat each primitive into its bounding box (blend margin)
  for (const P of prims) {
    const m = P.k + pad;
    const i0 = Math.max(0, Math.floor((P.min[0] - m - mn[0]) / step)), i1 = Math.min(nx - 1, Math.ceil((P.max[0] + m - mn[0]) / step));
    const j0 = Math.max(0, Math.floor((P.min[1] - m - mn[1]) / step)), j1 = Math.min(ny - 1, Math.ceil((P.max[1] + m - mn[1]) / step));
    const k0 = Math.max(0, Math.floor((P.min[2] - m - mn[2]) / step)), k1 = Math.min(nz - 1, Math.ceil((P.max[2] + m - mn[2]) / step));
    for (let k = k0; k <= k1; k++) {
      const z = mn[2] + k * step;
      for (let j = j0; j <= j1; j++) {
        const y = mn[1] + j * step;
        let o = idx(i0, j, k);
        for (let i = i0; i <= i1; i++, o++) F[o] = smin(F[o], primDist(mn[0] + i * step, y, z, P), P.k);
      }
    }
  }
  // one vertex per sign-changing cell
  const cellV = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [];
  const corner = new Float32Array(8);
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cOff = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const o = cOff[c]; const v = F[idx(i + o[0], j + o[1], k + o[2])]; corner[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      const va = corner[a], vb = corner[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb), oa = cOff[a], ob = cOff[b];
      sx += oa[0] + (ob[0] - oa[0]) * t; sy += oa[1] + (ob[1] - oa[1]) * t; sz += oa[2] + (ob[2] - oa[2]) * t; n++;
    }
    cellV[cidx(i, j, k)] = pos.length / 3;
    pos.push(mn[0] + (i + sx / n) * step, mn[1] + (j + sy / n) * step, mn[2] + (k + sz / n) * step);
  }
  // quads across sign-changing grid edges
  const ind = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (!flip) ind.push(a, c, b, a, d, c); else ind.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v0 = F[idx(i, j, k)], v1 = F[idx(i + 1, j, k)];
    if ((v0 < 0) !== (v1 < 0)) quad(cellV[cidx(i, j - 1, k - 1)], cellV[cidx(i, j, k - 1)], cellV[cidx(i, j, k)], cellV[cidx(i, j - 1, k)], v0 < 0);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = F[idx(i, j, k)], v1 = F[idx(i, j + 1, k)];
    if ((v0 < 0) !== (v1 < 0)) quad(cellV[cidx(i - 1, j, k - 1)], cellV[cidx(i - 1, j, k)], cellV[cidx(i, j, k)], cellV[cidx(i, j, k - 1)], v0 < 0);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = F[idx(i, j, k)], v1 = F[idx(i, j, k + 1)];
    if ((v0 < 0) !== (v1 < 0)) quad(cellV[cidx(i - 1, j - 1, k)], cellV[cidx(i, j - 1, k)], cellV[cidx(i, j, k)], cellV[cidx(i - 1, j, k)], v0 < 0);
  }
  return { pos, ind };
}

/**
 * Build a smooth-skinned mesh from SDF primitive specs attached to rig groups.
 * Call while the rig is in its rest (bind) pose and root has an identity transform.
 */
const _geoCache = new Map();
export function sculptSkinned(root, specs, material, { step = 0.0095, sigma = 0.018, colorFn = null, cacheKey = null, colorKey = null } = {}) {
  root.updateMatrixWorld(true);
  // same shape, different coat: reuse the polygonized surface + skinning, only recompute vertex colours
  if (cacheKey && colorKey && colorFn && _geoCache.has(cacheKey) && !_geoCache.has(cacheKey + '|' + colorKey)) {
    const base = _geoCache.get(cacheKey), near = base.userData.nearest;
    const prims = resolve(specs, new THREE.Matrix4().copy(root.matrixWorld).invert());
    const P = base.attributes.position.array, N = base.attributes.normal.array, nV = P.length / 3;
    const colors = new Float32Array(nV * 3);
    for (let i = 0; i < nV; i++) {
      const c = colorFn(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2], prims[near[i]], null, prims);
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    const g2 = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) g2.setAttribute(k, base.attributes[k]);
    g2.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g2.setIndex(base.index); g2.boundingSphere = base.boundingSphere; g2.userData.nearest = near;
    _geoCache.set(cacheKey + '|' + colorKey, g2);
  }
  if (cacheKey && colorKey && _geoCache.has(cacheKey + '|' + colorKey)) cacheKey = cacheKey + '|' + colorKey;
  if (cacheKey && _geoCache.has(cacheKey)) {
    // identical rig: reuse the polygonized geometry, bind to this instance's bones (same order as specs)
    const bones = [];
    for (const sp of specs) if (!bones.includes(sp.bone)) bones.push(sp.bone);
    const mesh = new THREE.SkinnedMesh(_geoCache.get(cacheKey), material);
    root.add(mesh); mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones), mesh.matrixWorld);
    mesh.frustumCulled = false; mesh.castShadow = true;
    return mesh;
  }
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const prims = resolve(specs, rootInv);
  const { pos, ind } = surfaceNets(prims, step);
  const nV = pos.length / 3;
  const normals = new Float32Array(nV * 3);
  const h = step * 0.35;
  // project vertices onto the true surface and take analytic-ish normals from the gradient
  for (let i = 0; i < nV; i++) {
    let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    let gx = 0, gy = 0, gz = 1;
    for (let it = 0; it < 3; it++) {
      const d = evalAll(prims, x, y, z);
      gx = evalAll(prims, x + h, y, z) - evalAll(prims, x - h, y, z);
      gy = evalAll(prims, x, y + h, z) - evalAll(prims, x, y - h, z);
      gz = evalAll(prims, x, y, z + h) - evalAll(prims, x, y, z - h);
      const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
      if (Math.abs(d) < step * 0.02) break;
      const s = Math.max(-step, Math.min(step, d));
      x -= gx * s; y -= gy * s; z -= gz * s;
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    normals[i * 3] = gx; normals[i * 3 + 1] = gy; normals[i * 3 + 2] = gz;
  }
  // bones = unique rig groups used by primitives
  const bones = [];
  const boneIndex = new Map();
  for (const P of prims) if (!boneIndex.has(P.bone)) { boneIndex.set(P.bone, bones.length); bones.push(P.bone); }
  const skinIndex = new Uint16Array(nV * 4), skinWeight = new Float32Array(nV * 4);
  const colors = new Float32Array(nV * 3), nearIdx = new Uint16Array(nV);
  const acc = new Float32Array(bones.length);
  for (let i = 0; i < nV; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    acc.fill(0);
    let dmin = 1e9, nearest = null, ni = 0;
    const ds = prims.map((P, pi) => { const d = primDist(x, y, z, P); if (d < dmin) { dmin = d; nearest = P; ni = pi; } return d; });
    nearIdx[i] = ni;
    for (let p = 0; p < prims.length; p++) acc[boneIndex.get(prims[p].bone)] += Math.exp(-(ds[p] - dmin) / sigma);
    // top 4
    const top = [];
    for (let b = 0; b < bones.length; b++) if (acc[b] > 1e-4) top.push([b, acc[b]]);
    top.sort((a, b) => b[1] - a[1]); top.length = Math.min(4, top.length);
    const sum = top.reduce((s, t) => s + t[1], 0);
    for (let t = 0; t < 4; t++) { skinIndex[i * 4 + t] = top[t] ? top[t][0] : 0; skinWeight[i * 4 + t] = top[t] ? top[t][1] / sum : 0; }
    const c = colorFn ? colorFn(x, y, z, normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2], nearest, ds, prims) : [1, 1, 1];
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(ind);
  geo.computeBoundingSphere();
  geo.userData.nearest = nearIdx;
  if (cacheKey) { _geoCache.set(cacheKey, geo); if (colorKey) _geoCache.set(cacheKey + '|' + colorKey, geo); }
  const mesh = new THREE.SkinnedMesh(geo, material);
  root.add(mesh);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones), mesh.matrixWorld);
  mesh.frustumCulled = false; mesh.castShadow = true;
  return mesh;
}

/**
 * Bake many small rigid meshes (hair cards etc.) into one skinned mesh: each source
 * mesh is rigidly bound (weight 1) to its parent group, so per-lock sway still works
 * but the whole set costs a single draw call. normalFn can replace normals (root space).
 */
export function bakeRigid(root, meshes, material, normalFn = null) {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const bones = [], boneIndex = new Map();
  const P = [], Nn = [], UV = [], SI = [], I = [];
  const m4 = new THREE.Matrix4(), n3 = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (const { mesh, owner, center } of meshes) {
    const own = owner || mesh.parent;
    if (!boneIndex.has(own)) { boneIndex.set(own, bones.length); bones.push(own); }
    const bi = boneIndex.get(own);
    m4.multiplyMatrices(rootInv, mesh.matrixWorld); n3.getNormalMatrix(m4);
    const g = mesh.geometry, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
    const base = P.length / 3;
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m4);
      if (normalFn && center) n.copy(v).sub(center).normalize(); else n.fromBufferAttribute(na, i).applyMatrix3(n3).normalize();
      P.push(v.x, v.y, v.z); Nn.push(n.x, n.y, n.z);
      UV.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
      SI.push(bi, 0, 0, 0);
    }
    const gi = g.index;
    if (gi) for (let i = 0; i < gi.count; i++) I.push(base + gi.getX(i));
    else for (let i = 0; i < pa.count; i++) I.push(base + i);
    mesh.removeFromParent();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  const SW = new Float32Array((P.length / 3) * 4); for (let i = 0; i < SW.length; i += 4) SW[i] = 1;
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  geo.setIndex(I);
  const mesh = new THREE.SkinnedMesh(geo, material);
  root.add(mesh); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones), mesh.matrixWorld);
  mesh.frustumCulled = false; mesh.castShadow = true;
  return mesh;
}

/** Physical skin material with world-stable triplanar texture (object/bind space) + rim light. */
export function triplanarSkin(map, { scale = 3, rimColor = 0xc8d6f0, rimStrength = 0.4, rimPower = 2.6, ...params } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, ...params });
  mat.userData.rim = { color: new THREE.Color(rimColor), strength: rimStrength, power: rimPower };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.triMap = { value: map };
    shader.uniforms.triScale = { value: scale };
    shader.uniforms.rimColor = { value: mat.userData.rim.color };
    shader.uniforms.rimStrength = { value: mat.userData.rim.strength };
    shader.uniforms.rimPower = { value: mat.userData.rim.power };
    mat.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriP; varying vec3 vTriN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTriP = position; vTriN = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D triMap; uniform float triScale; uniform vec3 rimColor; uniform float rimStrength; uniform float rimPower; varying vec3 vTriP; varying vec3 vTriN;')
      .replace('#include <map_fragment>', `
        { vec3 bw = pow(abs(normalize(vTriN)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z + 1e-5);
          vec3 tp = vTriP * triScale;
          vec4 tx = texture2D(triMap, tp.zy) * bw.x + texture2D(triMap, tp.xz) * bw.y + texture2D(triMap, tp.xy) * bw.z;
          diffuseColor.rgb *= tx.rgb; }`)
      .replace('#include <opaque_fragment>', `
        { vec3 vd = normalize(vViewPosition);
          float rimF = pow(1.0 - clamp(dot(normal, vd), 0.0, 1.0), rimPower);
          outgoingLight += rimColor * rimF * rimStrength; }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'triskin';
  return mat;
}

/** Hair-card material: double-sided alpha-to-coverage cards that keep their (volumetric) normals on both faces. */
export function hairCardMaterial(map, { rimColor = 0xfff8ee, rimStrength = 0.4, rimPower = 1.8, ...params } = {}) {
  const mat = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, alphaTest: 0.3, ...params });
  mat.alphaToCoverage = true;
  mat.userData.rim = { color: new THREE.Color(rimColor), strength: rimStrength, power: rimPower };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: mat.userData.rim.color };
    shader.uniforms.rimStrength = { value: mat.userData.rim.strength };
    shader.uniforms.rimPower = { value: mat.userData.rim.power };
    mat.userData.shader = shader;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor; uniform float rimStrength; uniform float rimPower;')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);')
      .replace('#include <opaque_fragment>', `
        { vec3 vd = normalize(vViewPosition);
          float ndv = abs(dot(normal, vd));
          float rimF = pow(1.0 - clamp(ndv, 0.0, 1.0), rimPower);
          // soft forward-scatter so white hair glows a little when backlit
          outgoingLight += rimColor * rimF * rimStrength + diffuseColor.rgb * 0.06; }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'haircard';
  return mat;
}
