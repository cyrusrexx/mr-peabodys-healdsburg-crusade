import * as THREE from 'three';
import { tex } from './materials.js';
import { rand } from './util.js';

// GPU point particles (one additive system for light, one normal for smoke/hearts)
class Particles {
  constructor(scene, cap, map, blending) {
    this.cap = cap; this.n = 0;
    this.p = []; // {x,y,z,vx,vy,vz,life,max,size,r,g,b,grav,drag,grow}
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.size = new Float32Array(cap);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending,
      uniforms: { map: { value: map }, scale: { value: 600 } },
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale;
        void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size*scale/(-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb*t.rgb, vC.a*t.a); }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 10;
    this.geo = g;
    scene.add(this.points);
  }
  emit(o) {
    if (this.p.length >= this.cap) this.p.shift();
    this.p.push({ grav: 0, drag: 1, grow: 0, a: 1, ...o, max: o.life });
  }
  update(dt) {
    const arr = this.p;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      q.life -= dt; if (q.life <= 0) continue;
      q.vy -= q.grav * dt; const d = Math.pow(q.drag, dt * 60);
      q.vx *= d; q.vy *= d; q.vz *= d;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.size += q.grow * dt;
      arr[w++] = q;
    }
    arr.length = w;
    for (let i = 0; i < w; i++) {
      const q = arr[i], k = q.life / q.max;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.col[i * 4] = q.r; this.col[i * 4 + 1] = q.g; this.col[i * 4 + 2] = q.b; this.col[i * 4 + 3] = q.a * Math.min(1, k * 2.5);
      this.size[i] = q.size;
    }
    this.geo.setDrawRange(0, w);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.geo.attributes.size.needsUpdate = true;
  }
}

const C = (hex) => { const c = new THREE.Color(hex); return { r: c.r, g: c.g, b: c.b }; };

export class FX {
  constructor(scene, camera, layer) {
    this.scene = scene; this.camera = camera; this.layer = layer;
    this.glow = new Particles(scene, 1600, tex.spark, THREE.AdditiveBlending);
    this.soft = new Particles(scene, 900, tex.puff, THREE.NormalBlending);
    this.hearts = new Particles(scene, 300, tex.heart, THREE.NormalBlending);
    this.rings = [];
    this.ringGeo = new THREE.PlaneGeometry(1, 1);
    this.texts = [];
    this.puddles = [];
    this.trails = [];
  }
  setScale(h) { const s = h; this.glow.mat.uniforms.scale.value = s; this.soft.mat.uniforms.scale.value = s; this.hearts.mat.uniforms.scale.value = s; }

  sparkle(x, y, z, color = 0xfff2a8, n = 14, speed = 3) {
    const c = C(color);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = rand(-1, 1);
      const s = rand(0.4, 1) * speed;
      this.glow.emit({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 1, vz: b * s * 0.6, life: rand(0.35, 0.7), size: rand(0.12, 0.28), ...c, grav: 4, drag: 0.93 });
    }
  }
  burst(x, y, z, color, n = 24) { this.sparkle(x, y, z, color, n, 5); this.ring(x, y, z, color, 1.6, 0.35); }
  dust(x, y, z, n = 6, dir = 0) {
    for (let i = 0; i < n; i++) this.soft.emit({ x: x + rand(-0.15, 0.15), y: y + 0.05, z: z + rand(-0.2, 0.2), vx: rand(-0.8, 0.8) - dir * 0.8, vy: rand(0.3, 1), vz: rand(-0.4, 0.4), life: rand(0.35, 0.6), size: rand(0.25, 0.45), r: 0.93, g: 0.86, b: 0.76, a: 0.6, drag: 0.92, grow: 0.8 });
  }
  smoke(x, y, z, color = 0x9bd04a, n = 20, spread = 1.5) {
    const c = C(color);
    for (let i = 0; i < n; i++) this.soft.emit({ x: x + rand(-0.3, 0.3), y: y + rand(0, 0.5), z, vx: rand(-spread, spread), vy: rand(0.2, 1.5), vz: rand(-0.6, 0.6), life: rand(0.6, 1.2), size: rand(0.5, 1.1), ...c, a: 0.7, drag: 0.94, grow: 1.4 });
  }
  heart(x, y, z, n = 1) {
    for (let i = 0; i < n; i++) this.hearts.emit({ x: x + rand(-0.4, 0.4), y, z: z + rand(-0.2, 0.2), vx: rand(-1.5, 1.5), vy: rand(1.5, 3.5), vz: 0, life: rand(1, 1.8), size: rand(0.3, 0.55), r: 1, g: rand(0.3, 0.5), b: rand(0.5, 0.7), a: 1, drag: 0.97, grav: -0.3 });
  }
  zzz(x, y, z) { this.hearts.emit({ x, y, z, vx: 0.3, vy: 0.6, vz: 0, life: 1.4, size: 0.2, r: 0.7, g: 0.8, b: 1, a: 0.9, drag: 0.99, grow: 0.15 }); }
  speed(x, y, z, dir) { this.glow.emit({ x, y: y + rand(0.1, 0.7), z: z + rand(-0.3, 0.3), vx: -dir * rand(2, 4), vy: 0, vz: 0, life: 0.25, size: 0.15, r: 0.6, g: 0.9, b: 1, a: 0.8 }); }
  confetti(x, y, z, n = 60) {
    const cols = [0xff5a7a, 0xffd34d, 0x4fc3f7, 0x7ee36f, 0xc58bff, 0xffffff];
    for (let i = 0; i < n; i++) { const c = C(cols[i % cols.length]); this.glow.emit({ x, y, z, vx: rand(-5, 5), vy: rand(3, 9), vz: rand(-2, 2), life: rand(1.2, 2.2), size: rand(0.14, 0.24), ...c, grav: 6, drag: 0.97 }); }
  }
  firework(x, y, z) {
    const cols = [0xff5a7a, 0xffd34d, 0x4fc3f7, 0x7ee36f, 0xc58bff];
    const c = C(cols[Math.floor(Math.random() * cols.length)]);
    for (let i = 0; i < 50; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(rand(-1, 1)); const s = rand(3, 5); this.glow.emit({ x, y, z, vx: Math.sin(b) * Math.cos(a) * s, vy: Math.cos(b) * s, vz: Math.sin(b) * Math.sin(a) * s * 0.5, life: rand(0.9, 1.5), size: rand(0.14, 0.26), ...c, grav: 2, drag: 0.95 }); }
  }
  ring(x, y, z, color, maxR = 2, life = 0.4, flat = false) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: tex.ring, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set(x, y, z); if (flat) m.rotation.x = -Math.PI / 2;
    m.renderOrder = 11;
    this.scene.add(m); this.rings.push({ m, life, max: life, maxR, flat });
  }
  // swoosh arc for chops/kicks
  swoosh(x, y, z, dir, color = 0xffffff, big = false) {
    const geo = new THREE.RingGeometry(big ? 0.55 : 0.4, big ? 0.85 : 0.62, 24, 1, -Math.PI * 0.45, Math.PI * 0.9);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(x, y, z + 0.2); m.scale.x = dir; m.renderOrder = 12;
    this.scene.add(m); this.trails.push({ m, life: 0.18, max: 0.18 });
  }
  puddle(x) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshPhysicalMaterial({ color: 0xf6e04a, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85, emissive: 0x5a4a00, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, 0); m.scale.set(0.01, 0.6, 1); m.renderOrder = 2;
    this.scene.add(m);
    return m;
  }
  text(str, x, y, z, color = '#fff', size = 1, cls = '') {
    const el = document.createElement('div');
    el.className = 'ftext ' + cls; el.textContent = str; el.style.color = color; el.style.fontSize = (22 * size) + 'px';
    this.layer.appendChild(el);
    this.texts.push({ el, x, y, z, life: 1.1, max: 1.1 });
  }
  clear() {
    for (const r of this.rings) { this.scene.remove(r.m); r.m.material.dispose(); }
    for (const r of this.trails) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); }
    for (const t of this.texts) t.el.remove();
    this.rings = []; this.trails = []; this.texts = [];
    this.glow.p.length = 0; this.soft.p.length = 0; this.hearts.p.length = 0;
  }
  update(dt, w, h) {
    this.glow.update(dt); this.soft.update(dt); this.hearts.update(dt);
    this.rings = this.rings.filter((r) => {
      r.life -= dt; const k = 1 - r.life / r.max;
      const s = 0.2 + k * r.maxR * 2; r.m.scale.set(s, s, s); r.m.material.opacity = 1 - k;
      if (!r.flat) r.m.quaternion.copy(this.camera.quaternion);
      if (r.life <= 0) { this.scene.remove(r.m); r.m.material.dispose(); return false; }
      return true;
    });
    this.trails = this.trails.filter((r) => {
      r.life -= dt; r.m.material.opacity = (r.life / r.max) * 0.9; r.m.rotation.z += dt * 10 * Math.sign(r.m.scale.x);
      if (r.life <= 0) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); return false; }
      return true;
    });
    const v = new THREE.Vector3();
    this.texts = this.texts.filter((t) => {
      t.life -= dt; t.y += dt * 1.4;
      v.set(t.x, t.y, t.z).project(this.camera);
      const k = t.life / t.max;
      t.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%) scale(${0.8 + Math.min(1, (1 - k) * 6) * 0.3})`;
      t.el.style.opacity = Math.min(1, k * 2.5);
      if (t.life <= 0) { t.el.remove(); return false; }
      return true;
    });
  }
}
