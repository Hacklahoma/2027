// The hero scene: constellation sky over night water, the fleet, and the
// painted person at eye level. Framework-free; Hero.jsx mounts and disposes it.
import { mountWater } from './water.js';
import { addPaintedPerson } from './painted.js';
import * as THREE from 'three';
import { addSky } from './sky.js';

const FIG = { x: -0.95, z: 1.35 };

// How much work the scene does per frame. Phones get their own tier: full sharpness (2x), with the
// cost taken out of things that don't show at that size (a half-size glow, no film grain, a smaller
// reflection, no MSAA). Add ?q=low|phone|high to the address to force one, e.g. to compare on a phone.
const TIERS = {
  high: { dpr: 1.5, reflect: 1024, bloomScale: 1, grain: 1, antialias: true },
  phone: { dpr: 2, reflect: 512, bloomScale: 0.5, grain: 0, antialias: false },
  low: { dpr: 1.25, reflect: 512, bloomScale: 0.5, grain: 0, antialias: false },
};

// The painting was made at eye level, so the camera only moves sideways and back.
const VIEWS = {
  desk:     { pos: [0.1, 1.0, 5.2],    target: [-0.25, 1.3, -2], fov: 34 },
  wide:     { pos: [0.1, 1.0, 5.6],    target: [-0.2, 1.25, -2], fov: 32 },
  portrait: { pos: [-0.45, 1.12, 6.6], target: [-0.6, 1.45, -2], fov: 54 },
};
const pickView = () => {
  const a = innerWidth / innerHeight;
  return a < 0.85 ? 'portrait' : a > 2.1 ? 'wide' : 'desk';
};

/**
 * Mount the scene into `el`. Returns { dispose }.
 * opts.reduce: prefers-reduced-motion (no drift, sky drawn, boats lit, sky still).
 * opts.personUrl: the cut-out painting.
 * opts.intro: the opening animation drives the reveal: the scene starts black, boats dark, sky empty,
 *   and the returned `intro` hooks light it up (see src/intro/sparkIntro.js).
 */
export function createHeroScene(el, { reduce = false, personUrl, intro = false } = {}) {
  const ui = {};
  // phones get a lighter scene (see water.js `lite`), and a portrait screen needs neither the
  // extra-wide sky (that's for wide desktop screens) nor the desktop-sized clearing behind the headline
  const portrait = innerWidth / innerHeight < 0.85;
  const lite = portrait || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 600);
  const params = new URLSearchParams(location.search);
  const tier = TIERS[params.get('q')] ? params.get('q') : lite ? 'phone' : 'high';
  const api = mountWater(el, ui, {
    count: 18, boatScale: 0.55, spread: 0.85, lightScale: 0.42, drift: reduce ? 0 : 1,
    exclude: [{ x: FIG.x, z: FIG.z, r: 0.55 }, { x: 0.2, z: 3.6, r: 1.9 }],
    views: Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, { pos: v.pos, target: v.target }])),
    view: pickView(),
    quality: TIERS[tier],
  });
  api.marks = { scene: performance.now() };   // when each startup step finished (shown by ?fps)
  if (params.has('fps')) fpsMeter(api, tier);
  ui.setMode('smooth');
  ui.setPaint(false);   // the sky's hairlines need a crisp image; the painting carries the painterly feel

  const person = addPaintedPerson(api, { url: personUrl, x: FIG.x, z: FIG.z, height: 1.05 });
  // the sky moves on its own (independent of everything in front of it); lines clear around the headline
  const sky = addSky(api, {
    // instant on phones: drawing the sky on re-uploads two 3000×1200 canvases ~30 times a second for 13s
    // (about 6 GB of texture data in the first 10s), which a desktop GPU absorbs and an iPhone does not
    style: 'blend', instant: reduce || lite, hold: intro && !reduce, delay: 0.6, drift: reduce ? 0 : 1 / 300,
    clear: portrait ? { x: 0.5, y: 0.64, rx: 0.62, ry: 0.3 } : { x: 0.5, y: 0.6, rx: 0.34, ry: 0.36 },
    pinned: true, fill: !portrait,   // stars stay put as the pointer moves the camera; the sky reaches both screen edges
  });

  // Safari's address bar sliding away fires 'resize' as you start to scroll; resetting the view then
  // made the camera jump. Only change it when the layout actually changes (rotating the phone).
  let currentView = null;
  const frame = () => {
    const name = pickView();
    if (name === currentView) return;
    currentView = name;
    ui.setView(name);
    api.camera.fov = VIEWS[name].fov;
    api.camera.updateProjectionMatrix();
  };
  frame();
  addEventListener('resize', frame);

  // the boats start dark and light one by one: the one in their hands first, then outward
  // Ready = the scene is actually drawing smoothly: every material compiled, then a run of fast frames
  // in a row. The first seconds on an iPhone are full of one-off stalls (shader and pipeline setup,
  // big texture uploads, the sky drawn once its fonts land), some of them a second long; revealing during
  // them dropped the page to ~1 fps and made the hero's lines jump in instead of fading. A fixed number of
  // frames wasn't enough, so this watches the frame times themselves. Capped at 8s so it always reveals.
  const marks = api.marks;
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  const SMOOTH_MS = 40, SMOOTH_RUN = 12, CAP_MS = 8000;
  const warmUp = () => {
    marks.compiled = performance.now();
    let run = 0, last = performance.now();
    const tick = () => {
      const now = performance.now(), dt = now - last;
      last = now;
      marks.worst = Math.max(marks.worst || 0, dt);
      run = dt < SMOOTH_MS ? run + 1 : 0;
      if (run >= SMOOTH_RUN || now - marks.compiled > CAP_MS) {
        api.tickers.splice(api.tickers.indexOf(tick), 1);
        marks.smooth = now;
        resolveReady();
      }
    };
    api.tickers.push(tick);
  };
  // the sky draws itself once its label fonts arrive, a one-off job heavy enough to stall a phone, so
  // count smooth frames only after those fonts are in (or 2.5s have passed) and the shaders are compiled
  const skyFonts = document.fonts?.load
    ? Promise.race([Promise.all(['20px "DM Mono"', 'italic 20px "Cormorant Garamond"'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]).catch(() => {})
    : Promise.resolve();
  const compiled = (api.renderer.compileAsync ? api.renderer.compileAsync(api.scene, api.camera) : Promise.resolve()).catch(() => {});
  Promise.all([compiled, skyFonts]).then(warmUp);

  const timers = [];
  if (intro && !reduce) {
    for (const b of api.fleet) { b.lit = 0; b.litTarget = 0; }
    api.grade.uniforms.uReveal.value = 0;
  } else if (!reduce) {
    const d = (b) => Math.hypot(b.group.position.x - FIG.x, b.group.position.z - FIG.z);
    for (const b of api.fleet) { b.lit = 0; b.litTarget = 0; }
    // the lighting starts once the scene is shown, not while it is still warming up behind the night
    ready.then(() => {
      timers.push(setTimeout(() => (person.boat.litTarget = 1), 1100));
      api.fleet.filter((b) => b !== person.boat).sort((a, b) => d(a) - d(b))
        .forEach((b, i) => timers.push(setTimeout(() => (b.litTarget = 1), 2200 + i * 210)));
    });
  }

  // ── hooks for the opening animation ──
  const G = api.grade.uniforms;
  const v3 = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 26);   // the sky's distance
  const ray = new THREE.Ray();
  const hooks = {
    /** where the light comes from, in page pixels (the wordmark's centre) */
    setOrigin(px, py) {
      const r = el.getBoundingClientRect();
      const u = (px - r.left) / r.width, v = 1 - (py - r.top) / r.height;
      G.uOrigin.value.set(u, v);
      // the moon sits in the sky behind the word: its reflection makes the path on the water
      api.camera.updateMatrixWorld();
      v3.set(u * 2 - 1, v * 2 - 1, 0.5).unproject(api.camera);
      ray.set(api.camera.position, v3.sub(api.camera.position).normalize());
      if (ray.intersectPlane(plane, v3)) api.WU.uGladePos.value.copy(v3);
    },
    /** 0 → black, 1 → fully revealed. Boats ignite as the light reaches them. */
    setReveal(k) {
      G.uReveal.value = k;
      const o = G.uOrigin.value, asp = G.uAspect.value, r = k * 2.4;
      for (const b of [...api.fleet]) {
        if (b.litTarget) continue;
        v3.copy(b.group.position).project(api.camera);
        const u = v3.x * 0.5 + 0.5, v = v3.y * 0.5 + 0.5;
        const dy = v < o.y ? (o.y - v) * 0.42 : (v - o.y) * 1.1;
        const dx = (u - o.x) * asp * (1 + 0.9 * Math.max(o.y - v, 0));
        if (Math.hypot(dx, dy) < r * 0.6) b.litTarget = 1;
      }
    },
    setGlade(k) { api.WU.uGlade.value = k; },
    startSky() { sky.start(); },
  };

  return {
    intro: hooks,
    ready,
    dispose() {
      timers.forEach(clearTimeout);
      removeEventListener('resize', frame);
      api.dispose();
    },
  };
}

// ?fps: a small readout for testing on a real phone: frames per second, the tier, and the size it renders at.
function fpsMeter(api, tier) {
  const el = Object.assign(document.createElement('div'), { className: 'fps-meter' });
  el.style.cssText = 'position:fixed;z-index:9999;left:8px;top:calc(64px + env(safe-area-inset-top,0px));padding:6px 9px;border-radius:6px;'
    + 'background:rgba(0,0,0,.72);color:#9f9;font:600 11px/1.4 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre';
  document.body.appendChild(el);
  let n = 0, t0 = performance.now(), worst = 0, last = t0;
  api.tickers.push(() => {
    const now = performance.now();
    worst = Math.max(worst, now - last); last = now; n++;
    if (now - t0 < 1000) return;
    const c = api.renderer.domElement;
    const m = api.marks, s = (v) => (v ? (v / 1000).toFixed(1) + 's' : '…');
    el.textContent = `${Math.round((n * 1000) / (now - t0))} fps · worst ${Math.round(worst)}ms\n${tier} · ${c.width}×${c.height}px`
      + `\nscene ${s(m.scene)} · compiled ${s(m.compiled)} · smooth ${s(m.smooth)}\nworst while loading ${Math.round(m.worst || 0)}ms`;
    n = 0; t0 = now; worst = 0;
  });
}
