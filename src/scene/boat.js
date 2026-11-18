// ─────────────────────────────────────────────────────────────
// Paper boat — single source of truth.
// One 3D model (classic folded paper boat, from a 2:1 sheet).
// Every 2D variation, angle study, pin and the WebGL lab is
// rendered from these same vertices, so they always agree.
//
// Units: overall length = 2 (x ∈ [-1, 1]). y up. z across the beam.
// ─────────────────────────────────────────────────────────────

export const V = {
  // keel (flat strip along the bottom)
  KbL: [-0.5, 0, 0.06], KfL: [0.5, 0, 0.06],
  KbR: [-0.5, 0, -0.06], KfR: [0.5, 0, -0.06],
  // bow / stern tips — where the two hull walls meet, on centreline
  Tb: [-1, 0.62, 0], Tf: [1, 0.62, 0],
  // gunwale "dips" — the low shoulders either side of the sail, widest beam
  DbL: [-0.42, 0.34, 0.3], DfL: [0.42, 0.34, 0.3],
  DbR: [-0.42, 0.34, -0.3], DfR: [0.42, 0.34, -0.3],
  // centre sail — a doubled triangle standing up out of the hull
  SbL: [-0.38, 0.05, 0.018], SfL: [0.38, 0.05, 0.018], AL: [0, 0.74, 0.018],
  SbR: [-0.38, 0.05, -0.018], SfR: [0.38, 0.05, -0.018], AR: [0, 0.74, -0.018],
};

// Human-readable landmark names for pins
export const PIN_NAMES = {
  Tb: 'stern tip', Tf: 'bow tip', AL: 'sail apex',
  DbL: 'shoulder', DfL: 'shoulder', DbR: 'shoulder', DfR: 'shoulder',
  KbL: 'keel', KfL: 'keel', KbR: 'keel', KfR: 'keel',
  SbL: 'sail root', SfL: 'sail root',
};

// The internal light (candle / ember) sits low in the hull
export const LIGHT = [0, 0.16, 0];
const INTERIOR = [0, 0.3, 0];

// kind: wall | bottom | end | sail
const RAW_FACES = [
  // left wall (z+), split into a fan so the shoulder line reads
  { kind: 'wall', v: ['KbL', 'KfL', 'DfL'] },
  { kind: 'wall', v: ['KbL', 'DfL', 'DbL'] },
  { kind: 'wall', v: ['KfL', 'Tf', 'DfL'] },
  { kind: 'wall', v: ['KbL', 'DbL', 'Tb'] },
  // right wall (z-)
  { kind: 'wall', v: ['KbR', 'KfR', 'DfR'] },
  { kind: 'wall', v: ['KbR', 'DfR', 'DbR'] },
  { kind: 'wall', v: ['KfR', 'Tf', 'DfR'] },
  { kind: 'wall', v: ['KbR', 'DbR', 'Tb'] },
  // bottom + the two narrow end stems
  { kind: 'bottom', v: ['KbL', 'KfL', 'KfR', 'KbR'] },
  { kind: 'end', v: ['KfL', 'KfR', 'Tf'] },
  { kind: 'end', v: ['KbL', 'KbR', 'Tb'] },
  // sail, both skins
  { kind: 'sail', v: ['SbL', 'SfL', 'AL'] },
  { kind: 'sail', v: ['SbR', 'SfR', 'AR'] },
];

// ── tiny vector helpers ──
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return mul(a, 1 / l); };
const centroid = (pts) => mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
export const vec = { sub, add, mul, dot, cross, norm, centroid };

// Orient every face so its normal points OUT of the boat.
export const FACES = RAW_FACES.map((f) => {
  let names = [...f.v];
  let pts = names.map((n) => V[n]);
  let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
  const c = centroid(pts);
  if (f.kind !== 'sail' && dot(n, sub(c, INTERIOR)) < 0) {
    names.reverse(); pts = names.map((k) => V[k]); n = mul(n, -1);
  }
  if (f.kind === 'sail' && dot(n, [0, 0, Math.sign(c[2])]) < 0) {
    names.reverse(); pts = names.map((k) => V[k]); n = mul(n, -1);
  }
  return { ...f, v: names, normal: n, c };
});

// ── transforms ──
export function makeTransform({ yaw = 0, pitch = 0, roll = 0, tilt = 0 }) {
  const r = (d) => (d * Math.PI) / 180;
  const [cy, sy] = [Math.cos(r(yaw)), Math.sin(r(yaw))];
  const [cp, sp] = [Math.cos(r(pitch)), Math.sin(r(pitch))];
  const [cr, sr] = [Math.cos(r(roll)), Math.sin(r(roll))];
  const [ct, st] = [Math.cos(r(tilt)), Math.sin(r(tilt))];
  return (p) => {
    let [x, y, z] = p;
    // boat motion: roll about length axis (x), tilt (bow up/down) about z
    [y, z] = [y * cr - z * sr, y * sr + z * cr];
    [x, y] = [x * ct - y * st, x * st + y * ct];
    // camera: yaw about y, then pitch (look down) about x
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    return [x, y, z];
  };
}

// ── colour helpers ──
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// ── palettes / styles ──
// Sampled from the reference: interior #e48821 / #de7b1b, hull-lit #b86325,
// hull-shadow #443732, reflection #b76e35, water #033a56 → #021523.
export const STYLES = {
  lantern: {
    label: 'Lantern', inner: ['#7a2d08', '#ffcf78'], hull: ['#a85a22', '#4e3427', '#241b19'],
    glow: '#ffb547', glowAmt: 1, crease: 'rgba(255,214,150,.35)', creaseW: 0.6, reflect: true,
  },
  folded: {
    label: 'Folded', flat: true, inner: ['#9c4512', '#ffc46b'], hull: ['#7a4e32', '#3a2a22'],
    glow: '#ffb547', glowAmt: 0.45, crease: 'rgba(255,226,176,.7)', creaseW: 0.9, reflect: true,
  },
  ember: {
    label: 'Ember line', line: true, stroke: '#ffbf5e', glow: '#ffb547', glowAmt: 0.6, reflect: true,
  },
  moonlit: {
    label: 'Unlit / moonlit', inner: ['#3e5367', '#dbe5ec'], hull: ['#b9c8d3', '#6f8496', '#34475a'],
    glow: '#cfe0ff', glowAmt: 0, crease: 'rgba(230,240,255,.35)', creaseW: 0.6, reflect: true, moon: true,
  },
  underwater: {
    label: 'Underwater', inner: ['#0f4f58', '#ffd98c'], hull: ['#4a9a93', '#1f5a62', '#0d3340'],
    glow: '#ffcf70', glowAmt: 0.7, crease: 'rgba(170,240,230,.35)', creaseW: 0.6, reflect: false,
  },
  dawn: {
    label: 'Dawn', inner: ['#a8513b', '#ffe0b8'], hull: ['#eab08f', '#9c6b6c', '#4e3a4c'],
    glow: '#ffb39a', glowAmt: 0.45, crease: 'rgba(255,230,210,.4)', creaseW: 0.6, reflect: true, moon: true,
  },
  glyph: { label: 'Glyph', glyph: true, fill: '#f2b45a', glowAmt: 0, reflect: false },
  blueprint: { label: 'Blueprint', blueprint: true, glowAmt: 0, reflect: false },
};

let uid = 0;

/**
 * Render the boat to an SVG string.
 * opts: { w, h, yaw, pitch, roll, tilt, scale, style, pins, ortho, flicker, cx, cy, labels }
 */
export function renderBoat(opts = {}) {
  const o = { w: 400, h: 300, yaw: -28, pitch: 16, roll: 0, tilt: 0, scale: 0.36, style: 'lantern', pins: false, ortho: false, flicker: 1, labels: true, bg: null, ...opts };
  const S = STYLES[o.style];
  const id = 'b' + (uid++);
  const T = makeTransform(o);
  const s = Math.min(o.w, o.h) * o.scale;
  const cx = o.cx ?? o.w / 2, cy = o.cy ?? o.h * 0.6;
  const proj = (p) => {
    const q = T(p);
    const f = o.ortho ? 1 : 1 / (1 - q[2] * 0.12);
    return [cx + q[0] * s * f, cy - (q[1] - 0.3) * s * f, q[2]];
  };
  const P = Object.fromEntries(Object.entries(V).map(([k, p]) => [k, proj(p)]));
  const Lp = proj(LIGHT);
  const camDir = [0, 0, 1];

  // view-space normals → are we looking at the outside or the inside of a face?
  const faces = FACES.map((f) => {
    const nV = T(f.normal);
    const depth = f.v.reduce((a, k) => a + P[k][2], 0) / f.v.length;
    const facing = dot(nV, camDir) > 0; // seeing the outer skin
    const inside = f.kind === 'sail' ? true : !facing;
    // light on inner surfaces: distance falloff × angle
    const toL = norm(sub(LIGHT, f.c));
    const nIn = f.kind === 'sail' ? f.normal : mul(f.normal, -1);
    const lam = f.kind === 'sail' ? Math.abs(dot(nIn, toL)) : clamp(dot(nIn, toL));
    const d = Math.hypot(...sub(LIGHT, f.c));
    const b = clamp((0.25 + 0.75 * lam) / (1 + 2.2 * d * d));
    // moonlight from upper-left-front for the unlit styles
    const moonDir = norm([-0.4, 1, 0.5]);
    const mb = clamp(0.25 + 0.75 * Math.abs(dot(f.normal, moonDir)));
    return { ...f, depth, inside, b, mb };
  }).sort((a, b) => a.depth - b.depth);

  const pts = (f) => f.v.map((k) => P[k][0].toFixed(2) + ',' + P[k][1].toFixed(2)).join(' ');
  const defs = [];
  let body = '';
  let glowLayer = '';

  // hull extents in screen space for gradients
  const ys = Object.values(P).map((p) => p[1]);
  const top = Math.min(...ys), bot = Math.max(...ys);

  if (S.blueprint) {
    for (const f of faces) {
      body += `<polygon points="${pts(f)}" fill="${f.inside ? 'rgba(140,180,220,.06)' : 'rgba(140,180,220,.12)'}" stroke="#8fb3d9" stroke-width=".8" stroke-linejoin="round"/>`;
    }
  } else if (S.glyph) {
    for (const f of faces) body += `<polygon points="${pts(f)}" fill="${S.fill}" stroke="${S.fill}" stroke-width="1.2" stroke-linejoin="round"/>`;
  } else if (S.line) {
    for (const f of faces) {
      body += `<polygon points="${pts(f)}" fill="${o.bg || '#0a1520'}" stroke="${S.stroke}" stroke-width="1.4" stroke-linejoin="round" stroke-opacity="${f.inside ? 1 : 0.75}"/>`;
    }
    glowLayer = body;
  } else {
    const hullId = id + 'h';
    const st = S.hull.map((c, i) => `<stop offset="${(i / (S.hull.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
    defs.push(`<linearGradient id="${hullId}" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bot}">${st}</linearGradient>`);
    const glowOn = S.glowAmt > 0;
    const rg = id + 'r', tr = id + 't';
    if (glowOn) {
      // light pool centred on the candle, painted onto each inner face as it is drawn,
      // so nearer outer walls correctly cover it (painter's order)
      defs.push(`<radialGradient id="${rg}" gradientUnits="userSpaceOnUse" cx="${Lp[0]}" cy="${Lp[1]}" r="${s * 0.62}"><stop offset="0" stop-color="#fff4d6" stop-opacity="${0.9 * S.glowAmt * o.flicker}"/><stop offset=".3" stop-color="${S.glow}" stop-opacity="${0.45 * S.glowAmt * o.flicker}"/><stop offset="1" stop-color="${S.glow}" stop-opacity="0"/></radialGradient>`);
      // translucency: light bleeding through the upper band of the outer hull
      defs.push(`<linearGradient id="${tr}" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bot}"><stop offset="0" stop-color="${S.glow}" stop-opacity="${0.5 * S.glowAmt * o.flicker}"/><stop offset=".45" stop-color="${S.glow}" stop-opacity="${0.12 * S.glowAmt * o.flicker}"/><stop offset=".7" stop-color="${S.glow}" stop-opacity="0"/></linearGradient>`);
    }
    for (const f of faces) {
      let fill;
      if (f.inside) {
        const t = S.moon ? f.mb * 0.9 : clamp(f.b * o.flicker);
        fill = S.flat ? mix(S.inner[0], S.inner[1], Math.round(t * 4) / 4) : mix(S.inner[0], S.inner[1], t);
      } else if (S.flat) {
        fill = mix(S.hull[1], S.hull[0], f.mb);
      } else {
        fill = `url(#${hullId})`;
      }
      const P2 = pts(f);
      body += `<polygon points="${P2}" fill="${fill}"/>`;
      if (glowOn) body += `<polygon points="${P2}" fill="url(#${f.inside ? rg : tr})" style="mix-blend-mode:screen"/>`;
      body += `<polygon points="${P2}" fill="none" stroke="${S.crease}" stroke-width="${S.creaseW}" stroke-linejoin="round"/>`;
      if (f.inside) glowLayer += `<polygon points="${P2}" fill="${fill}"/>`;
    }
  }

  // soft bloom around the lit interior
  let bloom = '';
  if (S.glowAmt > 0 && glowLayer) {
    const fb = id + 'f';
    defs.push(`<filter id="${fb}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(s * 0.09).toFixed(1)}"/></filter>`);
    bloom = `<g filter="url(#${fb})" opacity="${(0.9 * S.glowAmt * o.flicker).toFixed(2)}">${glowLayer}</g>`;
  }

  // reflection: mirror about the waterline, blurred and broken into streaks
  let reflection = '';
  if (S.reflect && o.reflect !== false) {   // reflect: false for a boat held above the water
    const wl = proj([0, 0.1, 0])[1];
    const fr = id + 'rf', mk = id + 'mk', mg = id + 'mg';
    defs.push(`<filter id="${fr}" x="-20%" y="-20%" width="140%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves="2" seed="${(o.seed ?? 3)}"/><feDisplacementMap in="SourceGraphic" scale="${(s * 0.12).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="1.6"/></filter>`);
    defs.push(`<linearGradient id="${mg}" gradientUnits="userSpaceOnUse" x1="0" y1="${wl}" x2="0" y2="${wl + s * 0.9}"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
    defs.push(`<mask id="${mk}"><rect x="0" y="${wl}" width="${o.w}" height="${o.h}" fill="url(#${mg})"/></mask>`);
    reflection = `<g mask="url(#${mk})"><g filter="url(#${fr})" transform="translate(0 ${wl.toFixed(1)}) scale(1 -0.85) translate(0 ${(-wl).toFixed(1)})">${body}${bloom}</g></g>`;
    // waterline: a thin dark band hides the hull bottom so it sits IN the water
    reflection += `<ellipse cx="${proj([0, 0.1, 0])[0]}" cy="${wl}" rx="${s * 0.9}" ry="${s * 0.05}" fill="${o.bg || '#06111b'}" opacity=".55" filter="url(#${id}wl)"/>`;
    defs.push(`<filter id="${id}wl"><feGaussianBlur stdDeviation="3"/></filter>`);
  }

  // pins
  let pins = '';
  if (o.pins) {
    const show = o.pinSet || ['Tb', 'Tf', 'AL', 'DbL', 'DfL', 'DbR', 'DfR', 'KbL', 'KfL', 'SbL', 'SfL'];
    for (const k of show) {
      const [x, y] = P[k];
      pins += `<g class="pin"><circle cx="${x}" cy="${y}" r="3.2" fill="#0a1520" stroke="#7fe0ff" stroke-width="1.3"/><circle cx="${x}" cy="${y}" r="1.1" fill="#7fe0ff"/>`;
      if (o.labels) pins += `<text x="${x + 6}" y="${y - 6}" fill="#9fdcf0" font-size="9" font-family="ui-monospace,Menlo,monospace">${k}</text>`;
      pins += `</g>`;
    }
    const L = Lp;
    pins += `<g><circle cx="${L[0]}" cy="${L[1]}" r="4" fill="none" stroke="#ffd27a" stroke-dasharray="2 2"/>${o.labels ? `<text x="${L[0] + 7}" y="${L[1] + 12}" fill="#ffd27a" font-size="9" font-family="ui-monospace,Menlo,monospace">light</text>` : ''}</g>`;
  }

  return `<svg viewBox="0 0 ${o.w} ${o.h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs>${defs.join('')}</defs>${reflection}${bloom}${body}${pins}</svg>`;
}

// smooth 1D value noise for flicker / drift
export function noise1(t) {
  const i = Math.floor(t), f = t - i;
  const h = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}
