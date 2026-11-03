// The voyage after the boat leaves the horizon: the river's route, how scroll
// maps onto it, and the painted world it runs through. World units are CSS px.
import { DEPTH, EMBER, PAPER, RIPPLE, clamp, hash, hex, lerp, rng, smooth, vnoise } from './paint.js';

const TAU = Math.PI * 2;

/* ---------------- the route ---------------- */

// Waypoints as fractions of the screen (x of width, y of height).
const DESKTOP = [
  [0.5, 0], [0.52, 0.42], [0.82, 0.85], [1.3, 0.78], [1.72, 1.18],
  [2.12, 1.55], [2.55, 1.42], [2.66, 1.95],
];
const MOBILE = [
  [0.5, 0], [0.55, 0.5], [0.3, 1.25], [0.7, 2.05], [0.3, 2.85],
  [0.7, 3.65], [0.3, 4.45], [0.66, 5.25], [0.5, 6.3],
];

export function makeRoute({ W, H, mobile }) {
  const Ww = mobile ? W : Math.round(W * 3);
  const Wh = Math.round(H * (mobile ? 6.8 : 2.3));
  const pts = (mobile ? MOBILE : DESKTOP).map(([a, b]) => [a * W, b * H]);

  // Catmull-Rom through the waypoints, then resampled every STEP px of length.
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const raw = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < 80; k++) {
      const t = k / 80;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      raw.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  raw.push(pts[pts.length - 1]);

  const STEP = 4;
  const sx = [raw[0][0]];
  const sy = [raw[0][1]];
  let carry = 0;
  for (let i = 1; i < raw.length; i++) {
    const [ax, ay] = raw[i - 1];
    const [bx, by] = raw[i];
    const seg = Math.hypot(bx - ax, by - ay);
    let d = STEP - carry;
    while (d <= seg) {
      sx.push(lerp(ax, bx, d / seg));
      sy.push(lerp(ay, by, d / seg));
      d += STEP;
    }
    carry = seg - (d - STEP);
  }
  const n = sx.length;
  const L = (n - 1) * STEP;

  const at = (s) => {
    const f = clamp(s, 0, L) / STEP;
    const i = Math.min(Math.floor(f), n - 2);
    const t = f - i;
    const dx = sx[i + 1] - sx[i];
    const dy = sy[i + 1] - sy[i];
    const len = Math.hypot(dx, dy) || 1;
    return { x: lerp(sx[i], sx[i + 1], t), y: lerp(sy[i], sy[i + 1], t), tx: dx / len, ty: dy / len, nx: -dy / len, ny: dx / len };
  };

  // The river's half-width, flaring a little where it leaves the lake.
  const half = (s) => (mobile ? 64 + 10 * Math.sin(s / 170) : 120 + 30 * Math.sin(s / 260)) + 60 * Math.exp(-s / 300);
  // The lake under the mountains that the river drains out of.
  const lake = { x: W / 2, y: -H * 0.05, rx: W * (mobile ? 0.72 : 0.62), ry: H * (mobile ? 0.42 : 0.55) };

  return { W, H, mobile, Ww, Wh, L, at, half, lake };
}

// Three stops: a cove where every question waits, the sponsors' grove, and the dock.
export const STOPS = [
  { kind: 'faq', at: 0.3, dwell: 1.5 },
  { kind: 'sponsor', at: 0.68, dwell: 1.1 },
  { kind: 'end', at: 1, dwell: 0.6 },
];

export function makeStops(route) {
  return STOPS.map((st) => {
    const s = route.L * st.at;
    const p = route.at(s);
    return { ...st, s, x: p.x, y: p.y, hw: route.half(s) };
  });
}

// The sponsors' lanterns line both banks around the grove stop, close enough
// to be seen together as the boat drifts through.
export function placeBeacons(route, list, sizeOf) {
  const { L, at, half, Ww } = route;
  const spread = route.mobile ? 0.16 : 0.2;
  return list.map((sponsor, j) => {
    const s = L * (0.68 - spread / 2 + (spread * j) / Math.max(1, list.length - 1));
    const p = at(s);
    const side = j % 2 ? 1 : -1;
    const nx = p.nx * side;
    const ny = p.ny * side;
    const size = sizeOf(sponsor.tier);
    const tall = size * 1.3 + 80;
    const hw = half(s);
    // on the near (lower) bank the post's foot drops by the beacon's height so it rises away from the water
    const x = clamp(p.x + nx * (hw + 80), size / 2 + 10, Ww - size / 2 - 10);
    const y = p.y + ny * (hw + 80) + (ny > 0.2 ? tall : 0);
    return { sponsor, s, x, y, size };
  });
}

// Scroll progress (0..1) to distance along the route. The boat eases into each
// stop and waits there for that stop's dwell (in the same units as travel).
export function makeSchedule(L, stops, { travel = 3 } = {}) {
  const segs = [];
  let p = 0;
  let prev = 0;
  for (const st of stops) {
    const len = ((st.s - prev) / L) * travel;
    segs.push({ p0: p, p1: p + len, s0: prev, s1: st.s, dwellEnd: p + len + st.dwell });
    p += len + st.dwell;
    prev = st.s;
  }
  const total = p;
  const pToS = (q) => {
    const x = clamp(q, 0, 1) * total;
    for (const g of segs) {
      if (x <= g.p1) return lerp(g.s0, g.s1, smooth(0, 1, (x - g.p0) / (g.p1 - g.p0 || 1)));
      if (x <= g.dwellEnd) return g.s1;
    }
    return L;
  };
  // the progress at the middle of a stop's wait
  const stopP = (i) => (segs[i].p1 + segs[i].dwellEnd) / 2 / total;
  return { pToS, stopP };
}

/* ---------------- scenery ---------------- */

const TREE = {
  base: hex('#21356A'), light: hex('#3C5C98'), light2: hex('#6888C2'), dark: hex('#152248'), ember: hex('#EE7D35'),
};
const MOUNTAIN = { fill: hex('#253D73'), lit: hex('#3F5F9A'), rim: hex('#5C7DB6') };
const GROUND = ['#0E1733', '#131F40', '#19284E', '#1F315C'].map(hex);
const GRASS = hex('#2A3F74');
const SHORE = ['#2B4378', '#3A5590'].map(hex);
const WOOD = ['#2A1E1A', '#3B2A22', '#4F3A30'].map(hex);

const S = 0.5; // the world is painted at half resolution and shown pixelated: 2px grain

function bandMask(route) {
  const cw = Math.ceil(route.Ww * S);
  const ch = Math.ceil(route.Wh * S);
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const m = c.getContext('2d');
  m.scale(S, S);
  // land 0, far bank 60, bank 120, shore 180, water 240
  const { lake } = route;
  for (const [extra, v] of [[90, 60], [40, 120], [12, 180], [0, 240]]) {
    m.fillStyle = `rgb(${v},0,0)`;
    m.beginPath();
    m.ellipse(lake.x, lake.y, lake.rx + extra, lake.ry + extra, 0, 0, TAU);
    m.fill();
    for (let s = 0; s <= route.L; s += 6) {
      const p = route.at(s);
      m.beginPath();
      m.arc(p.x, p.y, route.half(s) + extra, 0, TAU);
      m.fill();
    }
  }
  const data = m.getImageData(0, 0, cw, ch).data;
  return { cw, ch, at: (x, y) => data[(clamp(Math.floor(y * S), 0, ch - 1) * cw + clamp(Math.floor(x * S), 0, cw - 1)) * 4] };
}

export function buildScenery(route, stops) {
  const mask = bandMask(route);
  const r = rng(77);
  const { Ww, Wh, mobile } = route;

  const trees = [];
  const tries = Math.round((Ww * Wh) / (mobile ? 2600 : 6000));
  for (let i = 0; i < tries; i++) {
    const x = r() * Ww;
    const y = r() * Wh;
    const rad = mobile ? 26 + r() * 30 : 46 + r() * 70;
    if (y < 140) continue;
    if (mask.at(x, y) > 60 || mask.at(x, y + rad * 0.5) > 60) continue;
    trees.push({ x, y, r: rad });
  }
  trees.sort((a, b) => a.y - b.y);

  const mountains = [];
  if (!mobile) {
    for (let k = 0; k < 7; k++) {
      const s = route.L * (0.06 + k * 0.14);
      const p = route.at(s);
      const side = k % 2 ? 1 : -1;
      const off = route.half(s) + 330;
      const cx = p.x + p.nx * side * off;
      const by = p.y + p.ny * side * off + 140;
      if (mask.at(cx, by - 40) > 0 || cx < 200 || cx > Ww - 200) continue;
      mountains.push({ cx, by, w: 460 + r() * 220, h: 300 + r() * 160, seed: k * 13, lit: cx < p.x ? 1 : -1 });
    }
  }

  // a spatial grid so each pixel only checks the trees near it
  const CELL = 128;
  const gw = Math.ceil(Ww / CELL);
  const grid = new Map();
  trees.forEach((t, i) => {
    for (let gx = Math.floor((t.x - t.r) / CELL); gx <= Math.floor((t.x + t.r) / CELL); gx++)
      for (let gy = Math.floor((t.y - t.r) / CELL); gy <= Math.floor((t.y + t.r) / CELL); gy++) {
        const key = gy * gw + gx;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }
  });

  const end = stops[stops.length - 1];
  return { mask, trees, grid, gw, CELL, mountains, dock: { x: end.x, y: end.y } };
}

function shadeWorld(x, y, n, n2, route, sc) {
  const band = sc.mask.at(x, y);
  const { dock } = sc;

  // the dock the voyage ends at
  if (x > dock.x - 20 && x < dock.x + 300 && y > dock.y + 14 && y < dock.y + 44) {
    if ((x - dock.x) % 16 < 2) return WOOD[0];
    return WOOD[clamp(Math.round(1.4 + (n - 0.5) * 1.2 - (y < dock.y + 18 ? 0.8 : 0)), 0, 2)];
  }
  if (x > dock.x && x < dock.x + 300 && y >= dock.y + 44 && y < dock.y + 60 && (x - dock.x) % 70 < 10) return WOOD[0];

  if (band >= 240) {
    const g = clamp(y / 900, 0, 1) * 0.5 + 0.35;
    const row = Math.floor(y / 6);
    const len = 40 + hash(row, 7, 3) * 140;
    if (vnoise(x / len + row * 13.7, 5) > 0.9 && n2 < 0.35) return RIPPLE;
    return DEPTH[clamp(Math.round(g * (DEPTH.length - 1) + (n - 0.5) * 1.1), 0, DEPTH.length - 1)];
  }
  if (band >= 180) return n2 < 0.03 ? EMBER[0] : n < 0.3 ? SHORE[0] : GROUND[3];

  // trees in front of everything on land
  const cell = sc.grid.get(Math.floor(y / sc.CELL) * sc.gw + Math.floor(x / sc.CELL));
  if (cell) {
    for (let k = cell.length - 1; k >= 0; k--) {
      const t = sc.trees[cell[k]];
      const q = Math.hypot(x - t.x, y - t.y) / t.r;
      if (q > 1.05 || (q > 0.97 && n < 0.5)) continue;
      const lit = ((x - t.x) * -0.6 + (y - t.y) * -0.8) / t.r;
      if (q > 0.84 && lit > 0.35 && n2 < 0.08) return TREE.ember;
      if (n < 0.18 + 0.3 * lit) return lit > 0.5 && n2 < 0.3 ? TREE.light2 : TREE.light;
      if (n > 0.82 - 0.3 * lit) return TREE.dark;
      return TREE.base;
    }
  }

  for (const m of sc.mountains) {
    const dx = x - m.cx;
    const hw = m.w / 2;
    if (Math.abs(dx) >= hw || y > m.by) continue;
    const k = 1 - Math.abs(dx) / hw;
    const top = m.by - m.h * Math.pow(k, 1.15) * (0.88 + 0.12 * vnoise(x / 34, m.seed)) - (vnoise(x / 12, m.seed + 1) - 0.5) * 18 * k;
    if (y < top) continue;
    if (y > m.by - 50 && n < (y - (m.by - 50)) / 50) break;
    if (y - top < 6) return n < 0.6 ? MOUNTAIN.rim : MOUNTAIN.lit;
    const facing = dx * m.lit < 0;
    return facing && n < 0.55 ? MOUNTAIN.lit : MOUNTAIN.fill;
  }

  if (band >= 120) return n < 0.35 ? GROUND[3] : GROUND[2];
  const col = Math.floor(x / 10);
  const tuftY = Math.floor(y / 36);
  if (hash(col, tuftY, 12) < 0.05 && y % 36 < 8 && Math.abs((x % 10) - 5) < 3 - (y % 36) * 0.35) return GRASS;
  return GROUND[clamp(Math.round(1.2 + (n - 0.5) * 1.4 + (band ? 0.8 : 0)), 0, 3)];
}

// Paints the world a band of rows per frame. Returns a cancel function.
export function paintWorld(canvas, route, scenery) {
  const cw = Math.ceil(route.Ww * S);
  const ch = Math.ceil(route.Wh * S);
  canvas.width = cw;
  canvas.height = ch;
  canvas.classList.remove('is-painted');
  const ctx = canvas.getContext('2d');
  let row = 0;
  let raf = 0;
  const chunk = () => {
    const rows = Math.min(40, ch - row);
    const img = ctx.createImageData(cw, rows);
    const d = img.data;
    for (let py = 0; py < rows; py++) {
      const y = (row + py) / S;
      for (let px = 0; px < cw; px++) {
        const c = shadeWorld(px / S, y, hash(px, row + py, 1), hash(px, row + py, 2), route, scenery);
        const i = (py * cw + px) * 4;
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, row);
    if (row === 0) canvas.classList.add('is-painted');
    row += rows;
    if (row < ch) raf = requestAnimationFrame(chunk);
  };
  raf = requestAnimationFrame(chunk);
  return () => cancelAnimationFrame(raf);
}

/* ---------------- the wake ---------------- */

const WAKE = ['255,241,204', '255,221,122', '255,198,58', '243,138,49', '222,75,43'];

// The light the boat leaves on the water, drawn in screen space each frame.
export function drawWake(ctx, w, h, route, s, camX, camY, t) {
  ctx.clearRect(0, 0, w, h);
  const LEN = route.mobile ? 700 : 1100;
  const from = Math.max(0, s - LEN);
  for (let q = Math.floor(s / 3) * 3; q >= from; q -= 3) {
    const p = route.at(q);
    const sx = p.x - camX;
    const sy = p.y - camY;
    if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
    const age = (s - q) / LEN;
    const hw = 2 + age * (route.mobile ? 18 : 30);
    const alpha = Math.pow(1 - age, 1.6);
    const rnd = rng(Math.round(q) * 7 + 3);
    const dots = 3 + Math.round(hw * 0.45);
    for (let i = 0; i < dots; i++) {
      const g = (rnd() + rnd() + rnd() - 1.5) / 0.75;
      const off = g * hw + Math.sin(t * 1.6 + q * 0.05 + i) * 1.5;
      const tone = Math.min(4, Math.floor(Math.abs(g) * 2.2 + age * 2));
      ctx.fillStyle = `rgba(${WAKE[tone]},${(alpha * (0.6 + rnd() * 0.4)).toFixed(2)})`;
      ctx.fillRect(sx + p.nx * off, sy + p.ny * off, 1.7, 1.7);
    }
  }
}
