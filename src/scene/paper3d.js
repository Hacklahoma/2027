// Shared 3D paper boat: geometry + paper shader.
// Used by the boat lab and the water study, so both show the exact same boat.
import * as THREE from 'three';
import { V, FACES } from './boat.js';

// ── geometry: each fold panel subdivided and bowed; folds stay put ──
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
export function buildGeometry(bend, N = 10) {
  const pos = [], edge = [], sail = [], idx = [];
  const tris = [];
  for (const f of FACES) {
    const vs = f.v.map((k) => V[k]);
    const list = vs.length === 4 ? [[vs[0], vs[1], vs[2]], [vs[0], vs[2], vs[3]]] : [vs];
    // a quad's diagonal is not a fold, so we only treat its outer edges as creases
    list.forEach((t, qi) => tris.push({ t, n: f.normal, kind: f.kind, quad: vs.length === 4 ? qi : -1 }));
  }
  for (const { t: [a, b, c], n, kind, quad } of tris) {
    const base = pos.length / 3;
    const seed = a[0] + b[1] * 3 + c[2] * 7;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N - i; j++) {
        const u = i / N, v = j / N, w = 1 - u - v; // barycentric (w→a, u→b, v→c)
        const p = [0, 1, 2].map((k) => a[k] * w + b[k] * u + c[k] * v);
        // bow: zero on every fold, largest mid-panel
        const bow = 27 * u * v * w;
        // a low, irregular wobble so no two panels bend alike
        const wob = Math.sin(u * 4.1 + seed * 13.0) * Math.cos(v * 3.3 + seed * 7.0) * 0.35;
        const amt = bend * 0.035 * bow * (1 + wob);
        for (let k = 0; k < 3; k++) p[k] += n[k] * amt; // every panel bows outward
        // distance to the nearest real fold. A quad's diagonal is not a fold, so skip it:
        // tri (q0,q1,q2) has its diagonal opposite b (u=0); tri (q0,q2,q3) opposite b too (v=0).
        const e = quad === 0 ? Math.min(v, w) : quad === 1 ? Math.min(w, u) : Math.min(u, v, w);
        pos.push(...p); edge.push(e); sail.push(kind === 'sail' ? 1 : 0);
      }
    }
    const grid = []; let k = base;
    for (let i = 0; i <= N; i++) { grid[i] = []; for (let j = 0; j <= N - i; j++) grid[i][j] = k++; }
    for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
      idx.push(grid[i][j], grid[i + 1][j], grid[i][j + 1]);
      if (j < N - i - 1) idx.push(grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  g.setAttribute('aSail', new THREE.Float32BufferAttribute(sail, 1));
  g.setIndex(idx);
  g.computeVertexNormals(); // smooth within a panel only: panels don't share vertices, so folds stay crisp
  return g;
}


export const makePaperMaterial = (shared, mirror = 0) => new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: { uFallScale: { value: 1 }, ...shared, uLight: { value: new THREE.Vector3() }, uMirror: shared.uMirror || { value: mirror } },
  vertexShader: /* glsl */`
    attribute float aSail; attribute float aEdge;
    varying float vSail; varying float vEdge; varying vec3 vW; varying vec3 vN; varying vec3 vL;
    void main(){ vSail=aSail; vEdge=aEdge; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vL=position;
      vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: /* glsl */`
    uniform vec3 uLight,uGlow,uOuter,uInner,uAmbient,uMoonCol,uMoonDir; uniform float uIntensity,uMirror,uSoft,uFallScale;
    varying float vSail; varying float vEdge; varying vec3 vW; varying vec3 vN; varying vec3 vL;
    float h(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
    void main(){
      // Mirrored copies (scale -1, or the Reflector's camera) keep correct facing on their own,
      // so uMirror only dims the reflection; it never flips inside/outside.
      bool front = gl_FrontFacing;
      bool outer = front && vSail<.5;
      vec3 N=normalize(vN); if(!front) N=-N;
      vec3 Lv=uLight-vW; float d=length(Lv); vec3 L=Lv/d; d/=uFallScale;
      float fall=uIntensity/(1.+7.*d*d);
      float fiber=.9+.1*n3(vL*60.)+.05*(n3(vL*vec3(5.,120.,5.))-.5);
      vec3 M=normalize(uMoonDir); float moon=abs(dot(N,M))*.75+.25;
      // fold: 1 right on a crease, 0 a little way into the panel
      float fold=1.-smoothstep(0.,.07,vEdge);
      vec3 col;
      if(outer){
        float trans=fall*.5*pow(smoothstep(.12,.62,vL.y),1.6);
        col=uOuter*(uAmbient+uMoonCol*moon*.38)*mix(.55,1.,smoothstep(0.,.5,vL.y))+uGlow*trans;
        // a rounded fold catches a thin rim of moon and candle light
        col+=uSoft*fold*(uMoonCol*.10+uGlow*trans*.9);
      } else {
        float lam=abs(dot(N,L))*.65+.35;
        col=uInner*(uAmbient+uMoonCol*moon*.35)+uGlow*fall*lam+uGlow*fall*fall*.12;
        // inside, creases sit slightly in shadow: the fold turns away from the light
        col*=1.-uSoft*fold*.22;
      }
      col*=fiber; if(uMirror>.5) col*=.55;
      gl_FragColor=vec4(col,1.);
    }`,
});


// Uniforms one boat (or a whole fleet) shares; light position is per material.
export function makePaperUniforms() {
  return {
    uGlow: { value: new THREE.Color() }, uIntensity: { value: 2 },
    uOuter: { value: new THREE.Color() }, uInner: { value: new THREE.Color() }, uAmbient: { value: new THREE.Color() },
    uMoonCol: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3() }, uSoft: { value: 1 },
  };
}
