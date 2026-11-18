// WebGL lab, round two.
// Same boat model as boat.js, now with:
//  · panels subdivided and gently bowed (paper under tension), folds kept sharp
//  · soft folds: light catches each crease, edges never read as hard vectors
//  · Ignite: an unlit (moonlit) boat catches light on hover / click
//  · Depth: one slider blends the lighting arc, surface candle → underwater
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { V, LIGHT, noise1 } from './boat.js';
import { buildGeometry, makePaperMaterial, makePaperUniforms } from './paper3d.js';

// Four lighting states: [unlit|lit] × [surface|underwater]. Depth and Ignite blend between them.
const LOOKS = {
  surfaceUnlit: { bg: '#071726', glow: '#ffae45', intensity: 0.0, outer: '#c9d5df', inner: '#93a8ba', ambient: '#25394e', moonCol: '#b9cfe6', water: '#04192a', bloom: 0.12 },
  surfaceLit:   { bg: '#04101b', glow: '#ffa63e', intensity: 1.85, outer: '#7c4e33', inner: '#2a160c', ambient: '#1a2a3a', moonCol: '#3e5c7c', water: '#021523', bloom: 0.62 },
  deepUnlit:    { bg: '#03303a', glow: '#ffcc6a', intensity: 0.0, outer: '#7cc4bb', inner: '#2f6b6c', ambient: '#0f4e58', moonCol: '#5fd0d0', water: '#03303a', bloom: 0.12 },
  deepLit:      { bg: '#032a33', glow: '#ffcc6a', intensity: 1.3, outer: '#4f9c95', inner: '#123c40', ambient: '#0f4e58', moonCol: '#5fd0d0', water: '#032a33', bloom: 0.8 },
};
const MOON_DIR = { surface: new THREE.Vector3(-0.5, 1, 0.6), deep: new THREE.Vector3(0.2, 1, 0.2) };

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
function blendLook(lit, depth) {
  const A = LOOKS.surfaceUnlit, B = LOOKS.surfaceLit, C = LOOKS.deepUnlit, D = LOOKS.deepLit;
  const c = (k) => {
    const s = new THREE.Color(A[k]).lerp(new THREE.Color(B[k]), lit);
    const d = new THREE.Color(C[k]).lerp(new THREE.Color(D[k]), lit);
    return s.lerp(d, depth);
  };
  const n = (k) => lerp(lerp(A[k], B[k], lit), lerp(C[k], D[k], lit), depth);
  return { bg: c('bg'), glow: c('glow'), outer: c('outer'), inner: c('inner'), ambient: c('ambient'), moonCol: c('moonCol'), water: c('water'), intensity: n('intensity'), bloom: n('bloom') };
}

export function mountLab(el, ui) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  camera.position.set(2.2, 1.4, 3.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.3, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.minDistance = 1.6; controls.maxDistance = 8;

  const shared = makePaperUniforms();
  const paperMat = (mirror) => makePaperMaterial(shared, mirror);

  const boat = new THREE.Group();
  let geo = buildGeometry(1);
  const mesh = new THREE.Mesh(geo, paperMat(0));
  boat.add(mesh);
  let edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.6 }));
  edges.visible = false; boat.add(edges);
  scene.add(boat);
  const mirror = new THREE.Mesh(geo, paperMat(1));
  mirror.scale.y = -1; scene.add(mirror);

  // water: dark plane whose opacity breaks into horizontal streaks over the reflection
  const waterU = { uTime: { value: 0 }, uCol: { value: new THREE.Color() } };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 1, 1), new THREE.ShaderMaterial({
    transparent: true, uniforms: waterU,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uCol; varying vec3 vW;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=vW.xz;
        float streak=n(vec2(p.x*2.2+uTime*.15, p.y*16.+uTime*.6))*.6+n(vec2(p.x*5., p.y*34.-uTime*.9))*.4;
        float a=mix(.62,.995,smoothstep(.3,.7,streak));
        float fade=smoothstep(9.,2.,length(p));
        gl_FragColor=vec4(uCol*(.85+.3*streak),mix(1.,a,fade));
      }`,
  }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.1;
  scene.add(water);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.9, 0.55, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // pins
  const pinLayer = document.createElement('div');
  pinLayer.className = 'pin-layer'; el.appendChild(pinLayer);
  const pinKeys = ['Tb', 'Tf', 'AL', 'DbL', 'DfL', 'DbR', 'DfR', 'KbL', 'KfL'];
  const pinEls = pinKeys.map((k) => { const d = document.createElement('span'); d.textContent = k; pinLayer.appendChild(d); return d; });

  const state = { pins: false, flicker: true, bob: true, litTarget: 1, lit: 1, hover: false, depth: 0, depthShown: 0 };

  ui.setPins = (v) => { state.pins = v; edges.visible = v; pinLayer.style.display = v ? 'block' : 'none'; };
  ui.setFlicker = (v) => (state.flicker = v);
  ui.setBob = (v) => (state.bob = v);
  ui.setLit = (v) => (state.litTarget = v ? 1 : 0);
  ui.setDepth = (v) => (state.depth = v);
  ui.setSoft = (v) => (shared.uSoft.value = v ? 1 : 0);
  ui.setBend = (v) => {
    const g = buildGeometry(v);
    mesh.geometry.dispose(); mesh.geometry = g; mirror.geometry = g;
    boat.remove(edges); edges.geometry.dispose();
    edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), edges.material); edges.visible = state.pins; boat.add(edges);
  };
  ui.setPins(false);

  // Ignite on hover: pointer over the boat lights it while the boat is "off"
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(9, 9);
  renderer.domElement.addEventListener('pointermove', (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });
  renderer.domElement.addEventListener('pointerleave', () => ptr.set(9, 9));

  function resize() {
    const r = el.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    composer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el); resize();

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(el);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();

    ray.setFromCamera(ptr, camera);
    state.hover = ray.intersectObject(mesh, false).length > 0;
    el.style.cursor = state.hover ? 'pointer' : '';
    const want = Math.max(state.litTarget, state.hover ? 1 : 0);
    // catch slowly (paper takes light), go out a little faster
    state.lit += (want - state.lit) * (want > state.lit ? 0.035 : 0.05);
    state.depthShown += (state.depth - state.depthShown) * 0.08;

    const lit = ease(Math.min(1, Math.max(0, state.lit)));
    const L = blendLook(lit, state.depthShown);
    shared.uGlow.value.copy(L.glow); shared.uOuter.value.copy(L.outer); shared.uInner.value.copy(L.inner);
    shared.uAmbient.value.copy(L.ambient); shared.uMoonCol.value.copy(L.moonCol);
    shared.uMoonDir.value.copy(moonDir.copy(MOON_DIR.surface).lerp(MOON_DIR.deep, state.depthShown));
    scene.background = L.bg; waterU.uCol.value.copy(L.water);
    bloom.strength = L.bloom;
    // underwater there is no surface to reflect in: fade the water plane's mirror away
    water.visible = state.depthShown < 0.98; mirror.visible = water.visible;
    water.material.opacity = 1;

    if (state.bob) {
      const k = 1 - state.depthShown * 0.6; // calmer underwater
      boat.position.y = Math.sin(t * 0.9) * 0.018 * k;
      boat.rotation.x = Math.sin(t * 0.7) * 0.05 * k;
      boat.rotation.z = Math.sin(t * 0.55 + 1) * 0.035 * k;
    }
    mirror.position.y = 0.2 - boat.position.y;
    mirror.rotation.x = -boat.rotation.x; mirror.rotation.z = -boat.rotation.z;
    boat.updateMatrixWorld();

    const fl = state.flicker ? 0.86 + 0.14 * noise1(t * 7) * noise1(t * 2.3 + 9) * 1.6 : 1;
    // a just-lit wick sputters before it settles
    const sputter = lit < 0.98 && lit > 0.05 ? 0.75 + 0.25 * noise1(t * 22) : 1;
    shared.uIntensity.value = L.intensity * fl * sputter;
    const lp = tmp.set(...LIGHT).applyMatrix4(boat.matrixWorld);
    mesh.material.uniforms.uLight.value.copy(lp);
    mirror.material.uniforms.uLight.value.set(lp.x, 0.2 - lp.y, lp.z);

    waterU.uTime.value = t;
    controls.update();
    composer.render();

    if (state.pins) {
      const r = el.getBoundingClientRect();
      pinKeys.forEach((k, i) => {
        tmp.set(...V[k]).applyMatrix4(boat.matrixWorld).project(camera);
        pinEls[i].style.transform = `translate(${(tmp.x * 0.5 + 0.5) * r.width}px, ${(-tmp.y * 0.5 + 0.5) * r.height}px)`;
      });
    }
    ui.onLit && ui.onLit(state.lit);
  });
}
