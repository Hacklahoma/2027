# Hacklahoma 2027 landing page: handoff

Last updated 2026-11-18. Branch `pivot` (cut from `main`). Latest commit `bcb447f` "Build the Where Worlds Meet hero with a live night-water scene". Nothing pushed.

## The project

The landing page for **Hacklahoma 2027**, the University of Oklahoma's main hackathon, **February 6–7, 2027**. Theme: **"Where Worlds Meet"**.

Visual direction (agreed): one reference image of a figure sitting in dark blue night water surrounded by glowing amber paper boats. Calm, quiet, cinematic. Deep navy and teal, with one warm amber accent. Earlier drafts (Draft1–3) were abandoned because they tried to do everything at once; Draft3's uncommitted work is in `git stash` ("Draft3 WIP before pivot"). Don't revive it unless asked.

Layout blueprint: the Figma file (below). Content facts come from the 2026 site, not its design.

## How we work (important)

- **Build assets first, one at a time, then the layout.** Don't one-shot pages. Each asset got its own study, the user reviewed it, then we moved on.
- The user guides step by step. Recommend one option, mark it, and let them choose. Keep explanations plain.
- Every study is published as a shareable claude.ai artifact so the user and the **director** can review.
- Verify in the browser pane before saying something works. Screenshots help, but the pane is often hidden, which throttles animation to about 1 fps. Reload and wait, or check state with JS.

## What's built

### The site (React + Vite, `src/`)

- `src/App.jsx`: Nav, Hero, Spirit. A `ready` class on the wrapper starts the CSS load sequence.
- `src/components/Hero.jsx`: headline copy (from the Figma) plus a lazily imported 3D scene. It fires `onReady` when the scene is up, with a 900 ms fallback.
- `src/components/Nav.jsx`: wordmark, links, and Register. Becomes solid after scrolling past 60% of the hero.
- `src/components/Spirit.jsx`: "Small sparks. Extraordinary possibilities." A placeholder for the next section.
- `src/index.css`: all styles and tokens. Fonts are Cormorant Garamond (display), DM Sans (body) and DM Mono (labels), loaded in `index.html`.
- `src/scene/` (framework-free three.js 0.160.0, pinned):
  - `heroScene.js`: assembles the hero: camera views (desk, wide, portrait, all eye level), the fleet, the person, the sky, and the boat ignite sequence. Returns `{ dispose }`.
  - `water.js`: `mountWater(el, ui, opts)` gives the reflective water (Reflector + custom shader, "smooth" mode chosen; "strokes" is an alternative), the boat fleet, post-processing (bloom, grade; the Kuwahara paint filter is off because it erases hairlines) and pointer drift. It returns an `api` with `addBoat`, `tickers`, `clickables`, `fleet` and `dispose`. Options include `boatScale`, `spread`, `lightScale`, `exclude`, `views`, `drift`.
  - `boat.js`: the paper boat model (17 vertices) plus a 2D SVG renderer (`renderBoat`) and styles.
  - `paper3d.js`: the 3D boat geometry (panels bowed, folds sharp) and the paper shader (interior candle, translucency, soft folds).
  - `painted.js`: places the painted person as a camera-facing card at the waterline, with an invisible boat in their hands as a real light, plus a glow sprite.
  - `sky.js`: the constellation sky. Two canvases (lines and labels, stars) on far planes, so the water reflects them. Style "blend". It draws on over 13 s, **drifts left to right on its own clock (one turn every 5 min), fully independent of the foreground (director's request)**, and has a clearing so lines fade behind the headline.
- `src/assets/person.webp`: the cut-out painted figure (76 KB). `person.png` is the same image, kept for the studies.
- `vite.config.js`: output in `build/` (Netlify), `optimizeDeps.entries` limited to `index.html` (so Vite ignores `explorations/`), chunk warning set to 600.

### Design studies (`explorations/`, committed)

Each is a standalone page served by a Python static server (see "Running"). Their scene modules are **symlinks to `src/scene/`**, so there's one source of truth.

| Study | Folder | Published artifact | Sharing |
|---|---|---|---|
| 01 Paper boat | `boats/` (page `index.html`; artifact copy `artifact.html`) | https://claude.ai/artifact/JMcVsG377CTgvPXUWvnDrU | public link |
| 02 Water | `water/` | https://claude.ai/artifact/ML8GtwLxR9FHYLhWAzuzi4 | private |
| 03 Figure in the water | `figure/` | https://claude.ai/artifact/PmGWNEBzwMnVrVZjYbRtJT | private |
| 04 Constellation sky | `sky/` | https://claude.ai/artifact/1m7eqMo9eU5xxPJ4eYen1E | private |
| Hero prototype | `hero/` | https://claude.ai/artifact/Y9iA9DY1i5awXfNc3RtGee | public link |

To republish a study, publish the same file path again with `files` mapping its modules from `src/scene/`. The user changes sharing themselves via the page's Share menu.

## Decisions made

- **Boat:** live 3D, Lantern style (amber inside, dark hull, translucent rim), softened folds with slightly bowed panels. The small guide boat uses an Ember line (outline glow). Lighting runs from candle at the surface to underwater as the page descends. Motion: subtle drift and flicker, plus "Ignite" (an unlit boat lights on hover).
- **Water:** **Smooth** ripples chosen for now. Painted strokes remain an option; angular plates were rejected.
- **Figure:** a **person** (no "Being"), **static** (no release animation). Code-drawn figures were rejected as too "generated". The figure is an **AI-generated painting (ChatGPT)** from our prompt, cut out and placed at eye level, lower left, facing in toward the fleet. **The camera must stay near eye level** (from above, the painting reads as a flat cut-out).
- **Sky:** Blend style (our four constellations, a light plotted path, the Figma's quiet rings), SASEHacks-style coordinate labels (`3 → 524 – 224`), and a slow sequential draw-on. The constellations mean something: The Vessel (the paper boat), Two Worlds (two circles meeting), The Spark, and The Bracket (`</>`). The director wants the starry sky to **move 100% independently** of the foreground (done).
- **Hero copy:** the eyebrow reads "February 6–7, 2027 / University of Oklahoma", then the italic line "Every great idea starts with a spark.", the "Hacklahoma" wordmark, the subtitle, a "Get event updates" button, and "First-time hackers. Seasoned makers. Everyone aboard." The corner labels are "01 / Where worlds meet" and "Scroll to explore".

## Open items

1. **Registration link:** registration has changed from 2026. Register and Get event updates have `TODO` hrefs (`#register`, `#updates`). Ask the user for the new flow.
2. **AI-art approval:** the figure is AI-generated. Check with Hacklahoma and OU before going public. Fallback: an illustrator's painting dropped into the same slot (same light direction, flat background, cut at the waterline).
3. **Sponsors** have changed since 2026; there's no new list yet.
4. `.claude/` is uncommitted (local preview config and worktrees). Keep it out of commits.

## Next steps (suggested order)

1. **The rest of the page**, following the Figma: "Find your current" (three arch cards: Follow a spark, Find your crew, Make waves), the "From 'what if' to 'we made this'" timeline, the FAQ ("A little guidance before you set sail"), the closing CTA ("Let's see where your spark goes."), and the footer.
2. **Underwater city:** the closing image (glass-domed city lit by lanterns). Plan: ChatGPT paints it from a prompt, then it's brought to life in code (light rays, particles, flickering windows). The descent from surface to underwater could be tied to scroll.
3. **Arch card images** for "Find your current" (likely the same generate-then-integrate approach).
4. Real links, sponsors, FAQ content (the 2026 FAQ answers are a good base; see below), and an MLH Code of Conduct link in the footer.

## Reference material

- **Figma (layout blueprint):** https://www.figma.com/design/KPhBBYkay3CuW7aPDMeblS/Untitled. The canvas won't zoom without signing in; the readable view is https://www.figma.com/proto/KPhBBYkay3CuW7aPDMeblS/Untitled?node-id=0-1&scaling=scale-down-width&content-scaling=fixed
- **Motion references (Pinterest):** a moon that travels with the scroll (https://pin.it/6BAVavAmS), an underwater village (https://pin.it/5DC45iHm8), and KRAI-style focused cards (https://pin.it/1EK7bsclT, the primary UI motion reference).
- **2026 site (content only, not design):** https://2026.hacklahoma.org. Its FAQ answers: free for students, no travel reimbursement, meals provided, no experience needed, teams up to 4, what to bring, MLH Code of Conduct, 18+, new projects only, you can leave and come back. Contact: hacklahoma@ou.edu.
- **Reference images:** `explorations/boats/ref/reference.webp` (the mood image), `explorations/sky/ref/sasehacks.webp` (the director's constellation reference), `explorations/figure/ref/person-source.webp` (the ChatGPT figure before cut-out).
- **Measured palette:** water `#02233c` (far), `#07405d` and `#25516b` (middle band), `#041a2c` (foreground). Boat interior `#e48821`, hull `#443732`, glow `#ffa63e`. UI: ink `#f6ecd9`, amber `#e8b86a`, page `#07121c`.

## Running

- **The site:** `npm run dev -- --port 5182 --strictPort` (the "site" entry in `.claude/launch.json`). Open http://localhost:5182. Port 5173 is often taken.
- **The studies:** `python3 -m http.server 5181 --directory explorations`, then open `/boats/`, `/water/`, `/figure/`, `/sky/` or `/hero/`.
- **Build:** `npm run build` writes to `build/`. The 3D scene is a lazy chunk of about 137 KB gzipped.
