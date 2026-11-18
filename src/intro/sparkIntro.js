/**
 * "Spark to Moon": the opening animation.
 *
 *   ignite   one pinprick of light in the dark; a few faint motes drift in toward it
 *   burst    it pops, and tens of thousands of sparks fly out into a slow, tilted vortex
 *            with real depth: near sparks blur past as soft discs, far ones glitter
 *   condense the vortex spirals in and the sparks settle into the wordmark, warm amber
 *   moonrise a line of light sweeps across the word and turns it from ember to moonlight;
 *            the real (DOM) wordmark takes over behind the sweep
 *   reveal   the light pours down from the word onto the water as a glittering moon path;
 *            the scene appears where it reaches, the boats light as it touches them, and the
 *            spare sparks rise into the sky as the real stars come out
 *
 * One WebGL overlay (three.js points, analytic motion in the vertex shader, no simulation),
 * on top of the hero scene, which it drives through `hooks` (see heroScene.js).
 *
 *   const intro = playSparkIntro({ target, wordEl, hooks, ready, onReveal, onDone });
 *   intro.skip();   // fast-forward to the moonrise
 */
import * as THREE from 'three';

const AMBER = ['#ffa63e', '#ffb85c', '#ffd48a', '#fff1cc', '#e48821', '#ffc977'];
const MOONLIGHT = ['#f6f4ee', '#ffffff', '#e4edf7', '#d6e4f2', '#fff6e2', '#eef3f8'];   // the orbit style
const TEAL = '#8fd6e8';   // a few cool sparks: the other world
const MOON = new THREE.Color('#f3f1ea');

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (a, b, t) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };

// The Hacklahoma bee, traced from the pixel mascot: [row, firstCol, lastCol] runs on a 29-wide grid
// (centre column 14). Wings are five bars a side; the body is four stripes and a stinger.
const BEE = (() => {
  const runs = [
    [0, 10, 10], [0, 18, 18], [1, 10, 10], [1, 18, 18],                 // antennae
    [3, 12, 12], [3, 16, 16], [4, 12, 12], [4, 16, 16],
    [6, 11, 17], [7, 11, 17], [8, 11, 17], [9, 11, 17], [10, 13, 15],     // head
    [12, 10, 18], [13, 10, 18], [16, 10, 18], [17, 10, 18], [18, 10, 18], // body stripes
    [20, 10, 18], [21, 10, 18], [24, 11, 17], [25, 11, 17],
    [27, 13, 15], [28, 13, 15], [29, 14, 14], [30, 14, 14],               // stinger
  ];
  // wings: bar columns, and the rows each bar spans (taller toward the body, like the mascot)
  const wing = { 0: [16, 20], 2: [13, 20], 4: [11, 19], 6: [11, 18], 8: [13, 17] };
  for (const [c, [a, b]] of Object.entries(wing)) {
    for (let r = a; r <= b; r++) { runs.push([r, +c, +c, 1]); runs.push([r, 28 - c, 28 - c, 1]); }
  }
  return runs;
})();

/** Points covering the bee, centred at (0,0), `size` px tall. z = 1 on the wings (they flutter). */
function sampleBee(size, step) {
  const u = size / 31;
  const pts = [];
  for (const [r, c0, c1, wing = 0] of BEE) {
    for (let c = c0; c <= c1; c++) {
      // each pixel is a slightly inset square, filled on a staggered grid
      const x0 = (c - 14.5) * u + u * 0.16, y0 = (r - 15) * u + u * 0.16, w = u * 0.68;
      for (let row = 0, y = 0; y < w; y += step * 0.866, row++) {
        for (let x = (row % 2) * step * 0.5; x < w; x += step) pts.push([x0 + x, -(y0 + y), wing]);
      }
    }
  }
  return pts;
}

/** The target's text as screen-space points on a staggered grid. */
function sampleText(el, step) {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize);
  const pad = size * 0.4;
  const W = Math.ceil(r.width + pad * 2), H = Math.ceil(r.height + pad * 2);
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
  if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
  const m = g.measureText(el.textContent);
  const lh = parseFloat(cs.lineHeight) || size;
  const y0 = pad + (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent + (r.height - lh) / 2;
  g.fillStyle = g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.2, size * 0.008);
  g.fillText(el.textContent, pad, y0); g.strokeText(el.textContent, pad, y0);
  const data = g.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let row = 0, y = 0; y < H; y += step * 0.866, row++) {
    for (let x = (row % 2) * step * 0.5; x < W; x += step) {
      if (data[((y | 0) * W + (x | 0)) * 4 + 3] > 120) pts.push([r.left - pad + x, r.top - pad + y]);
    }
  }
  return { pts, rect: r };
}

const vertexShader = /* glsl */`
  attribute vec4 aSeed; attribute vec3 aTarget; attribute float aRole; attribute vec3 aColor; attribute float aDelay; attribute float aGhost;
  attribute vec3 aHome;   // orbit style: this spark's place on the bee (z = 1 on a wing)
  uniform float uT, uClock, uBurst, uC0, uCDur, uSweepX, uWordFade, uRise, uStarFade, uPR, uW, uH, uD;
  uniform float uStyle, uGap, uGhosts, uLeadIn, uIn0, uInSpan;
  uniform vec3 uO;
  uniform vec3 uMoon;
  varying vec3 vCol; varying float vA; varying float vSoft;

  float easeOut4(float t){ return 1. - pow(1. - t, 4.); }
  float easeInOut(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }

  // the vortex: a tilted disk, inner sparks orbit faster, with a gentle flow wobble
  // the vortex: a spiral galaxy of sparks. Three arms (log spirals) wound round a bright core,
  // tipped toward us so the near arm sweeps past the camera. Inner sparks orbit faster.
  vec3 swirl(vec4 s, float t){
    float R = max(uW, uH) * .5;
    float rn = pow(s.x, .8);                           // denser toward the core
    float r = R * (.03 + .97 * rn);
    float arm = floor(s.y * 2.) * 3.1416;
    float sp = fract(s.y * 2.) - .5;
    float jitter = sp * abs(sp) * 4. * mix(2.2, .9, rn);      // most sparks hug the arm, a few stray wide
    float th = arm + rn * 6.4 + jitter + t * (.5 / (.16 + rn));
    float h = (s.z - .5) * R * .14 * (1. - .6 * rn);   // a thin disk with a puffed-up core
    vec3 p = vec3(cos(th) * r, h, sin(th) * r);
    float a = .62;                                     // seen at an angle: the near side sweeps toward us
    p = vec3(p.x, p.y * cos(a) - p.z * sin(a), p.y * sin(a) + p.z * cos(a));
    p.x += sin(p.y * .006 + t * 1.1 + s.w * 9.) * 22.;
    p.y += cos(p.x * .005 - t * .8 + s.z * 7.) * 18.;
    return p + vec3(0., uH * .02, -60.);
  }

  // the orbit style: sparks stream in from the dark, loop once on the way, and spiral down onto
  // the bee, which hovers and beats its wings until the word takes it
  vec3 arrive(vec4 s, float t, float lead, vec3 home, out float vis, out float ek){
    float S = min(uW, uH);
    float tin = lead > .5 ? uLeadIn : uIn0 + pow(s.w, .7) * uInSpan;   // a trickle, then a flood
    float dur = lead > .5 ? 2.4 : 1.35 + s.x * .5;
    float k = clamp((t - tin) / dur, 0., 1.);
    float e = 1. - pow(1. - k, 3.);
    float dir = s.y > .5 ? 1. : -1.;
    float th = s.y * 18.85 + dir * 5.5 * e;                            // circle in as they close
    float far = max(uW, uH) * (lead > .5 ? .95 : .65 + .45 * s.x);
    float r = far * pow(1. - e, 1.5);
    vec3 p = vec3(cos(th) * r, sin(th) * r * .8, (s.z - .5) * r * .9);
    float L = S * (lead > .5 ? .2 : .05 + .07 * s.z);                 // the loop on the way in
    float ph = s.z * 6.2832 + 6.2832 * e * dir;
    p.xy += vec2(cos(ph), sin(ph)) * L * sin(3.1416 * e);
    // the bee: hovering, wings beating (bars pull toward the body and back)
    vec3 h = home;
    if (h.z > 1.5) {
      // not on the bee: circle it as a loose, tilted halo
      float an = h.y + uClock * .35 * dir;
      h = vec3(cos(an) * h.x, sin(an) * h.x * .26 - h.x * .05, sin(an) * h.x * .5);
    } else if (h.z > 2.5) {
      h.z = 0.;   // a spare: flies in with the rest, then winks out on arrival
    } else {
      if (h.z > .5) h.x *= .8 + .2 * abs(sin(uClock * 9. + h.y * .002));
      h.z = 0.;
    }
    h += vec3(sin(uClock * 1.3) * 5., uH * .04 + sin(uClock * 2.1) * 7., 0.);
    vis = smoothstep(0., .04, k);
    ek = e;
    return h + p;
  }

  void main(){
    vec4 s = aSeed;
    float lead = step(1.5, aRole);
    // light trails: each spark is drawn a few times at earlier moments, fading behind it
    float t = uT - aGhost * uGap * (lead > .5 ? 1.7 : 1.);
    float gk = aGhost / max(uGhosts, 1.);
    vec3 pos; float a = 1.; float size;
    vec3 col = aColor;

    if (uStyle > .5) {
      float vis, ek;
      pos = arrive(s, t, lead, aHome, vis, ek);
      float drifter = step(1.5, aHome.z) * (1. - step(2.5, aHome.z));
      float spare = step(2.5, aHome.z);
      a = vis * (.65 + .35 * sin(uClock * (3. + 6. * s.z) + s.w * 40.)) * (lead > .5 ? 2.2 : mix(.42, .2, drifter));
      a *= 1. - spare * smoothstep(.55, .95, ek);
      size = lead > .5 ? 5.5 : mix(1. + 1.4 * s.z * s.z, .9 + 1.6 * s.z * s.z, drifter);
    } else {
    // ── before the burst: a few faint motes drift in toward the spark ──
    float pre = clamp((t - .45 - s.w * .5) / (uBurst - .45 - s.w * .5), 0., 1.);
    vec3 far = normalize(vec3(s.y - .5, s.z - .5, s.x - .5) + 1e-3) * max(uW, uH) * (.45 + .4 * s.w);
    vec3 gather = mix(uO + far, uO, pre * pre);
    float gatherA = step(s.x, .035) * smoothstep(0., .3, pre) * (1. - smoothstep(.85, 1., pre)) * .55;

    // ── burst into the vortex ──
    float kb = clamp((t - uBurst - s.w * .18) / .95, 0., 1.);
    vec3 sw = swirl(s, t);
    pos = mix(uO, sw, easeOut4(kb));
    a = smoothstep(0., .04, kb);
    if (t < uBurst) { pos = gather; a = gatherA; }

    // twinkle; the core burns hotter and whiter than the arms
    a *= .6 + .4 * sin(uClock * (2.5 + 7. * s.z) + s.w * 40.);
    float core = 1. - smoothstep(0., .35, pow(s.x, .8));
    a *= 1.2 + .7 * core;
    col = mix(col, vec3(1., .93, .8), core * .45);
    size = 1.3 + 2.8 * s.z * s.z + core * 1.5;
    }
    a *= pow(1. - gk, 1.6);
    size *= 1. - .55 * gk;

    if (aRole > .5) {
      // ── word sparks: spiral in and settle into the letters ──
      float kc = clamp((t - uC0 - aDelay) / uCDur, 0., 1.);
      float e = easeInOut(kc);
      vec3 d = aTarget - pos;
      vec3 side = vec3(-d.y, d.x, 0.) * .35 * sin(e * 3.1416);   // curve in, don't beeline
      pos = mix(pos, aTarget, e) + side * (1. - e);
      if (kc >= 1.) pos = aTarget + vec3(sin(uClock * 3. + s.w * 30.), cos(uClock * 2.6 + s.y * 30.), 0.) * .6;
      if (kc >= 1. && aGhost > .5) a = 0.;   // settled: no trail to draw
      a = mix(a, .62 + .25 * sin(uClock * 4. + s.w * 50.), smoothstep(.6, 1., kc));
      size = mix(size, 1.9 + .9 * s.z, e);
      // moonrise: ember → moonlight as the sweep passes
      float m = 1. - smoothstep(uSweepX - 70., uSweepX + 10., aTarget.x);
      col = mix(col, uMoon, m);
      a *= 1. + 1.4 * exp(-pow((aTarget.x - uSweepX + 30.) / 50., 2.));   // a gleam rides the sweep
      a *= 1. - uWordFade;
    } else {
      // ── the rest: dim once the word forms, then rise into the sky as stars ──
      float kc = smoothstep(uC0, uC0 + uCDur, t);
      a *= mix(1., uStyle > .5 ? .025 : .1, kc);
      float kr = clamp((uRise - s.x * .35) / .65, 0., 1.);
      float er = easeInOut(kr);
      pos = mix(pos, aTarget, er);
      size = mix(size, .9 + 1.2 * s.z, er);
      col = mix(col, vec3(.95, .95, 1.), er * .7);
      // only some become stars; the rest go out as they rise
      float keep = step(s.w, .3);
      a *= mix(1., keep * 1.1, er) * (1. - uStarFade * (.4 + .6 * s.y));
    }

    vec4 mv = modelViewMatrix * vec4(pos, 1.);
    float depth = -mv.z;
    // depth of field around the screen plane: near and far sparks become soft discs
    float blur = abs(depth - uD) / uD;
    float grow = 1. + blur * 7.;
    size *= (uD / max(depth, 30.)) * grow;
    a /= 1. + blur * blur * 30.;
    vSoft = clamp(blur * 2.2, 0., 1.);
    gl_PointSize = min(size * uPR * 2.2, 110.);
    gl_Position = projectionMatrix * mv;
    vCol = col; vA = a;
    if (depth < 20.) vA = 0.;
  }`;

const fragmentShader = /* glsl */`
  varying vec3 vCol; varying float vA; varying float vSoft;
  void main(){
    float d = length(gl_PointCoord - .5) * 2.;
    if (d > 1.) discard;
    float core = exp(-d * d * 9.) + .22 * exp(-d * d * 2.5);
    float disc = (1. - smoothstep(.72, 1., d)) * .32 + .1 * smoothstep(.6, .95, d) * (1. - smoothstep(.95, 1., d));
    float k = mix(core, disc, vSoft) * vA;
    gl_FragColor = vec4(vCol * k, k);
  }`;

const leadVertex = /* glsl */`
  uniform float uSize, uPR; void main(){ gl_PointSize = uSize * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const leadFragment = /* glsl */`
  uniform float uAlpha; uniform vec3 uCol;
  void main(){
    float d = length(gl_PointCoord - .5) * 2.;
    float k = exp(-d * d * 28.) * 1.4 + exp(-d * d * 5.) * .35 + exp(-d * 3.) * .12;
    gl_FragColor = vec4(mix(uCol, vec3(1.), exp(-d * d * 60.)) * k * uAlpha, k * uAlpha);
  }`;

export function playSparkIntro({
  target, wordEl, hooks = {}, ready = Promise.resolve(), onReveal, onDone,
  speed = 1, density = 1, reduce, manual = false, style = 'galaxy',
} = {}) {
  const orbitStyle = style === 'orbit';
  reduce ??= matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = innerWidth, H = innerHeight;
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  hooks.setOrigin?.(cx, cy);

  let done = false, revealed = false, raf = 0;
  const reveal = () => { if (!revealed) { revealed = true; onReveal?.(); } };

  // ── reduced motion: the light simply comes up ──
  if (reduce) {
    hooks.setGlade?.(0.45); hooks.startSky?.();
    ready.then(() => { hooks.setReveal?.(1); reveal(); onDone?.(); });
    return { skip() {}, dispose() {} };
  }

  // ── timeline (seconds at speed 1) ──
  const T = orbitStyle
    ? { burst: -1, leadIn: 0.35, in0: 1.35, inSpan: 1.6, c0: 5.0, cDur: 1.25, sweep0: 6.8, sweep1: 7.55, reveal0: 7.45, reveal1: 9.8, end: 10.3 }
    : { burst: 1.55, c0: 3.35, cDur: 1.15, sweep0: 5.05, sweep1: 5.85, reveal0: 5.75, reveal1: 8.1, end: 8.6 };
  for (const k in T) T[k] /= speed;

  // ── overlay ──
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, premultipliedAlpha: true });
  const pr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pr);
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  const cv = renderer.domElement;
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:100;cursor:pointer';
  document.body.appendChild(cv);

  const fov = 40;
  const D = (H / 2) / Math.tan((fov / 2) * Math.PI / 180);   // at this distance, 1 unit = 1 css px
  const camera = new THREE.PerspectiveCamera(fov, W / H, 10, D * 4);
  camera.position.set(0, 0, D);
  const scene = new THREE.Scene();

  // word points (page px → world: origin at screen centre, y up)
  const mobile = Math.min(W, H) < 600;
  const fontSize = parseFloat(getComputedStyle(target).fontSize);
  const step = Math.max(1.8, fontSize / 64) / Math.sqrt(density);
  const { pts } = sampleText(target, step);
  const nWord = pts.length;
  const nTotal = orbitStyle
    ? Math.max(nWord + 3000, Math.round((mobile ? 8000 : 14000) * density)) + 1   // +1: the lead spark
    : Math.max(nWord + 2000, Math.round((mobile ? 11000 : 24000) * density));
  const G = orbitStyle ? 10 : 1;   // trail copies per spark

  const seed = new Float32Array(nTotal * 4), tgt = new Float32Array(nTotal * 3), role = new Float32Array(nTotal),
    color = new Float32Array(nTotal * 3), delay = new Float32Array(nTotal), posArr = new Float32Array(nTotal * 3);
  const c = new THREE.Color();
  const L = rect.left - W / 2, R = rect.right - W / 2;
  for (let i = 0; i < nTotal; i++) {
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
    c.set(orbitStyle ? MOONLIGHT[(Math.random() * MOONLIGHT.length) | 0] : Math.random() < 0.07 ? TEAL : AMBER[(Math.random() * AMBER.length) | 0]);
    color.set([c.r, c.g, c.b], i * 3);
    if (i < nWord) {
      const [px, py] = pts[i];
      const x = px - W / 2, y = H / 2 - py;
      tgt.set([x, y, 0], i * 3);
      role[i] = 1;
      // outer letters land first, the middle last, with a little scatter
      const nx = (x - L) / (R - L || 1);
      delay[i] = (1 - Math.abs(nx - 0.5) * 2) * 0.42 / speed + Math.random() * 0.12 / speed;
    } else {
      // a place in the upper sky, clear of the word: scattered, thinning toward the edges
      let x, y, tries = 0;
      do {
        x = (Math.random() + Math.random() + Math.random() - 1.5) * W * 0.62;
        y = H * 0.5 - Math.pow(Math.random(), 1.4) * H * 0.55;
      } while (tries++ < 12 && Math.abs(x) < rect.width * 0.62 && y < H / 2 - rect.top + 50 && y > H / 2 - rect.bottom - 40);
      tgt.set([x, y, 0], i * 3);
    }
  }
  if (orbitStyle) {
    // the lead spark: enters first, from the left, and lands in the middle of the word
    const i = nTotal - 1, [px, py] = pts[(nWord / 2) | 0];
    seed.set([0.5, 0.1667, 0.5, 0], i * 4);
    tgt.set([px - W / 2, H / 2 - py, 0], i * 3);
    role[i] = 2; color.set([1, 1, 1], i * 3); delay[i] = 0.3 / speed;
  }
  // orbit style: every spark gets a place on the bee, loosely, so its edges glow rather than cut
  const home = new Float32Array(nTotal * 3);
  if (orbitStyle) {
    const beeSize = Math.min(H * 0.64, W * 0.7);
    const bee = sampleBee(beeSize, Math.max(2, beeSize / 190));
    const u = beeSize / 31;
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * u * 0.12;
    // shuffle so the sparks that land are spread evenly over the bee
    for (let i = bee.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [bee[i], bee[j]] = [bee[j], bee[i]]; }
    let k = 0;
    for (let i = 0; i < nTotal; i++) {
      if (k < bee.length && Math.random() < 0.5) {
        const [x, y, wing] = bee[k++];
        home.set([x + g(), y + g(), wing], i * 3);
      } else if (Math.random() < 0.1) {
        // a drifter: circles the bee in a thin, sparse ring
        home.set([beeSize * (0.92 + 0.08 * Math.random()), Math.random() * Math.PI * 2, 2], i * 3);
      } else {
        // a spare: aims somewhere on the bee, then fades as it lands
        const [x, y] = bee[(Math.random() * bee.length) | 0];
        home.set([x, y, 3], i * 3);
      }
    }
    home.set([0, 7.5 * beeSize / 31, 0], (nTotal - 1) * 3);   // the lead spark lands on the head
  }
  // expand: G copies of every spark (the trail), each told how far behind it runs
  const expand = (src, n) => { if (G === 1) return src; const out = new Float32Array(src.length * G); for (let g = 0; g < G; g++) out.set(src, g * src.length); return out; };
  const ghost = new Float32Array(nTotal * G);
  for (let g = 0; g < G; g++) ghost.fill(g, g * nTotal, (g + 1) * nTotal);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nTotal * G * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(expand(seed), 4));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(expand(tgt), 3));
  geo.setAttribute('aRole', new THREE.BufferAttribute(expand(role), 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(expand(color), 3));
  geo.setAttribute('aDelay', new THREE.BufferAttribute(expand(delay), 1));
  geo.setAttribute('aGhost', new THREE.BufferAttribute(ghost, 1));
  geo.setAttribute('aHome', new THREE.BufferAttribute(expand(home), 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

  const O = new THREE.Vector3(0, -H * 0.06, 0);   // where the first spark lights
  const U = {
    uT: { value: 0 }, uClock: { value: 0 }, uBurst: { value: T.burst }, uC0: { value: T.c0 }, uCDur: { value: T.cDur },
    uSweepX: { value: -1e4 }, uWordFade: { value: 0 }, uRise: { value: 0 }, uStarFade: { value: 0 },
    uPR: { value: pr }, uW: { value: W }, uH: { value: H }, uD: { value: D }, uO: { value: O }, uMoon: { value: MOON },
    uStyle: { value: orbitStyle ? 1 : 0 }, uGap: { value: 0.016 / speed }, uGhosts: { value: G },
    uLeadIn: { value: T.leadIn ?? 0 }, uIn0: { value: T.in0 ?? 0 }, uInSpan: { value: T.inSpan ?? 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader, fragmentShader, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,   // premultiplied additive
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // the lead spark (and its pop)
  const LU = { uSize: { value: 0 }, uAlpha: { value: 0 }, uPR: { value: pr }, uCol: { value: new THREE.Color('#ffb85c') } };
  const leadGeo = new THREE.BufferGeometry();
  leadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([O.x, O.y, O.z]), 3));
  const lead = new THREE.Points(leadGeo, new THREE.ShaderMaterial({
    uniforms: LU, vertexShader: leadVertex, fragmentShader: leadFragment, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  }));
  scene.add(lead);

  // the DOM wordmark waits for the moonrise
  // the letters are wiped on behind the sweep; the glow (which spills past the letters) just fades up
  const face = wordEl?.querySelector('.face') || wordEl;
  const halos = wordEl ? [...wordEl.querySelectorAll('.halo')] : [];
  const setWordSweep = (p) => {
    if (!wordEl) return;
    const m = p >= 1 ? '' : `linear-gradient(90deg, #000 ${p * 120 - 18}%, transparent ${p * 120}%)`;
    face.style.webkitMaskImage = m; face.style.maskImage = m;
    for (const h of halos) {
      if (p >= 1) h.style.removeProperty('opacity');
      else h.style.setProperty('opacity', String(0.7 * p * p), 'important');   // beats the breathing animation
    }
  };
  setWordSweep(0);

  // ── clock: holds before the reveal until the scene is ready; skip fast-forwards ──
  let isReady = false; ready.then(() => (isReady = true));
  let tl = 0, clock = 0, last = null, rate = 1, skyStarted = false;
  function skip() { if (tl < T.sweep0) rate = 6; }
  cv.addEventListener('click', skip);
  addEventListener('keydown', skip);

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', skip);
    setWordSweep(1);
    hooks.setReveal?.(1);
    reveal();
    geo.dispose(); mat.dispose(); leadGeo.dispose(); lead.material.dispose();
    renderer.dispose(); renderer.forceContextLoss(); cv.remove();
    onDone?.();
  }

  function frame(dt) {
    clock += dt;
    if (tl >= T.sweep0) rate = 1;
    const wait = !isReady && tl >= T.reveal0 - 0.3 / speed;   // never reveal a scene that isn't there
    if (!wait) tl += dt * rate;
    const t = tl;
    U.uT.value = t; U.uClock.value = clock;

    // lead spark: a pinprick that swells, flickers, then pops
    const flick = 0.8 + 0.2 * Math.sin(clock * 31) * Math.sin(clock * 17);
    if (orbitStyle) {
      LU.uAlpha.value = 0;
    } else if (t < T.burst) {
      const k = smooth(0.25 / speed, T.burst, t);
      LU.uSize.value = 6 + 40 * k * k;
      LU.uAlpha.value = smooth(0.2 / speed, 0.6 / speed, t) * flick;
    } else {
      const k = clamp01((t - T.burst) / (0.55 / speed));
      LU.uSize.value = 46 + 900 * Math.pow(k, 0.5);     // the pop: a bloom of light
      LU.uAlpha.value = (1 - k) * (1 - k) * 0.9;
    }

    // gentle camera drift while the swarm is out, settling exactly home before the word lands
    const sway = 1 - smooth(T.c0 - 0.3 / speed, T.c0 + T.cDur * 0.8, t);
    camera.position.set(Math.sin(clock * 0.45) * 140 * sway, Math.cos(clock * 0.37) * 70 * sway, D + 180 * sway * smooth(T.burst, T.burst + 1.5 / speed, t));
    camera.lookAt(0, 0, 0);

    // moonrise sweep across the word
    const sw = smooth(T.sweep0, T.sweep1, t);
    U.uSweepX.value = t < T.sweep0 ? -1e4 : (L - 80) + (R - L + 160) * sw;
    setWordSweep(t < T.sweep0 ? 0 : sw);
    U.uWordFade.value = smooth(T.sweep0 + (T.sweep1 - T.sweep0) * 0.55, T.sweep1 + 0.5 / speed, t);

    // the reveal: light pours down from the word
    const rv = smooth(T.reveal0, T.reveal1, t);
    hooks.setReveal?.(rv);
    hooks.setGlade?.(smooth(T.reveal0 - 0.2 / speed, T.reveal0 + 0.9 / speed, t) * (1 - 0.55 * smooth(T.reveal0 + 1.2 / speed, T.end + 1 / speed, t)));
    if (!skyStarted && t > T.reveal0 + 0.3 / speed) { skyStarted = true; hooks.startSky?.(); }
    U.uRise.value = smooth(T.reveal0 - 0.1 / speed, T.reveal0 + 1.5 / speed, t);
    U.uStarFade.value = smooth(T.reveal0 + 1.2 / speed, T.end, t);
    if (t > T.reveal0 + 0.9 / speed) reveal();
    if (t > T.reveal0) cv.style.pointerEvents = 'none';

    renderer.render(scene, camera);
    if (t >= T.end) finish();
  }

  if (manual) {
    return { skip, dispose: finish, seek(s) { while (clock < s && !done) frame(1 / 60); return { clock, tl, done }; } };
  }
  const loop = (ms) => {
    const dt = last === null ? 0 : Math.min(0.05, (ms - last) / 1000);
    last = ms;
    frame(dt);
    if (!done) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { skip, dispose: finish };
}
