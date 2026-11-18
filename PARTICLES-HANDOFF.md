# Handoff: flowing particle effects (playground)

Read this before reusing the particle effects in another chat. The working source is the source of truth; this doc explains how it works and what the user liked or rejected.

## Where the code lives

- Playground pages (one self-contained HTML file each, no build step):
  - `.claude/worktrees/particles/public/playground/hacksy-h-particles.html`: particles spell **"Hacklahoma"**
  - `.claude/worktrees/particles/public/playground/lantern-particles.html`: particles form the **landing-page sky lantern**
  - A button at the bottom of each page switches between them.
- These files live on the branch `Draft3-particles` (worktree `.claude/worktrees/particles`), **uncommitted**. Otherwise that branch is identical to Draft3.
- To view them: start the `particles` dev server in `.claude/launch.json` (port 5178), then open `http://localhost:5178/playground/hacksy-h-particles.html`.
- Opening the files directly as `file://` in the Claude browser pane only shows a static snapshot. Serve them through Vite.

## What the user liked / rejected

- ✅ Liked: the playground shape effect. Particles sweep in **from the left and right edges** (not from the click point), the outer letters form first and both sides meet in the middle, the shape holds and shimmers, then the particles dissolve into a slow swirling current.
- ❌ Rejected v1: particles clustered and snapped into place. Cause: each particle picked a random target point (duplicates and gaps) and the spring was stiff. Fixed by giving every particle its own point on a staggered grid and using eased curved paths.
- ❌ Rejected: replacing the site's page-wide `Motes.jsx` particles with flowing glows. Reverted.
- ❌ Rejected: replacing the light ribbon's grainy edge specks (`drawRibbon` in `src/lib/paint.js`, `LiveRibbon.jsx`) with drifting glow embers. Reverted. The grainy, poster-print look of the ribbon stays.
- The playground is the user's **design playground**. Iterate there before touching the real site. Per memory, do one asset study at a time and don't one-shot pages.

## How the effect works (key techniques)

1. **Turn a shape into target points**
   - **Text:** draw it with `fillText` on an offscreen canvas, then `strokeText` with `lineWidth ≈ 7` on top. The stroke thickens thin serif strokes; without it the **H crossbar** in Gloock disappears. Then read `getImageData` and keep the pixels with alpha > 140.
   - **Lantern:** sample the same geometry the site paints with (`lanternHalf(y)` from `src/lib/paint.js`: body spans x 60–340, y 26–474 in a 400-wide box). Trace the ribs, seams, rim, wires and flame densely so the frame reads clearly, and give each point its own color from the `PAPER` palette using the same shading formula as `paintLantern`.
   - Sample on a **staggered (hex-like) grid** so coverage is even, then shuffle the points. Each particle gets exactly one point, so nothing clusters.
   - Normalize points to roughly −0.5..0.5 and scale them to the viewport at spawn time. The shape always forms at screen center.
2. **Three phases per particle** (`class Spark`)
   - **Fly:** a quadratic Bézier from the start point to the target, with a sideways control point (`bow`) so paths curve in instead of shooting straight. The timing is eased with `easeInOutCubic`.
   - **Hold:** a tiny ±1.2px wobble plus an alpha pulse, so the shape looks alive.
   - **Release:** the particle rides the flow field with damped velocity and fades out.
   - A per-particle `delay` comes from `order` (here, distance from the outer edge). This ripple fill is a big part of why it feels fluid.
3. **Flow field:** layered sines, a cheap stand-in for curl noise. Ambient particles and released particles share it, so everything moves together:
   ```js
   flow = (x,y) => (sin(x*s+t) + cos(y*s*1.3 - t*1.2) + sin((x+y)*s*0.7 + t*0.8)*0.8) * PI
   ```
4. **Glow rendering**
   - Pre-render one radial-gradient sprite per color (64×64: white core → color → transparent) and `drawImage` it. This is much smoother and faster than `shadowBlur`.
   - Set `globalCompositeOperation = 'lighter'` so overlapping glows add up.
   - For trails, fill the canvas with a translucent background each frame (`rgba(7,12,34,0.18)`). On a transparent overlay, use `destination-out` instead.
5. **Ambient layer:** about 140 small dots drifting up through the flow field, each fading in and out on its own staggered lifespan.

## Palettes

- Blue (Hacklahoma page): `#3b82f6 #93c5fd #bfdbfe #60a5fa #2563eb #1d4ed8`
- Lantern paper (from `paint.js`): `#C4452A #E8692C #F59A3A #FFC63A #FFDD7A #FFF1CC`, embers `#F38A31 #DE4B2B #FFD45A`
- Background: `#070c22` (the site's night colors are in `src/index.css` `:root`)
- Font: **Gloock** (the site's `--display` font). Wait for `document.fonts.load()` before sampling text.

## Things to watch

- Density: the word uses a few thousand particles. If it lags, raise the grid `step`.
- Additive glow washes out to white over bright areas such as the yellow ribbon. Lower the alpha or use `source-over` there.
- Respect `prefers-reduced-motion` if any of this goes on the real site (the site's components already do).
