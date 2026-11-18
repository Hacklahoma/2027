// The sky above the water: constellations drawn like a plotted star chart.
//
// From the SASEHacks graphic: numbered points labelled "N → x – y", thin
// circles passing exactly through three points (circumcircles), straight
// joins, long dashed guide lines. From the Figma: quiet concentric rings with
// a few dots and "05 / 92" labels. Our constellations mean something:
//   The Vessel  (the paper boat)   ·  Two Worlds (two circles meeting)
//   The Spark   (a four-point star) ·  The Bracket ( </> )
//
// Drawn on two canvases (lines + labels, and stars) that sit far out over the
// water as two planes, so the water reflects the sky like a real mirror.
import * as THREE from 'three';

export const W = 3000, H = 1200;
export const DURATION = 13;       // seconds for the whole sky to draw itself on   // canvas size; design space = canvas / 2 (1500 × 600)
const S = 2;                        // design → canvas scale

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function circumcircle(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-6) return null;
  const sq = (p) => p[0] * p[0] + p[1] * p[1];
  const ux = (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d;
  const uy = (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d;
  return [ux, uy, Math.hypot(a[0] - ux, a[1] - uy)];
}

// ── the constellations (design space 1500 × 600; the hero text will sit in the middle) ──
export const SHAPES = {
  vessel: {
    name: 'The Vessel',
    pts: [[130, 150], [212, 214], [262, 112], [312, 214], [394, 150], [334, 270], [190, 270]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [1, 3]],
    circles: [[0, 2, 4]],
  },
  worlds: {
    name: 'Two Worlds',
    // two circles meeting; the stars sit where they cross and at their centres
    rings: [[700, 128, 78], [800, 128, 78]],
    pts: [[750, 69.6], [750, 186.4], [700, 128], [800, 128], [622, 128], [878, 128]],
    edges: [[2, 3], [0, 1]],
    circles: [],
  },
  spark: {
    name: 'The Spark',
    pts: [[1262, 70], [1290, 142], [1362, 170], [1290, 198], [1262, 270], [1234, 198], [1162, 170], [1234, 142]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [0, 4], [2, 6]],
    circles: [[0, 2, 4]],
  },
  bracket: {
    name: 'The Bracket',
    pts: [[1110, 360], [1062, 404], [1110, 448], [1140, 456], [1176, 352], [1206, 360], [1254, 404], [1206, 448]],
    edges: [[0, 1], [1, 2], [3, 4], [5, 6], [6, 7]],
    circles: [],
  },
};

// a wandering, numbered path across the sky: the SASEHacks "plotted" look
function plottedPath(R, keepClear) {
  const pts = []; let x = 40, y = keepClear ? 160 : 380;
  for (let i = 0; i < 26; i++) {
    x += 40 + R() * 70; y += (R() - 0.55) * 120; y = Math.max(40, Math.min(keepClear ? 230 : 560, y));
    if (x > 1460) break;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Draw the sky. style: 'plotted' | 'chart' | 'shapes' | 'blend'.
 * progress (0–1) draws the lines on; labels fade in behind them.
 * Returns two canvases: lines (lines, rings, labels) and stars.
 */
export function drawSky(style, progress = 1, { seed = 5, linesCanvas, starsCanvas } = {}) {
  const lc = linesCanvas || Object.assign(document.createElement('canvas'), { width: W, height: H });
  const sc = starsCanvas || Object.assign(document.createElement('canvas'), { width: W, height: H });
  const L = lc.getContext('2d'), St = sc.getContext('2d');
  L.clearRect(0, 0, W, H); St.clearRect(0, 0, W, H);
  const R = rng(seed);
  const ink = 'rgba(232,240,248,', mono = (px) => `${px * S}px "DM Mono", ui-monospace, Menlo, monospace`;

  const line = (a, b, alpha, t = 1, dash = null, w = 1.1) => {
    if (t <= 0) return;
    L.save(); L.strokeStyle = ink + alpha + ')'; L.lineWidth = w * S; if (dash) L.setLineDash(dash.map((d) => d * S));
    L.beginPath(); L.moveTo(a[0] * S, a[1] * S); L.lineTo((a[0] + (b[0] - a[0]) * t) * S, (a[1] + (b[1] - a[1]) * t) * S); L.stroke(); L.restore();
  };
  const ring = (cx, cy, r, alpha, t = 1, w = 1, dash = null) => {
    if (t <= 0) return;
    L.save(); L.strokeStyle = ink + alpha + ')'; L.lineWidth = w * S; if (dash) L.setLineDash(dash.map((d) => d * S));
    L.beginPath(); L.arc(cx * S, cy * S, r * S, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t); L.stroke(); L.restore();
  };
  const label = (text, x, y, alpha, size = 9.5) => {
    if (alpha <= 0) return;
    L.save(); L.font = mono(size); L.fillStyle = ink + (alpha * 0.8).toFixed(3) + ')'; L.fillText(text, x * S, y * S); L.restore();
  };
  const star = (x, y, r, a, ringed = false) => {
    const g = St.createRadialGradient(x * S, y * S, 0, x * S, y * S, r * 4 * S);
    g.addColorStop(0, `rgba(255,250,236,${a})`); g.addColorStop(0.22, `rgba(235,242,255,${a * 0.55})`); g.addColorStop(1, 'rgba(200,220,255,0)');
    St.fillStyle = g; St.beginPath(); St.arc(x * S, y * S, r * 4 * S, 0, Math.PI * 2); St.fill();
    St.fillStyle = `rgba(255,252,244,${Math.min(1, a * 1.2)})`; St.beginPath(); St.arc(x * S, y * S, r * S, 0, Math.PI * 2); St.fill();
    if (ringed) { St.strokeStyle = `rgba(232,240,248,${a * 0.5})`; St.lineWidth = 0.9 * S; St.beginPath(); St.arc(x * S, y * S, r * 4.2 * S, 0, Math.PI * 2); St.stroke(); }
  };
  // timeline: progress 0–1 spans DURATION seconds; each layer has its own window and eases in and out
  const T = progress * DURATION;
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
  const win = (start, dur) => ease((T - start) / dur);

  // field stars: always present, fewer near the middle where the headline sits
  for (let i = 0; i < 260; i++) {
    const x = R() * 1500, y = Math.pow(R(), 1.3) * 600;
    const mid = Math.exp(-Math.pow((x - 750) / 300, 2) - Math.pow((y - 330) / 160, 2));
    const a = (0.18 + R() * 0.55) * (1 - mid * 0.7) * Math.min(1, (600 - y) / 120 + 0.3);
    const appear = win(R() * 1.6, 2.2);   // the stars come out first, a few at a time
    star(x, y, 0.5 + R() * R() * 1.4, a * appear);
  }

  const showShapes = style === 'shapes' || style === 'blend';
  const showPlotted = style === 'plotted' || style === 'blend';
  const showChart = style === 'chart' || style === 'blend';

  // dashed guide lines: a plotting frame
  if (showPlotted) {
    const g = win(1.2, 3.5);
    line([150, 0], [150, 600], 0.22, g, [6, 6], 0.9);
    line([1350, 0], [1350, 600], 0.22, g, [6, 6], 0.9);
    line([0, 300], [1500, 300], 0.16, g, [6, 6], 0.9);
  }

  // Figma-style quiet rings
  if (showChart) {
    const rings = [[205, 175, 120], [205, 175, 168], [1300, 205, 112], [1300, 205, 158]];
    rings.forEach(([cx, cy, r], i) => ring(cx, cy, r, 0.13, win(1.6 + i * 0.4, 4), 0.9));
    const dots = [[205, 55, '01 / 24'], [85, 210, null], [1300, 93, null], [1405, 260, '05 / 92'], [1160, 240, '02 / 38']];
    for (const [x, y, t] of dots) { const a = win(2.5, 2); star(x, y, 1.1, 0.8 * a); if (t) label(t, x + 9, y + 3, win(3.5, 2)); }
  }

  // the plotted path: numbered points, joined, with circumcircles through some triplets
  if (showPlotted) {
    const P = plottedPath(rng(seed + 31), style === 'blend');   // in the blend, the path stays above the headline
    // a slow pen crossing the sky: one steady stroke from left to right
    const t = win(3.2, 9.5);
    const head = t * (P.length - 1);
    for (let i = 0; i < P.length - 1; i++) {
      const seg = Math.max(0, Math.min(1, t * (P.length - 1) - i));
      if (style === 'blend' && i % 3 === 2) continue;   // lighter in the blend
      line(P[i], P[i + 1], 0.32, seg, null, 0.9);
    }
    for (let i = 0; i + 2 < P.length; i += style === 'blend' ? 7 : 3) {
      const c = circumcircle(P[i], P[i + 1], P[i + 2]);
      // each circle sweeps round once the pen has passed its third point
      if (c && c[2] < 230) ring(c[0], c[1], c[2], 0.17, ease((head - (i + 2)) / 2.5), 0.9);
    }
    P.forEach(([x, y], i) => {
      const a = ease((head - i + 0.3) / 0.9);   // a point lights, then its label fades in, as the pen arrives
      star(x, y, 1.15, 0.85 * a, i % 4 === 0);
      if (style !== 'blend' || i % 2 === 0) label(`${i + 1} → ${Math.round(x * 2)} – ${Math.round(y * 2)}`, x + 8, y - 6, ease((head - i - 0.2) / 1.2), 8.5);
    });
    // the pen tip: a soft brighter point travelling along the path while it draws
    if (t > 0 && t < 1) {
      const i = Math.min(P.length - 2, Math.floor(head)), f = head - i;
      star(P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f, 1.4, 0.9 * Math.sin(Math.PI * t) + 0.1);
    }
  }

  // our constellations
  if (showShapes) {
    Object.entries(SHAPES).forEach(([key, sh], si) => {
      // one constellation after another, each traced edge by edge, overlapping a little
      const t = win(2.0 + si * 2.0, 4.2);
      for (const [cx, cy, r] of sh.rings || []) ring(cx, cy, r, 0.28, t, 1);
      sh.edges.forEach(([a, b], i) => line(sh.pts[a], sh.pts[b], 0.42, ease(t * sh.edges.length - i)));
      for (const [a, b, c] of sh.circles) { const cc = circumcircle(sh.pts[a], sh.pts[b], sh.pts[c]); if (cc) ring(cc[0], cc[1], cc[2], 0.14, t, 0.9); }
      sh.pts.forEach(([x, y], i) => {
        star(x, y, i === 0 ? 1.7 : 1.25, ease(t * 2.5 - i * 0.12), i === 0);
        if (i === 0 || (style !== 'blend' && i % 2 === 0)) label(`${i + 1} → ${Math.round(x * 2)} – ${Math.round(y * 2)}`, x + 9, y - 7, ease((t - 0.5) * 2), 8.5);
      });
      // the constellation's name, small and set apart, like a star chart
      const [nx, ny] = key === 'worlds' ? [712, 238] : key === 'bracket' ? [1086, 492] : [sh.pts[0][0] - 4, Math.max(...sh.pts.map((p) => p[1])) + 26];
      L.save(); L.font = `italic ${13 * S}px "Cormorant Garamond", Georgia, serif`; L.fillStyle = `rgba(242,180,90,${0.7 * ease((t - 0.6) * 2.5)})`; L.fillText(sh.name, nx * S, ny * S); L.restore();
    });
  }
  return { lines: lc, stars: sc };
}

/** Put the sky into a water scene: two far planes behind the fleet, reflected by the water. */
export function addSky(api, { style = 'blend', distance = 26, width = 30, lift = 0.0, instant = false, delay = 0, clear = null, drift = 1 / 300 } = {}) {
  // drift: how much of the sky passes per second (1/300 = one full turn every five minutes).
  // The sky moves on its own, entirely independent of the water, boats, figure and camera.
  // clear: { x, y, rx, ry } in screen fractions (y from the bottom). Lines fade inside it so a headline reads cleanly.
  const height = (width * H) / W;
  const lc = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const sc = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const lt = new THREE.CanvasTexture(lc), stx = new THREE.CanvasTexture(sc);
  for (const t of [lt, stx]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; }
  const offset = { value: 0 };
  const time = { value: 0 };
  const res = { value: new THREE.Vector2(1, 1) };
  const mk = (map, twinkle) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { map: { value: map }, uTime: time, uMirror: api.shared.uMirror, uTw: { value: twinkle ? 1 : 0 }, uFade: { value: 1 }, uOffset: offset,
      uRes: res, uClear: { value: new THREE.Vector4(clear ? clear.x : .5, clear ? clear.y : .5, clear ? clear.rx : 1, clear ? clear.ry : 1) }, uClearAmt: { value: clear ? (twinkle ? 0.55 : 0.92) : 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uTime, uMirror, uTw, uFade, uClearAmt, uOffset; uniform vec2 uRes; uniform vec4 uClear; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        // the sky turns slowly left to right, wrapping round seamlessly
        vec2 suv = vec2(vUv.x - uOffset, vUv.y);
        vec4 c = texture2D(map, suv);
        // stars twinkle independently: each small cell of sky gets its own slow pulse
        vec2 cell = floor(fract(suv) * vec2(${W / 6}., ${H / 6}.));
        float tw = mix(1., .55 + .45*sin(uTime*(.6 + 1.6*h(cell)) + 6.28*h(cell+3.1)), uTw);
        // the sky fades toward the horizon, like the haze over the water
        float haze = smoothstep(.0, .22, vUv.y) * smoothstep(0., .12, vUv.x) * smoothstep(1., .88, vUv.x);   // fade at the horizon and the sides
        float k = tw * haze * uFade * (uMirror > .5 ? .35 : 1.);
        // the clearing around the headline (only in the direct view, not the reflection)
        if (uMirror < .5 && uClearAmt > 0.) {
          vec2 q = (gl_FragCoord.xy / uRes - uClear.xy) / uClear.zw;
          k *= 1. - uClearAmt * (1. - smoothstep(.55, 1.05, length(q)));
        }
        gl_FragColor = vec4(c.rgb * c.a * k, 1.);
      }`,
  });
  const geo = new THREE.PlaneGeometry(width, height); geo.translate(0, height / 2, 0);
  const linesMesh = new THREE.Mesh(geo, mk(lt, false));
  const starsMesh = new THREE.Mesh(geo, mk(stx, true));
  const group = new THREE.Group(); group.add(starsMesh, linesMesh);
  group.position.set(0, lift, -distance);
  api.scene.add(group);

  let current = style, t0 = null, drawing = true, lastDraw = -1;
  const redraw = (p) => { drawSky(current, p, { linesCanvas: lc, starsCanvas: sc }); lt.needsUpdate = true; stx.needsUpdate = true; };
  const fontsReady = (document.fonts ? Promise.all([document.fonts.load('20px "DM Mono"'), document.fonts.load('italic 20px "Cormorant Garamond"')]) : Promise.resolve()).catch(() => {});
  // instant: draw the finished sky straight away (reduced motion); delay: wait before drawing on
  fontsReady.then(() => { t0 = null; drawing = true; if (instant) startAt = -1e9; });
  let startAt = null;

  api.tickers.push((t) => {
    time.value = t;
    api.renderer.getDrawingBufferSize(res.value);
    offset.value = (t * drift) % 1;
    if (drawing) {
      if (startAt === null) startAt = t + delay;
      if (t < startAt) return;
      if (t0 === null) { t0 = startAt; lastDraw = -1; }
      const p = Math.min(1, (t - t0) / DURATION);   // each layer eases itself; the clock runs straight
      if (t - lastDraw > 1 / 30 || p >= 1) { redraw(p); lastDraw = t; }
      if (p >= 1) drawing = false;
    }
  });
  return {
    group,
    setStyle(s) { current = s; t0 = null; startAt = null; drawing = true; },
    replay() { t0 = null; startAt = null; drawing = true; },
  };
}
