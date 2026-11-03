// Stipple painters for the night sky: the river of light and the forest.
// Everything is drawn with seeded randomness so tiles line up at their seams
// and the picture is the same on every visit.

const TAU = Math.PI * 2;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const expo = (r) => -Math.log(1 - r() * 0.999);
const gauss = (r) => (r() + r() + r() - 1.5) / 0.5;

/* ---------------- the river of light ---------------- */

// keys: [{ y, x }] points the light passes through, top to bottom.
// hwTop: half-width at the top (wide enough to hold the title).
// endY: where it narrows into the boat's lantern.
export function makeRibbon({ keys, hwTop, heroEnd, endY, mobile }) {
  const amp = mobile ? 0.45 : 1;
  const hwMid = hwTop * (mobile ? 0.42 : 0.34);

  const cx = (y) => {
    if (y <= keys[0].y) return keys[0].x;
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (y <= b.y) return lerp(a.x, b.x, smooth(0, 1, (y - a.y) / (b.y - a.y)));
    }
    return keys[keys.length - 1].x;
  };

  const half = (y) => {
    const k = smooth(heroEnd * 0.55, heroEnd * 1.4, y);
    const t = clamp((y - heroEnd * 0.9) / (endY - heroEnd * 0.9), 0, 1);
    const tail = hwMid * Math.pow(1 - t, 1.35) + 1.2;
    return hwTop * (1 - k) + tail * k;
  };

  // t is seconds. The waves travel upward slowly, like heat rising off a flame.
  const edges = (y, t = 0) => {
    if (y > endY) return null;
    const settle = clamp((endY - y) / 500, 0, 1);
    const flare = 1 - smooth(heroEnd * 0.6, heroEnd * 1.2, y);
    const c = cx(y) + amp * settle * (Math.sin(y / 190 + t * 0.09) * 26 + Math.sin(y / 67 + 2 + t * 0.3) * 8);
    const h = half(y);
    const m = (1 + flare * 0.15) * (0.35 + 0.65 * settle);
    const l = c - h * (1 + m * (0.14 * Math.sin(y / 83 + 1.3 + t * 0.26) + 0.07 * Math.sin(y / 29 + 0.4 + t * 0.55)));
    const r = c + h * (1 + m * (0.14 * Math.sin(y / 101 + 4.1 + t * 0.22) + 0.07 * Math.sin(y / 37 + 2.2 + t * 0.5)));
    return [l, r, h];
  };

  return { edges, endY };
}

function ribbonPath(ctx, edges, from, to, t) {
  const ys = [];
  for (let y = from; y < to; y += 3) ys.push(y);
  ys.push(to);
  ctx.beginPath();
  ys.forEach((y, i) => {
    const [l] = edges(y, t);
    if (i) ctx.lineTo(l, y);
    else ctx.moveTo(l, y);
  });
  for (let i = ys.length - 1; i >= 0; i--) ctx.lineTo(edges(ys[i], t)[1], ys[i]);
  ctx.closePath();
}

// Static bloom behind the live ribbon. Only the shadow is drawn: the shape itself
// is pushed off-canvas and its shadow offset back into place.
export function paintRibbonGlow(ctx, y0, h, dpr, { edges, endY }) {
  const pad = 200;
  const from = Math.max(-240, y0 - pad);
  const to = Math.min(endY, y0 + h + pad);
  if (to <= from) return;
  const off = 20000;
  ctx.save();
  ctx.translate(off, 0);
  ribbonPath(ctx, edges, from, to, 0);
  ctx.shadowColor = 'rgba(255, 150, 60, 0.55)';
  ctx.shadowBlur = 110 * dpr;
  ctx.shadowOffsetX = -off * dpr;
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
}

// The ribbon itself, redrawn every frame for the rows in [y0, y0 + h).
export function drawRibbon(ctx, y0, h, { edges, endY }, t) {
  const from = Math.max(-240, Math.floor(y0));
  const to = Math.min(endY, y0 + h);
  if (to <= from) return;

  ribbonPath(ctx, edges, from, to, t);
  ctx.fillStyle = '#FFC63A';
  ctx.fill();

  for (let y = from; y < to; y++) {
    const e = edges(y, t);
    if (!e) break;
    const [l, r, hw] = e;
    const rnd = rng(y * 9301 + 49297);
    const s = 0.55 + Math.min(hw, 320) / 110;

    for (let side = 0; side < 2; side++) {
      const ex = side ? r : l;
      const dir = side ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        const d = expo(rnd) * 8 * s;
        const c = rnd();
        ctx.fillStyle = c < 0.6 ? '#F38A31' : c < 0.86 ? '#DE4B2B' : '#FFD45A';
        const z = rnd() < 0.18 ? 2.2 : 1.3;
        ctx.fillRect(ex + dir * d - z / 2, y + rnd() - 0.5, z, z);
      }
      for (let k = 0; k < 2; k++) {
        const d = expo(rnd) * 6 * s;
        ctx.fillStyle = rnd() < 0.8 ? '#F6A03C' : '#EE7A2F';
        ctx.fillRect(ex - dir * d, y, 1.4, 1.4);
      }
      if (rnd() < 0.85) {
        const d = 8 + expo(rnd) * 42 * s;
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(126,156,212,.55)' : 'rgba(92,122,182,.65)';
        ctx.fillRect(ex + dir * d, y, 1.6, 1.6);
      }
    }

    const n = Math.round(hw * 0.04);
    const mid = (l + r) / 2;
    ctx.fillStyle = '#FFE7A6';
    for (let k = 0; k < n; k++) ctx.fillRect(mid + gauss(rnd) * hw * 0.3, y + rnd(), 1.6, 1.6);
  }
}

/* ---------------- dithering helpers ---------------- */

// Cheap per-cell white noise in [0, 1).
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

// Runs `shade(x, y, n1, n2)` for every grain cell of a canvas and writes the
// returned [r, g, b, a] (or null for transparent). x and y are in the caller's units.
function dither(canvas, { cell, toX, toY }, shade) {
  const ctx = canvas.getContext('2d');
  const { width: PW, height: PH } = canvas;
  const img = ctx.createImageData(PW, PH);
  const d = img.data;
  for (let cy = 0; cy < PH; cy += cell) {
    const gy = (cy / cell) | 0;
    const y = toY(cy + cell / 2);
    for (let cx = 0; cx < PW; cx += cell) {
      const gx = (cx / cell) | 0;
      const col = shade(toX(cx + cell / 2), y, hash(gx, gy, 1), hash(gx, gy, 2));
      if (!col) continue;
      for (let yy = cy; yy < Math.min(cy + cell, PH); yy++) {
        let i = (yy * PW + cx) * 4;
        for (let xx = cx; xx < Math.min(cx + cell, PW); xx++, i += 4) {
          d[i] = col[0];
          d[i + 1] = col[1];
          d[i + 2] = col[2];
          d[i + 3] = col[3] ?? 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------------- paper sky lantern ---------------- */

// Units: the lantern body spans x 60..340, y 26..474 in a 400-wide box.
// The canvas covers x -60..460, y -40..580 so the glow has room.
export const LANTERN_BOX = { x: -60, y: -40, w: 520, h: 620 };

const PAPER = ['#C4452A', '#E8692C', '#F59A3A', '#FFC63A', '#FFDD7A', '#FFF1CC'].map(hex);
const EMBER = ['#F38A31', '#DE4B2B', '#FFD45A'].map(hex);
const RIM = hex('#2B170C');
const HAZE = [...hex('#FFE7A6'), 150];

function lanternHalf(y) {
  if (y < 26 || y > 474) return -1;
  let w;
  if (y < 92) {
    const q = (92 - y) / 66;
    w = 142 * Math.pow(Math.max(0, 1 - Math.pow(q, 2.4)), 1 / 2.4);
  } else {
    const t = (y - 92) / 382;
    w = 142 - 52 * Math.pow(t, 1.5) + 8 * Math.sin(Math.PI * t);
  }
  return w * (1 + 0.012 * Math.sin(y * 0.11) + 0.008 * Math.sin(y * 0.31 + 1));
}

export function paintLantern(canvas, cssWidth, dpr, grain = 1.4) {
  const k = (cssWidth * dpr) / 400;
  canvas.width = Math.round(LANTERN_BOX.w * k);
  canvas.height = Math.round(LANTERN_BOX.h * k);
  const cell = Math.max(1, Math.round(grain * dpr));
  dither(
    canvas,
    { cell, toX: (px) => px / k + LANTERN_BOX.x, toY: (py) => py / k + LANTERN_BOX.y },
    (x, y, n, n2) => {
      const ax = Math.abs(x - 200);
      const hw = lanternHalf(y);

      // paper
      if (hw > 0 && ax < hw) {
        const e = ax / hw;
        const dist = Math.hypot((x - 200) * 1.25, y - 505);
        let v = 1.16 - dist / 720 + 0.22 * Math.exp(-((dist / 150) ** 2));
        v -= 0.42 * Math.pow(e, 5);
        if (y < 110) v -= ((110 - y) / 84) * 0.22;
        const u = (x - 200) / hw;
        for (const rib of [-0.68, -0.34, 0, 0.34, 0.68]) if (Math.abs(u - rib) * hw < 1.3) v -= 0.17;
        if (Math.abs(y - 160) < 1.1 || Math.abs(y - 330) < 1.1) v -= 0.13;
        const vv = v + (n - 0.5) * 0.26;
        const idx = vv > 0.9 ? 5 : vv > 0.74 ? 4 : vv > 0.56 ? 3 : vv > 0.38 ? 2 : vv > 0.22 ? 1 : 0;
        return PAPER[idx];
      }

      // rim and wires
      if (y >= 474 && y <= 490 && ax < 92 - (y - 474) * 0.25) {
        return y < 478 && n < 0.35 ? EMBER[0] : RIM;
      }
      if (ax < 88 && y > 486 && Math.abs(y - (515 - (ax / 88) * 27)) < 1.1) return RIM;

      // flame
      const fx = (x - 200) / 8;
      const fy = (y - 507) / 13;
      if (fx * fx + fy * fy < 1) return n < 0.85 ? PAPER[5] : PAPER[4];
      const gx = (x - 200) / 18;
      const gy = (y - 505) / 24;
      const g = gx * gx + gy * gy;
      if (g < 1 && n < 0.7 - g * 0.6) return PAPER[3 + (n2 < 0.4 ? 1 : 0)];

      // glow spray
      const hwc = lanternHalf(clamp(y, 30, 474));
      const dEdge = Math.max(ax - hwc, 26 - y, y - 492, 0);
      if (n < 0.55 * Math.exp(-dEdge / 8)) return EMBER[n2 < 0.6 ? 0 : n2 < 0.86 ? 1 : 2];
      if (n2 < 0.08 * Math.exp(-dEdge / 40) && n > 0.5) return HAZE;
      return null;
    },
  );
}

/* ---------------- water ---------------- */

const DEPTH = ['#3A5B95', '#2F4F8A', '#27447D', '#203A70', '#1A3163', '#162956', '#13234B', '#11214A'].map(hex);
const RIPPLE = hex('#4F72AE');
const SHADOW = hex('#15224A');

function vnoise(x, seed) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i, 0, seed);
  const b = hash(i + 1, 0, seed);
  return a + (b - a) * f * f * (3 - 2 * f);
}

// Dithered depth bands, light shafts from the surface, ripples and the forest's
// dark reflection near the edges. Painted once; the bottom matches #11214A.
export function makeWaterPainter({ W, depth, mobile }) {
  const rays = mobile
    ? [{ x: 0.22, a: -0.18, w: 30 }, { x: 0.7, a: 0.12, w: 40 }]
    : [{ x: 0.16, a: -0.22, w: 40 }, { x: 0.36, a: -0.08, w: 60 }, { x: 0.62, a: 0.06, w: 50 }, { x: 0.82, a: 0.2, w: 44 }];
  const edgeW = mobile ? W * 0.04 : W * 0.11;
  return (canvas, y0, dpr) => {
    const cell = Math.max(1, Math.round(1.6 * dpr));
    dither(canvas, { cell, toX: (px) => px / dpr, toY: (py) => y0 + py / dpr }, (x, y, n, n2) => {
      if (y > depth) return DEPTH[DEPTH.length - 1];
      const g = y / depth;
      let ray = 0;
      for (const r of rays) {
        const cx = r.x * W + y * Math.tan(r.a);
        const half = r.w + y * 0.1;
        ray = Math.max(ray, Math.max(0, 1 - Math.abs(x - cx) / half));
      }
      ray *= Math.pow(1 - g, 1.6);
      let idx = g * (DEPTH.length - 1) - ray * 2.4 + (n - 0.5) * 1.1;
      idx = clamp(Math.round(idx), 0, DEPTH.length - 1);

      // ripples near the surface: short horizontal dashes
      if (y < 420) {
        const row = Math.floor(y / 6);
        const len = 40 + hash(row, 7, 3) * 140;
        const on = vnoise(x / len + row * 13.7, 5);
        const fade = 1 - y / 420;
        // reflected treeline at the banks, broken up by the ripples
        const bank = edgeW * (0.55 + 0.45 * vnoise(y / 46, 4)) * (1 - y / 560);
        const broken = on > 0.78;
        if ((x < bank || x > W - bank) && !broken && n2 < 0.85 - y / 700) return SHADOW;
        if (on > 0.9 - fade * 0.06 && n2 < 0.4 * fade) return RIPPLE;
      }
      return DEPTH[idx];
    });
  };
}

// The lantern's light broken up on the water. Drawn every frame around x = 0.
export function drawReflection(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h);
  const mid = w / 2;
  for (let row = 0; row * 5 < h; row++) {
    const y = row * 5 + 3;
    const q = y / h;
    const rnd = rng(row * 7919 + 13);
    const base = (1 - q) ** 0.9 * (24 + rnd() * 90);
    const len = base * (0.65 + 0.35 * Math.sin(t * 0.8 + row * 1.7));
    const cx = mid + Math.sin(t * 0.6 + row * 0.45) * (4 + q * 34) + (rnd() - 0.5) * q * 70;
    const alpha = (1 - q) ** 1.3;
    if (alpha < 0.03) continue;
    const dots = Math.round(len * 1.1);
    for (let i = 0; i < dots; i++) {
      const f = rnd() * 2 - 1;
      if (Math.abs(f) > 0.55 && rnd() < 0.5) continue;
      const af = Math.abs(f);
      const c = af < 0.35 - q * 0.3 ? '255,231,166' : af < 0.7 ? '255,198,58' : rnd() < 0.6 ? '243,138,49' : '222,75,43';
      ctx.fillStyle = `rgba(${c},${alpha.toFixed(2)})`;
      ctx.fillRect(cx + f * len, y + (rnd() - 0.5) * 2.4, 1.6, 1.6);
    }
  }
  // the hull's dark reflection right under the boat
  ctx.fillStyle = 'rgba(14,21,48,.85)';
  for (let row = 0; row < 7; row++) {
    const wv = 110 - row * 13 + Math.sin(t + row) * 6;
    ctx.fillRect(mid - wv / 2 - 40 + Math.sin(t * 0.7 + row) * 4, row * 5, wv, 2.4);
  }
}

/* ---------------- the forest ---------------- */

const FOREST = {
  far: {
    base: '#33508C', light: '#5574AE', light2: '#89A5D4', dark: '#28427A', ember: '#F29A4A',
    x: [0.05, 0.17], r: [0.05, 0.085], rClamp: [52, 140], step: [0.6, 0.95],
    trunk: '#2A447C', trunkW: [10, 18],
  },
  near: {
    base: '#21356A', light: '#3C5C98', light2: '#6888C2', dark: '#152248', ember: '#EE7D35',
    x: [-0.07, 0.05], r: [0.08, 0.13], rClamp: [80, 200], step: [0.5, 0.85],
    trunk: '#17244B', trunkW: [18, 32],
  },
};

export function makeForest({ W, top, bottom, ground, kind, seed, mobile }) {
  const cfg = { ...FOREST[kind] };
  if (mobile) {
    cfg.x = kind === 'far' ? [-0.1, 0.02] : [-0.24, -0.1];
    cfg.rClamp = kind === 'far' ? [40, 80] : [60, 100];
  }
  const rnd = rng(seed);
  const circles = [];
  const trunks = [];
  for (const side of [-1, 1]) {
    let y = top;
    while (y < bottom) {
      const r = clamp(W * lerp(cfg.r[0], cfg.r[1], rnd()), cfg.rClamp[0], cfg.rClamp[1]);
      const xi = W * lerp(cfg.x[0], cfg.x[1], rnd());
      circles.push({ x: side < 0 ? xi : W - xi, y, r, side, seed: (rnd() * 1e9) | 0 });
      y += r * lerp(cfg.step[0], cfg.step[1], rnd());
    }
    // trunks reach from the lowest canopies down to the bank
    const count = mobile ? 1 : 3;
    for (let i = 0; i < count; i++) {
      const xi = W * lerp(cfg.x[0] + 0.02, cfg.x[1] + 0.02, (i + rnd()) / count);
      trunks.push({
        x: side < 0 ? xi : W - xi,
        y: bottom - lerp(260, 520, rnd()),
        w: lerp(cfg.trunkW[0], cfg.trunkW[1], rnd()),
        side,
        seed: (rnd() * 1e9) | 0,
      });
    }
  }
  circles.sort((a, b) => a.y - b.y);
  return { circles, trunks, cfg, ground };
}

export function paintForest(ctx, y0, h, dpr, { circles, trunks, cfg, ground }) {
  const y1 = y0 + h;

  for (const t of trunks) {
    if (ground < y0 || t.y > y1) continue;
    ctx.fillStyle = cfg.trunk;
    ctx.fillRect(t.x - t.w / 2, t.y, t.w, ground - t.y);
    // the edge facing the light picks up embers
    const rnd = rng(t.seed);
    const edge = t.side < 0 ? t.x + t.w / 2 : t.x - t.w / 2;
    for (let y = Math.max(t.y, y0); y < Math.min(ground, y1); y += 1) {
      const glow = smooth(t.y, ground, y);
      if (rnd() > 0.25 + glow * 0.6) continue;
      ctx.fillStyle = rnd() < 0.7 ? '#EE7D35' : '#FFC447';
      ctx.fillRect(edge + t.side * expo(rnd) * 2.4 - 1, y, 1.5, 1.5);
    }
  }

  const lx0 = 0.8;
  const ly = -0.6;
  for (const c of circles) {
    if (c.y + c.r * 1.1 < y0 || c.y - c.r * 1.1 > y1) continue;
    ctx.fillStyle = cfg.base;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, TAU);
    ctx.fill();

    const rnd = rng(c.seed);
    const lx = -c.side * lx0;
    const N = Math.min(9000, c.r * c.r * 0.24);
    for (let i = 0; i < N; i++) {
      const a = rnd() * TAU;
      const q = Math.sqrt(rnd()) * 1.07;
      const nx = Math.cos(a) * q;
      const ny = Math.sin(a) * q;
      const lit = nx * lx + ny * ly;
      const u = rnd();
      let col;
      if (q > 1) col = cfg.base;
      else if (q > 0.84 && lit > 0.35 && u < 0.2) col = cfg.ember;
      else if (u < 0.28 + 0.36 * lit) col = lit > 0.35 && rnd() < 0.45 ? cfg.light2 : cfg.light;
      else if (u > 0.82 - 0.3 * lit) col = cfg.dark;
      else continue;
      ctx.fillStyle = col;
      ctx.fillRect(c.x + nx * c.r, c.y + ny * c.r, 1.6, 1.6);
    }
  }
}
