import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { buildTextures, buildSignAtlas, buildSharedMaterials } from './materials.js';
import { buildCharMaterials, buildPropMaterials } from './chars.js';
import { generateLayout } from './world.js';
import { Env } from './env.js';
import { FX } from './fx.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { initInput, isMobile, isPhone, setGestureHandler, clearJustPressed, justPressed, keys, grabFocus } from './input.js';
import { initAudio, setMusic, setMusicLevel, musicState } from './audio.js';

const $ = (id) => document.getElementById(id);
const progress = (v, label) => { $('load-fill').style.transform = `scaleX(${v})`; if (label) $('load-label').textContent = label; };
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

const TIERS = [
  { name: 'ultra', pr: 2.0, shadow: 2048, bloom: true, msaa: 4 },
  { name: 'high', pr: 1.5, shadow: 2048, bloom: true, msaa: 4 },
  { name: 'med', pr: 1.25, shadow: 1024, bloom: true, msaa: 2 },
  { name: 'low', pr: 1.0, shadow: 1024, bloom: false, msaa: 0 },
];

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.32 }, sat: { value: 1.1 }, time: { value: 0 }, flash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, sat, time, flash; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, sat);
      c.rgb = c.rgb * vec3(1.02, 1.0, 0.97) + vec3(0.012, 0.006, 0.0);   // warm golden-hour lift
      c.rgb = mix(c.rgb, c.rgb*c.rgb*(3.0-2.0*c.rgb), 0.18);               // gentle S-curve
      vec2 d = vUv - 0.5; float v = 1.0 - dot(d, d) * vig * 2.2;
      c.rgb *= v;
      c.rgb = mix(c.rgb, vec3(1.0,0.25,0.2), flash * (0.35 + dot(d,d)*1.6));
      c.rgb += (hash(vUv*1000.0 + time) - 0.5) * 0.012;                     // fine grain, kills banding
      gl_FragColor = c;
    }`,
};

async function boot() {
  const canvas = $('game');
  progress(0.05, 'Warming up the plaza…');
  await frame();
  try { await Promise.race([document.fonts.load('600 64px Fredoka'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  } catch (e) {
    $('load-label').textContent = 'WebGL is not available in this browser.'; return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  let tierIdx = isPhone ? 2 : isMobile ? 1 : 1;
  if (/[?&]q=low/.test(location.search)) tierIdx = 3;
  if (/[?&]q=ultra/.test(location.search)) tierIdx = 0;
  const tier = () => TIERS[tierIdx];

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2cfae, 45, 260);
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.3, 1500);
  camera.position.set(4, 3, 12);

  progress(0.15, 'Painting the storefronts…'); await frame();
  try { // storefront sign typefaces — wait briefly so the sign atlas paints with them
    const fams = ['700 40px "Playfair Display"', '40px Parisienne', '700 40px "Josefin Sans"', '700 40px "Roboto Slab"', '600 40px Fredoka'];
    await Promise.race([Promise.all(fams.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]);
  } catch (e) { /* fall back to system faces */ }
  buildTextures(); buildSignAtlas(); buildSharedMaterials(); buildCharMaterials(); buildPropMaterials();

  progress(0.3, 'Planting redwoods…'); await frame();
  const layout = generateLayout();
  const env = new Env(scene, layout, { shadowSize: tier().shadow });

  // sky-based environment lighting for reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), env.sky.material);
  envScene.add(envSky);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: 0x8a7458 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -2; envScene.add(ground);
  scene.environment = pmrem.fromScene(envScene, 0.04, 0.1, 200).texture;
  scene.environmentIntensity = 0.45;

  progress(0.55, 'Waking up Mr. Peabody…'); await frame();
  const ui = new UI();
  const fx = new FX(scene, camera, $('ftext-layer'));
  const game = new Game(scene, camera, fx, ui, env);
  ui.game = game;

  // post-processing
  let composer, bloom, grade;
  function buildComposer() {
    const t = tier();
    const pr = Math.min(window.devicePixelRatio || 1, t.pr);
    renderer.setPixelRatio(pr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: t.msaa });
    composer?.dispose();
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(pr);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    if (t.bloom) {
      bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.38, 0.55, 0.92);
      composer.addPass(bloom);
    } else bloom = null;
    composer.addPass(new OutputPass());
    grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    env.sun.shadow.mapSize.set(t.shadow, t.shadow);
    if (env.sun.shadow.map) { env.sun.shadow.map.dispose(); env.sun.shadow.map = null; }
    fx.setScale(size.y / (2 * Math.tan((camera.fov * Math.PI) / 360)));
    $('fps').dataset.tier = t.name;
  }
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    buildComposer();
    if (typeof render === 'function' && grade) { try { render(); } catch (e) {} }
  }
  window.addEventListener('resize', onResize);
  onResize();

  progress(0.75, 'Compiling shaders…'); await frame();
  // Everything hidden for now (pooled cats and birds, the cyclists, Morty, the turkey…) is made ready before play. Its
  // shaders are compiled for the render target the scene is drawn into: there, unlike on the canvas, there is no tone
  // mapping (the output pass does it), so the programs differ, and compiling for the canvas left the real ones to be
  // built the first time each thing came into view. Then it is all drawn once, behind the loading screen, with culling
  // off, so its buffers are uploaded and its shadow shaders built too. (A cyclist riding in used to stall the game.)
  const hidden = [], unculled = [];
  scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  for (const h of hidden) h.traverse((o) => { if (o.frustumCulled) { unculled.push(o); o.frustumCulled = false; } });
  let compiling = null;
  renderer.setRenderTarget(composer.readBuffer);
  try { compiling = renderer.compileAsync ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera); } catch (e) {}
  renderer.setRenderTarget(null);
  try { await compiling; } catch (e) {}
  progress(0.88, 'Setting the scene…'); await frame();
  try { composer.render(); } catch (e) {}
  for (const o of unculled) o.frustumCulled = true;
  for (const o of hidden) o.visible = false;
  progress(0.95, 'Almost there…'); await frame();

  // input + audio
  initInput(canvas);
  setGestureHandler(() => initAudio());
  $('play-btn').addEventListener('click', (e) => { e.stopPropagation(); initAudio(); grabFocus(canvas); game.startGame(); });
  $('end-btn').addEventListener('click', (e) => { e.stopPropagation(); initAudio(); ui.endAction(game); });
  $('exit-shop').addEventListener('click', (e) => { e.stopPropagation(); game.exitShop(); });
  $('shop').addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

  // debug / testing hooks
  window.render_game_to_text = () => game.renderToText();
  let manual = false;
  window.advanceTime = (ms) => { manual = true; const steps = Math.max(1, Math.round(ms / (1000 / 60))); for (let i = 0; i < steps; i++) { ui.tick(game, 1 / 60); if (game.paused) { clearJustPressed(); continue; } game.update(1 / 60); env.update(game.t, camera.position.x, game.p.x); fx.update(1 / 60, window.innerWidth, window.innerHeight); } render(); };
  // leaving the page mid-run pauses it, so the player comes back to the pause panel
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.setPaused(true); });
  // touch cheat: tap the progress bar at the top 5 times quickly → warp to the final quarter
  { let taps = []; const tr = document.querySelector('.track');
    if (tr) tr.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); const n = performance.now(); taps = taps.filter((t) => n - t < 2500); taps.push(n); if (taps.length >= 5) { taps = []; game.cheatWarp(); } }); }
  window.peabodyDebug = {
    game, startGame: () => game.startGame(),
    setInvincible: (on = true) => { game.p.invT = on ? 99999 : 0; },
    goTo: (x) => { game.p.x = x; game.p.y = 0; game.cam.x = x; },
    goToJessica: () => { game.boss.done = true; game.boss.state = 'gone'; game.boarRig.root.visible = false; game.ui.bossBar(null); game.p.x = 466; game.p.y = 0; game.cam.x = 466; },
    warp: () => game.cheatWarp(),
    goToBoss: () => { game.p.x = 440; game.p.y = 0; game.cam.x = 440; },
    bossHP: (n) => { game.boss.hp = n; },
    eat: (kind) => game.eatFood({ kind, rig: { root: {} }, active: true }),
    goToShop: () => { game.p.x = 158; game.p.y = 0; game.cam.x = 158; },
    setKickMode: () => { game.p.kickT = 8; }, setFartMode: () => { game.p.fartT = 4; },
    setFly: () => { game.p.flyT = 30; }, giveFish: (n = 30) => { game.p.fish += n; },
    spawnChicken: () => game.spawnChicken(), tier: (i) => { tierIdx = i; buildComposer(); },
    resume: () => { manual = false; },
    photo: (a) => { game.photo = a; },
    pause: (on = true) => { game.setPaused(on); return game.paused; },
    difficulty: (i) => { if (i !== undefined) { game.setSkill(i); ui.renderPause(); } return game.sk.id; },
    music: (level) => { if (level !== undefined) { setMusicLevel(level); ui.renderPause(); } return musicState(); },
  };
  if (/[?&]debug/.test(location.search)) $('fps').classList.add('on');

  // loop
  let last = performance.now(), acc = 0, frames = 0, fpsT = 0, slow = 0, lastDown = performance.now();
  function render() {
    grade.uniforms.time.value = (game.t * 60) % 1000;
    grade.uniforms.flash.value = Math.max(0, grade.uniforms.flash.value - 0.04);
    composer.render();
  }
  ui._flash = () => { grade.uniforms.flash.value = 1; };
  const origFlash = ui.flashDamage.bind(ui);
  ui.flashDamage = () => { origFlash(); grade.uniforms.flash.value = 1; };

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (manual) return;
    if (justPressed.Backquote) $('fps').classList.toggle('on');
    ui.tick(game, dt);
    if (game.paused) { clearJustPressed(); frames = 0; fpsT = 0; return; } // the clock stands still; the last frame stays on screen
    game.update(dt);
    env.update(game.t, camera.position.x, game.p.x);
    fx.update(dt, window.innerWidth, window.innerHeight);
    render();
    // fps + adaptive quality
    frames++; fpsT += dt;
    if (fpsT >= 1) {
      const fps = frames / fpsT; $('fps').textContent = `${fps.toFixed(0)} fps · ${tier().name} · ${renderer.info.render.calls} calls`;
      // adaptive quality: step down at most once every 12s, and re-render immediately so the resized canvas never shows a blank frame
      if (game.state === 'playing' && fps < 40 && tierIdx < TIERS.length - 1) { if (++slow >= 4 && now - lastDown > 12000) { tierIdx++; buildComposer(); render(); slow = 0; lastDown = now; } } else slow = 0;
      frames = 0; fpsT = 0;
    }
  }
  progress(1, 'Ready!');
  game.state = 'menu'; ui.show('menu');
  setTimeout(() => $('loading').classList.add('gone'), 150);
  requestAnimationFrame(loop);
}

boot().catch((e) => { console.error(e); const l = document.getElementById('load-label'); if (l) l.textContent = 'Error: ' + e.message; });
