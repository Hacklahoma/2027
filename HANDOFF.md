# Hacklahoma 2027 landing page: handoff

Last updated 2026-11-25. Branch `pivot` (cut from `main`), pushed to `origin/pivot` (https://github.com/Hacklahoma/2027/tree/pivot). Last pushed commit `98efcb1` (moonlit wordmark + intro study). **Deliberately not committed (user's call):** the gilded sky style (in the local `src/scene/sky.js`), study 07 (`explorations/gilded/`) and `exports/sky-current-vs-gilded.jpg`. They exist only on this machine; the committed site and sky stay on the current blend style.

**Where we are:** the hero is done (live water, boats, painted figure, constellation sky, moonlit wordmark). The intro and the gilded sky are finished studies, parked until the directors decide. **Next up: the rest of the page, starting with a study of one "Find your current" arch card.**

**People:** the user (Kolby) drives step by step; the **director** and **Bryan (tech director)** review studies via artifact links and GIFs.

## The project

The landing page for **Hacklahoma 2027**, the University of Oklahoma's main hackathon, **February 6–7, 2027**. Theme: **"Where Worlds Meet"**.

Visual direction (agreed): one reference image of a figure sitting in dark blue night water surrounded by glowing amber paper boats. Calm, quiet, cinematic. Deep navy and teal, with one warm amber accent. Earlier drafts (Draft1–3) were abandoned because they tried to do everything at once; Draft3's uncommitted work is in `git stash` ("Draft3 WIP before pivot"). Don't revive it unless asked.

Layout blueprint: the Figma file (below). Content facts come from the 2026 site, not its design.

## How we work (important)

- **Build assets first, one at a time, then the layout.** Don't one-shot pages. Each asset got its own study, the user reviewed it, then we moved on.
- The user guides step by step. Recommend one option, mark it, and let them choose. Keep explanations plain.
- Every study is published as a shareable claude.ai artifact so the user and the **director** can review.
- When the user says "launch it", they mean start the site dev server in the browser pane (`preview_start` name `site`).
- For sharing motion, render GIFs into `exports/` (see "Recording" below); the user forwards them on Discord.
- Verify in the browser pane before saying something works. Screenshots help, but the pane is often hidden, which throttles animation to about 1 fps. Reload and wait, or check state with JS.

## What's built

### The site (React + Vite, `src/`)

- `src/App.jsx`: Nav, Hero, Spirit. A `ready` class on the wrapper starts the CSS load sequence.
- `src/components/Hero.jsx`: headline copy (from the Figma) plus a lazily imported 3D scene. It fires `onReady` when the scene is up, with a 900 ms fallback.
- `src/components/Nav.jsx`: wordmark, links, and Register. Becomes solid after scrolling past 60% of the hero.
- The hero wordmark is **moonlit** (study 05, style A: silver-white gradient lit from above, two breathing blurred halos). Markup is `.moon > .halo.wide, .halo, .face` in `Hero.jsx`; styles in `index.css`.
- `src/components/Spirit.jsx`: "Small sparks. Extraordinary possibilities." A placeholder for the next section.
- `src/index.css`: all styles and tokens. Fonts are Cormorant Garamond (display), DM Sans (body) and DM Mono (labels), loaded in `index.html`.
- `src/scene/` (framework-free three.js 0.160.0, pinned):
  - `heroScene.js`: assembles the hero: camera views (desk, wide, portrait, all eye level), the fleet, the person, the sky, and the boat ignite sequence. Returns `{ dispose }`.
  - `water.js`: `mountWater(el, ui, opts)` gives the reflective water (Reflector + custom shader, "smooth" mode chosen; "strokes" is an alternative), the boat fleet, post-processing (bloom, grade; the Kuwahara paint filter is off because it erases hairlines) and pointer drift. It returns an `api` with `addBoat`, `tickers`, `clickables`, `fleet` and `dispose`. Options include `boatScale`, `spread`, `lightScale`, `exclude`, `views`, `drift`.
  - `boat.js`: the paper boat model (17 vertices) plus a 2D SVG renderer (`renderBoat`) and styles.
  - `paper3d.js`: the 3D boat geometry (panels bowed, folds sharp) and the paper shader (interior candle, translucency, soft folds).
  - `painted.js`: places the painted person as a camera-facing card at the waterline, with an invisible boat in their hands as a real light, plus a glow sprite.
  - Intro hooks (off by default): `createHeroScene(el, { intro: true })` starts black with boats dark and the sky held, and returns `intro` hooks: `setOrigin(px, py)`, `setReveal(0–1)` (a soft mask in the grade pass that pours down from the origin and lights boats as it reaches them), `setGlade(0–1)` (a moonlight path of glints on the water, in `water.js`), `startSky()`.
  - `sky.js`: the constellation sky. Styles `blend` (live on the site), `plotted`, `chart`, `shapes`, and **`gilded`** (built from Bryan's moodboard: warm gold lines and stars, four-point flares on lead stars, a north star at the heart of The Spark, faint celestial-globe arcs, dotted routes between constellations, gold dust, a corner astrolabe, no coordinate labels). `addSky` takes `hold: true` and returns `start()` for the intro. Two canvases (lines and labels, stars) on far planes, so the water reflects them. Style "blend". It draws on over 13 s, **drifts left to right on its own clock (one turn every 5 min), fully independent of the foreground (director's request)**, and has a clearing so lines fade behind the headline.
- `src/intro/sparkIntro.js`: the opening animation (not wired into the site yet). One three.js points overlay with all motion computed in the vertex shader; two styles: `orbit` (a lone moon-white spark, then a swarm that loops in and forms the pixel **bee** mascot with beating wings and a thin orbit ring) and `galaxy` (an ember spiral galaxy). Both condense into the wordmark, sweep it to moonlight, then drive the scene's reveal hooks. `manual: true` exposes `seek(t)` for frame-exact checks and recording.
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
| 05 Moonlit wordmark | `wordmark/` | https://claude.ai/artifact/1wEetoo2whWEorGF2DFeKD | private |
| 06 Opening animation | `intro/` (Orbit / Galaxy switch; `?manual` for scripted stepping) | https://claude.ai/artifact/HiGNVsoqRDt9oWz4euUv9r | private |
| 07 Gilded sky | `gilded/` (hero layout with a Current / Gilded switch; `?sky=blend` opens on current) | https://claude.ai/artifact/BG7S3cDDVM7QKxp2VRQU9R | private |

`exports/` holds shareable previews: `sky-current-vs-gilded.jpg` (side by side), and GIFs of the intro (`orbit-bee.gif` is the current direction; `orbit.gif` is the earlier two-rings version; `spark-to-moon.gif` is the galaxy). They were rendered frame by frame with headless Chrome via playwright-core, stepping `__intro.seek(t)` at 15 fps, then assembled with Pillow (600×375, shared 200-colour palette).

To republish a study, publish the same file path again with `files` mapping its modules from `src/scene/`. The user changes sharing themselves via the page's Share menu.

## Decisions made

- **Boat:** live 3D, Lantern style (amber inside, dark hull, translucent rim), softened folds with slightly bowed panels. The small guide boat uses an Ember line (outline glow). Lighting runs from candle at the surface to underwater as the page descends. Motion: subtle drift and flicker, plus "Ignite" (an unlit boat lights on hover).
- **Water:** **Smooth** ripples chosen for now. Painted strokes remain an option; angular plates were rejected.
- **Figure:** a **person** (no "Being"), **static** (no release animation). Code-drawn figures were rejected as too "generated". The figure is an **AI-generated painting (ChatGPT)** from our prompt, cut out and placed at eye level, lower left, facing in toward the fleet. **The camera must stay near eye level** (from above, the painting reads as a flat cut-out).
- **Sky:** Blend style (our four constellations, a light plotted path, the Figma's quiet rings), SASEHacks-style coordinate labels (`3 → 524 – 224`), and a slow sequential draw-on. The constellations mean something: The Vessel (the paper boat), Two Worlds (two circles meeting), The Spark, and The Bracket (`</>`). The director wants the starry sky to **move 100% independently** of the foreground (done).
- **Wordmark:** moonlit, the director's "glow like the moon" request. Style A (smooth, lit from above), glow ≈ 1.4, warmth 0.25.
- **Opening animation (on hold):** the user's lead is **Orbit with the bee**: the spark flies in alone, more follow and loop in, they form the bee as a light dot-matrix (not filled) with a faint orbit ring, then the word, then the moonlight pours onto the water and reveals the page. Rejected along the way: a 2D sparkle that wrote the word (no wow; flat; generic circular wipe), filled/overexposed bee, a dense halo disc. The pixel bee is traced in `BEE` in `sparkIntro.js` from the user's mascot image.
- **Sky (2026-11-25):** the user chose to **keep the current blend sky** and not commit the gilded style. Gilded remains a local-only experiment (study 07); don't bring it back unless asked.
- **Bryan's moodboard ("Journey Beyond the Horizon"):** treated as art inspiration only, not a theme change; the user cares about its artistic look, not its text. Worth borrowing later: the section flow **Darkness → Signal → Discovery → Connection → Possibility** as the scroll's story, a small distant lighthouse with a sweeping beam on our horizon, compass / north-star line icons. Not taking: the glowing stone archway (too fantasy-game) or all three directions at once. Its images look AI-generated, so mood only.
- **Hero copy:** the eyebrow reads "February 6–7, 2027 / University of Oklahoma", then the italic line "Every great idea starts with a spark.", the "Hacklahoma" wordmark, the subtitle, a "Get event updates" button, and "First-time hackers. Seasoned makers. Everyone aboard." The corner labels are "01 / Where worlds meet" and "Scroll to explore".

## Open items

1. **Intro not on the site yet.** To wire it: mount the scene with `intro: true`, call `playSparkIntro({ target: face, wordEl: moon, hooks: scene.intro, ready, style: 'orbit' })`, drop `.rise` from the h1 (its transform would misalign the particle word), play once per session, and keep the reduced-motion path.
2. **Registration link:** registration has changed from 2026. Register and Get event updates have `TODO` hrefs (`#register`, `#updates`). Ask the user for the new flow.
3. **AI-art approval:** the figure is AI-generated. Check with Hacklahoma and OU before going public. Fallback: an illustrator's painting dropped into the same slot (same light direction, flat background, cut at the waterline).
4. **Sponsors** have changed since 2026; there's no new list yet.
5. `.claude/` is uncommitted (local preview config and worktrees). Keep it out of commits.

## Next steps (suggested order)

1. **The rest of the page**, following the Figma for layout and Bryan's Darkness → Signal → Discovery → Connection → Possibility flow for feel. Start with **one arch card study** for "Find your current" (shape, art, hover, the KRAI-style focus motion), then the three cards (Follow a spark, Find your crew, Make waves), the "From 'what if' to 'we made this'" timeline, the FAQ ("A little guidance before you set sail"), the closing CTA ("Let's see where your spark goes."), and the footer.
2. **Underwater city:** the closing image (glass-domed city lit by lanterns). Plan: ChatGPT paints it from a prompt, then it's brought to life in code (light rays, particles, flickering windows). The descent from surface to underwater could be tied to scroll.
3. **Arch card images** for "Find your current" (likely the same generate-then-integrate approach).
4. **Wire the intro into the site** once the directors pick (see open item 1).
5. **Phone pass** before launch: hero on small screens, load weight, reduced motion.
6. Real links, sponsors, FAQ content (the 2026 FAQ answers are a good base; see below), and an MLH Code of Conduct link in the footer.

## Reference material

- **Figma (layout blueprint):** https://www.figma.com/design/KPhBBYkay3CuW7aPDMeblS/Untitled. The canvas won't zoom without signing in; the readable view is https://www.figma.com/proto/KPhBBYkay3CuW7aPDMeblS/Untitled?node-id=0-1&scaling=scale-down-width&content-scaling=fixed
- **Motion references (Pinterest):** a moon that travels with the scroll (https://pin.it/6BAVavAmS), an underwater village (https://pin.it/5DC45iHm8), and KRAI-style focused cards (https://pin.it/1EK7bsclT, the primary UI motion reference).
- **2026 site (content only, not design):** https://2026.hacklahoma.org. Its FAQ answers: free for students, no travel reimbursement, meals provided, no experience needed, teams up to 4, what to bring, MLH Code of Conduct, 18+, new projects only, you can leave and come back. Contact: hacklahoma@ou.edu.
- **Bryan's moodboard:** "Hacklahoma 2027: Journey Beyond the Horizon" (Discord attachment; signed link expires, ask the user to resend if needed). Three directions (lighthouse, celestial gold constellations, stone archway), hero explorations, desktop + mobile pages, a mini design system (Midnight / Deep Ocean / Starlight / Ancient Gold; Cormorant Garamond, Inter, IBM Plex Mono).
- **Bee mascot:** pixel-art bee (antennae, head, four body stripes, stinger, five-bar wings), traced into `BEE` in `src/intro/sparkIntro.js`.
- **Reference images:** `explorations/boats/ref/reference.webp` (the mood image), `explorations/sky/ref/sasehacks.webp` (the director's constellation reference), `explorations/figure/ref/person-source.webp` (the ChatGPT figure before cut-out).
- **Measured palette:** water `#02233c` (far), `#07405d` and `#25516b` (middle band), `#041a2c` (foreground). Boat interior `#e48821`, hull `#443732`, glow `#ffa63e`. UI: ink `#f6ecd9`, amber `#e8b86a`, page `#07121c`.

## Running

- **The site:** `npm run dev -- --port 5182 --strictPort` (the "site" entry in `.claude/launch.json`). Open http://localhost:5182. Port 5173 is often taken.
- **The studies:** `python3 -m http.server 5181 --directory explorations`, then open `/boats/`, `/water/`, `/figure/`, `/sky/` or `/hero/`.
- **Build:** `npm run build` writes to `build/`. The 3D scene is a lazy chunk of about 138 KB gzipped.
- **Studies via Vite also work:** http://localhost:5182/explorations/intro/ and `/explorations/gilded/` (Vite resolves `three`).

## Recording (GIFs and screenshots for sharing)

The browser pane is often hidden and throttled, so motion is captured headlessly instead: a small Node script with `playwright-core` launches the system Google Chrome headless (`--use-angle=metal --ignore-gpu-blocklist`), opens a study with `?manual`, steps `window.__intro.seek(t)` at 15 fps and screenshots each frame; Pillow then builds a 600×375 GIF with one shared 200-colour palette and no dithering (about 10–13 MB for 10 s). The script lived in the session scratchpad, so recreate it if needed (install `playwright-core` in a scratch folder, not the project). For still comparisons, wait ~16 s for the sky to draw on, then screenshot.
