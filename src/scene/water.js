// Water study: night water with a fleet of glowing paper boats.
//
// The reference water is painted: long horizontal brush strokes, each one a
// single tone. Light and reflections land on whole strokes, so they break up
// along the brush marks instead of forming smooth pools. We model that:
//   · a warped, stretched noise field = the strokes, stepped into tones
//   · a real planar reflection (Reflector), pulled into vertical streaks
//   · candlelight from every boat, landing stroke by stroke
//   · moonlight on a few stroke crests, and a pale edge on the brightest strokes
//   · optional Kuwahara pass (painterly filter) and a grade (vignette, grain)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LIGHT, noise1 } from './boat.js';
import { buildGeometry, makePaperMaterial, makePaperUniforms } from './paper3d.js';

const MAX_BOATS = 24;

// Colours sampled down the reference (far → near): #02233c, #023451, #07405d, #25516b (lit mid), #041a2c (foreground)
const PAL = {
  far: '#02233c', mid: '#104a68', near: '#0d3a52', rim: '#5f8fae', moon: '#9cc3dc', glow: '#ffa63e', sky: '#021a2c',
};

// ── the water material: a Reflector with our own shader ──
const WaterShader = {
  name: 'PlateWater',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uTime: { value: 0 }, uMode: { value: 1 },   // 1 = smooth (chosen), 0 = painted strokes uLayer: { value: 0 },
    uScale: { value: 5 }, uWind: { value: 1 }, uReflect: { value: 1 },
    uFar: { value: new THREE.Color(PAL.far) }, uMid: { value: new THREE.Color(PAL.mid) }, uNear: { value: new THREE.Color(PAL.near) },
    uRim: { value: new THREE.Color(PAL.rim) }, uMoonCol: { value: new THREE.Color(PAL.moon) }, uMoonDir: { value: new THREE.Vector3(-0.35, 0.75, -0.55).normalize() },
    uGlow: { value: new THREE.Color(PAL.glow) }, uSky: { value: new THREE.Color(PAL.sky) },
    uBoats: { value: Array.from({ length: MAX_BOATS }, () => new THREE.Vector4()) }, uCount: { value: 0 },
    uGlade: { value: 0 }, uGladePos: { value: new THREE.Vector3(0, 8, -26) },   // the moon's path of light on the water
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUvR; varying vec3 vW;
    void main(){
      vUvR = textureMatrix * vec4(position, 1.0);
      vW = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    #define MAXB ${MAX_BOATS}
    uniform sampler2D tDiffuse; uniform float uTime, uMode, uLayer, uScale, uWind, uReflect;
    uniform vec3 uFar, uMid, uNear, uRim, uMoonCol, uMoonDir, uGlow, uSky;
    uniform vec4 uBoats[MAXB]; uniform int uCount;
    uniform float uGlade; uniform vec3 uGladePos;
    varying vec4 vUvR; varying vec3 vW;

    float h21(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*15731.743); }
    float vn(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
      return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }

    // Painted strokes: long horizontal brush marks, gently warped so they curve
    // like the reference's swells. Stroke size and Wind control them.
    float strokes(vec2 p){
      vec2 q = p * vec2(.45, 2.6) * uScale / 5.;            // about 5x longer than deep
      q += vec2(uTime*.04, uTime*.10) * uWind;
      vec2 w = vec2(fbm(q*.6 + vec2(3.1,1.7) + uTime*.02*uWind), fbm(q*.6 + vec2(8.3,2.8)));
      q += (w - .5) * vec2(1.6, .5);
      return fbm(q);
    }

    void main(){
      vec3 V = normalize(cameraPosition - vW);
      float dist = length(cameraPosition.xz - vW.xz);
      bool painted = uMode < .5;

      // ── surface: painted strokes, or a smooth ripple field ──
      vec3 N; float s = .5, band = .5, edgeLine = 0.;
      if (painted) {
        float e = .03;
        s = strokes(vW.xz);
        float sx = strokes(vW.xz + vec2(e, 0.)), sz = strokes(vW.xz + vec2(0., e));
        N = normalize(vec3((s - sx)/e * .09 * (.5 + .5*uWind), 1., (s - sz)/e * .05 * (.5 + .5*uWind)));
        // paint in steps: each stroke holds one tone, like a loaded brush
        float steps = 6.;
        band = mix(s, floor(s*steps)/steps, .65);
        edgeLine = 1. - smoothstep(0., .07, fract(s*steps));   // where one stroke ends and the next begins
      } else {
        vec2 p = vW.xz*vec2(1.4,3.2) + vec2(uTime*.08, uTime*.21)*uWind;
        float e = .05, n0 = vn(p)+.5*vn(p*2.3);
        float nx = vn(p+vec2(e,0))+.5*vn((p+vec2(e,0))*2.3), nz = vn(p+vec2(0,e))+.5*vn((p+vec2(0,e))*2.3);
        N = normalize(vec3((n0-nx)/e*.18*uWind, 1., (n0-nz)/e*.18*uWind));
      }

      // ── base: the measured gradient far → near, each stroke a touch lighter or darker ──
      float t = smoothstep(2., 14., dist);
      vec3 base = mix(uNear, uMid, smoothstep(0., .45, t));
      base = mix(base, uFar, smoothstep(.45, 1., t));
      base *= 1. + (painted ? (band - .5)*.75 : 0.) + .12*N.x;
      float fres = pow(1. - max(dot(V, N), 0.), 4.);

      // ── moonlight: a cool glint on a few stroke crests, and a pale edge on the brightest strokes ──
      vec3 H = normalize(uMoonDir + V);
      float spec = smoothstep(.993, .9995, dot(N, H)) * (painted ? step(.6, s) : 1.) * smoothstep(4., 9., dist);   // glints only in the distance
      float rim = painted ? edgeLine * smoothstep(.55, .7, s) : 0.;
      vec3 moon = uMoonCol*spec*(painted ? .22 : .07) + uRim*rim*.16;   // smooth water: a few faint glints, not confetti

      // ── reflection: pulled down into vertical streaks, broken along the strokes ──
      vec4 ru = vUvR; ru.xy += vec2(N.x*.05, N.z*.14) * ru.w;
      vec3 refl = texture2DProj(tDiffuse, ru).rgb;
      float rk = uReflect * mix(.45, .95, fres + .35);
      if (painted) rk *= .45 + .75*smoothstep(.35, .65, band);

      // ── candlelight: every boat's flame lights the water around it ──
      vec3 warm = vec3(0.);
      vec2 P = vW.xz;
      for (int i=0;i<MAXB;i++){
        if (i >= uCount) break;
        vec4 b = uBoats[i];
        vec2 dv = P - b.xz;
        dv.x *= .75;                                  // pools spread sideways, along the strokes
        float d2 = dot(dv,dv);
        float fall = b.w / (1. + 16.*d2);
        vec3 Lb = normalize(vec3(b.x, b.y+.25, b.z) - vec3(P.x, 0., P.y));
        float face = .35 + .65*max(dot(N, normalize(Lb + V)), 0.);
        warm += uGlow * fall * face;
      }
      float wl = dot(warm, vec3(.3,.5,.2));
      vec3 col = base*(1.-rk*.55) + refl*rk + moon;
      // light lands on whole strokes: amber painted over the blue, broken along the brush marks
      float frag = painted ? smoothstep(.12, .3, wl * (.35 + 1.3*band)) : smoothstep(.05, .5, wl);
      // linear-light values (the output pass converts to sRGB): fringe #b8561a, mid #f2953a, hot #ffd27a
      vec3 amber = mix(mix(vec3(.48,.09,.01), vec3(.89,.30,.04), smoothstep(.12,.38,wl)), vec3(1.,.64,.19), smoothstep(.5, 1.3, wl)) * (painted ? .8 + .35*band : 1.);
      col = mix(col, amber, frag * .92);
      col += uGlow * wl * .12;   // a faint glow under everything near a boat
      warm = mix(vec3(0.), amber, frag);
      // the moon path: the wordmark's light glittering on the ripples, in a column toward the viewer
      if (uGlade > 0.) {
        vec3 Lm = normalize(uGladePos - vW);
        float nh = max(dot(N, normalize(Lm + V)), 0.);
        float glint = pow(nh, 700.);
        float sparkle = .35 + 1.3 * h21(floor(vW.xz * vec2(30., 60.)) + floor(uTime * 5.));
        float sheen = pow(nh, 40.) * .08;
        col += vec3(.80, .86, .95) * (glint * sparkle * 1.6 + sheen) * uGlade * smoothstep(1.5, 4., dist);
      }
      // far water dissolves into the night sky: no visible horizon edge
      col = mix(col, uSky, smoothstep(14., 45., dist));
      // layer isolation for the breakdown
      if (uLayer > .5 && uLayer < 1.5) col = base;
      else if (uLayer > 1.5 && uLayer < 2.5) col = vec3(.05,.08,.15) + vec3(.35,.45,.6)*band + vec3(rim*.5);
      else if (uLayer > 2.5 && uLayer < 3.5) col = base*.25 + moon*1.6;
      else if (uLayer > 3.5 && uLayer < 4.5) col = refl*rk;
      else if (uLayer > 4.5 && uLayer < 5.5) col = base*.2 + warm;
      gl_FragColor = vec4(col, 1.);
    }`,
};

// ── painterly filter: classic 4-sector Kuwahara ──
const KuwaharaShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uAmount: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    #define R 4
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uAmount; varying vec2 vUv;
    void main(){
      vec2 px = 1.5 / uRes;
      vec3 m[4]; vec3 s[4];
      for (int k=0;k<4;k++){ m[k]=vec3(0.); s[k]=vec3(0.); }
      for (int j=0;j<=R;j++) for (int i=0;i<=R;i++){
        vec3 c;
        c = texture2D(tDiffuse, vUv + vec2(-i,-j)*px).rgb; m[0]+=c; s[0]+=c*c;
        c = texture2D(tDiffuse, vUv + vec2( i,-j)*px).rgb; m[1]+=c; s[1]+=c*c;
        c = texture2D(tDiffuse, vUv + vec2( i, j)*px).rgb; m[2]+=c; s[2]+=c*c;
        c = texture2D(tDiffuse, vUv + vec2(-i, j)*px).rgb; m[3]+=c; s[3]+=c*c;
      }
      float n = float((R+1)*(R+1)); float best = 1e9; vec3 outc = vec3(0.);
      for (int k=0;k<4;k++){
        vec3 mu = m[k]/n; vec3 v = abs(s[k]/n - mu*mu); float sv = v.r+v.g+v.b;
        if (sv < best){ best = sv; outc = mu; }
      }
      gl_FragColor = vec4(mix(texture2D(tDiffuse, vUv).rgb, outc, uAmount), 1.);
    }`,
};

// ── grade: the reference darkens hard at top and bottom; plus fine grain ──
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 1 },
    uReveal: { value: 1 }, uOrigin: { value: new THREE.Vector2(0.5, 0.6) }, uAspect: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uReveal, uAspect; uniform vec2 uOrigin; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float v = smoothstep(0., .32, vUv.y) * (1. - .35*smoothstep(.75, 1., vUv.y));
      v *= 1. - .35*pow(abs(vUv.x-.5)*2., 2.5);
      c *= mix(1., .25 + .75*v, uVig);
      c += (h(vUv*1000. + uTime) - .5) * .012;
      // intro reveal: the scene appears where light has reached. It pours downward from the
      // origin (the wordmark) faster than it spreads sideways, like moonlight spilling onto water.
      if (uReveal < 1.) {
        vec2 d = vec2((vUv.x - uOrigin.x) * uAspect, vUv.y < uOrigin.y ? (uOrigin.y - vUv.y) * .42 : (vUv.y - uOrigin.y) * 1.1);
        d.x *= 1. + .9 * max(uOrigin.y - vUv.y, 0.);   // narrow at the bottom: a column of light, not a circle
        float L = length(d), r = uReveal * 2.4;
        // a wide, soft falloff: light spreading, not a shape being cut out
        float m = 1. - smoothstep(r * .15, r, L);
        m *= m * (3. - 2. * m);
        c *= m;
      }
      gl_FragColor = vec4(c, 1.);
    }`,
};

// deterministic random so the fleet is the same every load
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function mountWater(el, ui, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // opts.lite (phones): a lower render resolution and a smaller reflection, so a phone's GPU keeps up
  renderer.setPixelRatio(Math.min(devicePixelRatio, opts.lite ? 1.25 : 1.5));
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 2.5; controls.maxDistance = 22;
  controls.enabled = false;

  const VIEWS = {
    hero: { pos: [0.4, 5.2, 7.2], target: [0, 0, -0.6] },   // high, looking down into the water, like the reference
    low: { pos: [0, 1.15, 7.5], target: [0, 0.3, 0] },       // eye level: long reflections, far strokes stretch out
    top: { pos: [0, 11, 1.2], target: [0, 0, 0] },          // straight down: the strokes read as a painted surface
    ...(opts.views || {}),
  };
  function setView(name) {
    const v = VIEWS[name]; camera.position.set(...v.pos); controls.target.set(...v.target); camera.lookAt(controls.target);
    state.view = name;
  }

  // ── water ──
  const water = new Reflector(new THREE.PlaneGeometry(140, 140), {
    shader: WaterShader, textureWidth: opts.lite ? 512 : 1024, textureHeight: opts.lite ? 512 : 1024, clipBias: 0.002,
  });
  water.rotation.x = -Math.PI / 2; water.position.y = 0;
  scene.add(water);
  const WU = water.material.uniforms;

  // ── fleet ──
  const shared = makePaperUniforms();
  shared.uMirror = { value: 0 };
  shared.uGlow.value.set('#ffa63e'); shared.uOuter.value.set('#7c4e33'); shared.uInner.value.set('#2a160c');
  shared.uAmbient.value.set('#1a2a3a'); shared.uMoonCol.value.set('#3e5c7c'); shared.uMoonDir.value.set(-0.5, 1, 0.6);
  // the Reflector draws the scene from a mirrored camera, which flips triangle winding: tell the paper
  const ob = water.onBeforeRender;
  water.onBeforeRender = function (...a) { shared.uMirror.value = 1; ob.apply(this, a); shared.uMirror.value = 0; };

  const geo = buildGeometry(1);
  const fleet = [];
  const fleetGroup = new THREE.Group(); scene.add(fleetGroup);
  function makeFleet(n) {
    // keep boats that belong to someone (e.g. the one in the figure's hands)
    for (const b of fleet.filter((f) => !f.keep)) { fleetGroup.remove(b.group); b.mat.dispose(); }
    const kept = fleet.filter((f) => f.keep); fleet.length = 0; fleet.push(...kept);
    const R = rng(7); const placed = [];
    let tries = 0;
    while (placed.length < n && tries++ < 2000) {
      // a loose cluster, denser in the middle, like the reference
      const a = R() * Math.PI * 2, rr = Math.pow(R(), 0.7) * 3.4 * (opts.spread ?? 1);
      const x = Math.cos(a) * rr * 1.25, z = Math.sin(a) * rr * 0.8 + 0.3;
      const s = (0.26 + R() * 0.16) * (opts.boatScale ?? 1);
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < (p.s + s) * 1.25)) continue;
      if ((opts.exclude || []).some((e) => Math.hypot(e.x - x, e.z - z) < e.r + s)) continue;
      placed.push({ x, z, s });
    }
    for (const p of placed) addBoat({ x: p.x, z: p.z, s: p.s, rotY: R() * Math.PI * 2, phase: R() * 100, power: 0.85 + R() * 0.3 });
  }
  function addBoat({ x = 0, z = 0, s = 0.3, rotY = 0, phase = Math.random() * 100, power = 1, lit = 1, litTarget = 1, keep = false } = {}) {
    if (fleet.length >= MAX_BOATS) removeBoat(fleet.find((f) => !f.keep));
    const mat = makePaperMaterial(shared);
    mat.uniforms.uIntensity = { value: 1.5 };
    mat.uniforms.uFallScale = { value: s };
    const mesh = new THREE.Mesh(geo, mat);
    const group = new THREE.Group();
    group.add(mesh); group.position.set(x, 0, z); group.scale.setScalar(s);
    group.rotation.y = rotY;
    // sit in the water: the hull below the waterline is hidden by the water plane
    mesh.position.y = -0.1;
    fleetGroup.add(group);
    const b = { group, mesh, mat, phase, lit, litTarget, power, keep, follow: null, lightPos: new THREE.Vector3(), glow: 0 };
    fleet.push(b);
    return b;
  }
  function removeBoat(b) {
    if (!b) return;
    fleetGroup.remove(b.group); b.mat.dispose();
    fleet.splice(fleet.indexOf(b), 1);
  }

  // ── post ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const kuwa = new ShaderPass(KuwaharaShader); composer.addPass(kuwa);
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.7, 0.6, 0.6); composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);
  composer.addPass(new OutputPass());

  const state = { view: 'hero', allLit: true, paint: true, orbit: false };
  ui.setMode = (m) => (WU.uMode.value = m === 'smooth' ? 1 : 0);
  ui.setPaint = (v) => { state.paint = v; kuwa.enabled = v; };
  ui.setWind = (v) => (WU.uWind.value = v);
  ui.setScale = (v) => (WU.uScale.value = v);
  ui.setReflect = (v) => (WU.uReflect.value = v);
  ui.setCount = (n) => makeFleet(n);
  ui.setLayer = (n) => (WU.uLayer.value = n);
  ui.setView = (v) => setView(v);
  ui.setOrbit = (v) => { state.orbit = v; controls.enabled = v; if (!v) setView(state.view); };
  ui.setAllLit = (v) => { state.allLit = v; fleet.forEach((b) => (b.litTarget = v ? 1 : 0)); };

  // anything else that lives in this scene (e.g. a figure) can hook in here
  const clickables = [];   // { objects: [Mesh], onClick() }
  const tickers = [];      // fn(t, dt)
  const api = { scene, camera, renderer, fleet, addBoat, removeBoat, shared, tickers, clickables, water, PAL, MAX_BOATS, grade, WU };

  ui.debug = () => ({ lit: fleet.map((b) => +b.lit.toFixed(2)), target: fleet.map((b) => b.litTarget), frames });
  let frames = 0;
  makeFleet(opts.count ?? 14);
  setView(opts.view || 'hero');

  // hover a boat to ignite it (when the fleet is dark)
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(9, 9);
  const mouse = { x: 0, y: 0 };
  renderer.domElement.addEventListener('pointermove', (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    mouse.x = ptr.x; mouse.y = ptr.y;
  });
  renderer.domElement.addEventListener('pointerleave', () => ptr.set(9, 9));
  renderer.domElement.addEventListener('click', () => {
    ray.setFromCamera(ptr, camera);
    for (const c of clickables) if (ray.intersectObjects(c.objects, true).length) { c.onClick(); return; }
    const hit = ray.intersectObjects(fleet.map((b) => b.mesh), false)[0];
    if (hit) { const b = fleet.find((f) => f.mesh === hit.object); b.litTarget = b.litTarget ? 0 : 1; }
  });

  function resize() {
    const r = el.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); composer.setSize(r.width, r.height);
    const pr = renderer.getPixelRatio();
    KuwaharaShader.uniforms.uRes.value.set(r.width * pr, r.height * pr);
    kuwa.uniforms.uRes.value.set(r.width * pr, r.height * pr);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    grade.uniforms.uAspect.value = r.width / r.height;
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting)); io.observe(el);
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const base = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    frames++;
    const t = clock.getElapsedTime();

    // a slow drift of the camera with the pointer: the scene breathes, never swings
    if (!state.orbit) {
      const v = VIEWS[state.view];
      base.set(...v.pos);
      const drift = opts.drift ?? 1;   // 0 for reduced motion
      camera.position.lerp(tmp.set(base.x + mouse.x * 0.35 * drift, base.y + mouse.y * 0.15 * drift, base.z), 0.03);
      camera.lookAt(...v.target);
      api.camRest = { pos: base, target: v.target };   // where the camera sits with no pointer (the sky pins to this)
    } else { controls.update(); api.camRest = null; }

    ray.setFromCamera(ptr, camera);
    const hover = ray.intersectObjects(fleet.map((b) => b.mesh), false)[0];
    const hoverOther = clickables.some((c) => ray.intersectObjects(c.objects, true).length);
    el.style.cursor = hover || hoverOther ? 'pointer' : '';
    const dt = Math.min(0.05, t - (api.lastT ?? t)); api.lastT = t;
    for (const fn of tickers) fn(t, dt);

    WU.uCount.value = fleet.length;
    fleet.forEach((b, i) => {
      const g = b.group, ph = b.phase;
      if (b.follow) b.follow(b, t, dt);    // carried or animated by something else
      else {
        g.position.y = Math.sin(t * 0.9 + ph) * 0.012;
        g.rotation.x = Math.sin(t * 0.7 + ph) * 0.05;
        g.rotation.z = Math.sin(t * 0.55 + ph * 1.3) * 0.04;
        g.rotation.y += 0.0006 * Math.sin(ph); // each boat turns very slowly
      }
      const want = Math.max(b.litTarget, hover && hover.object === b.mesh ? 1 : 0);
      b.lit += (want - b.lit) * (want > b.lit ? 0.035 : 0.05);
      const lit = b.lit * b.lit * (3 - 2 * b.lit);
      const fl = 0.86 + 0.14 * noise1(t * 7 + ph) * noise1(t * 2.3 + ph) * 1.6;
      const sputter = lit < 0.98 && lit > 0.05 ? 0.75 + 0.25 * noise1(t * 22 + ph) : 1;
      b.mat.uniforms.uIntensity.value = 2.1 * b.power * lit * fl * sputter;
      g.updateMatrixWorld();
      const lp = tmp.set(...LIGHT).applyMatrix4(b.mesh.matrixWorld);
      b.mat.uniforms.uLight.value.copy(lp);
      // a boat held above the water lights it less; one on the water lights it fully
      const onWater = b.onWater ?? 1;
      WU.uBoats.value[i].set(lp.x, lp.y, lp.z, 0.95 * b.power * lit * fl * sputter * onWater * (opts.lightScale ?? 1));
      b.lightPos.copy(lp); b.glow = b.power * lit * fl * sputter;
    });

    WU.uTime.value = t; grade.uniforms.uTime.value = t;
    composer.render();
  });
  // tear everything down (React unmounts, hot reloads, page transitions)
  api.dispose = () => {
    renderer.setAnimationLoop(null);
    ro.disconnect(); io.disconnect();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { for (const v of Object.values(m.uniforms || {})) v?.value?.isTexture && v.value.dispose(); m.map?.dispose?.(); m.dispose(); }
    });
    water.getRenderTarget?.().dispose();
    composer.dispose?.();
    renderer.dispose(); renderer.forceContextLoss();
    renderer.domElement.remove();
  };
  return api;
}
