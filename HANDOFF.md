# Hacklahoma 2027 landing page: handoff

Last updated 2026-11-27. Read this first in a new session.

## Where things stand

- **Live:** `main` deploys to Netlify at **https://2027.hacklahoma.org**.
  - **`/`** is the original plain black announcement ("Hacklahoma 2027 will be held on February 6-7, 2027"). **Don't change the root unless asked.** It was replaced by mistake once and had to be restored.
  - **`/preview`** is the new site, behind a preview password (not case-sensitive). The password isn't written down here because this repo is shared; ask the user. Only its hash is in `Gate.jsx`.
- **Branches:** work happens on `pivot`; `main` is fast-forwarded to it when the user says to push live. Both are at `6cf9538` ("Make the preview hero smooth on iPhones").
- **The page today:** Hero → "The spirit of Hacklahoma" → FAQ ("A little guidance before you set sail") → Footer. It works on desktop and on phones from 320 to 440pt wide, and the user has confirmed it's smooth on their iPhone 17.
- **Next up:** the "Find your current" section (Figma layout; see Next steps), and wiring Register to the Hacksy sign-up link once someone copies it (see Registration).

**People:** the user (Kolby) drives step by step. The **director** and **Bryan (tech director)** review studies via artifact links and GIFs, and the user forwards things on Discord.

## The project

The landing page for **Hacklahoma 2027**, the University of Oklahoma's main hackathon, **February 6–7, 2027**. Theme: **"Where Worlds Meet"**.

Visual direction (agreed): one reference image of a figure sitting in dark blue night water surrounded by glowing amber paper boats. Calm, quiet, cinematic. Deep navy and teal, with one warm amber accent. Earlier drafts (Draft1–3) were abandoned because they tried to do everything at once; Draft3's uncommitted work is in `git stash` ("Draft3 WIP before pivot"). Don't revive it unless asked.

The layout blueprint is the Figma file (see Reference material). Content facts come from the 2026 site, not its design.

## How we work (important)

- **One designed piece at a time, matched to the Figma.** The user shares a Figma screenshot of a section and we build that section. Don't build several sections in one pass. A one-shot build of everything below the hero was rejected as "too Claude generated and rushed". The tells were code-drawn stand-in art, the same label + serif heading + grey paragraph formula in every section, and the same fade on everything.
- **After the hero, the page just scrolls.** No scroll-driven camera moves or "dive under the water" transitions. A descent study was built and rejected for this reason.
- **Crunch time means bigger steps, not less care.** Same quality bar, same verification.
- **Recommend one option and let the user choose.** Keep explanations plain.
- **Only commit or push when the user says so.** Pushing to `main` puts it live. A push the user didn't ask for in that turn gets blocked.
- **Verify before saying it works.** The browser pane is often hidden, which throttles animation, so use headless Chrome screenshots and measurements (see Testing).
- **"Launch it"** means start the dev server in the browser pane (`preview_start` name `site`).
- **Painted imagery (people, the city, card art) comes from ChatGPT** from a text-only prompt we write; code handles motion and light around it. Code-drawn figures and art were rejected.

## The site (React + Vite)

### Two pages, one build

- `index.html` → `src/announcement/` (`main.jsx`, `App.jsx`, `announcement.css`): the root announcement. Tiny; loads none of the new site.
- `preview/index.html` → `src/main.jsx`: the new site. Has `<meta name="robots" content="noindex, nofollow">`.
- `vite.config.js`: builds both (`rollupOptions.input`), outputs to `build/` for Netlify, and sends `Cache-Control: no-store` from `vite preview` (testing only).
- `public/_redirects`: `/preview/*` → `/preview/index.html`, everything else → `/index.html`.

### The new site (`src/`)

- `main.jsx`: wraps the app in **`Gate`** and adds a `motion` class unless reduced motion is on.
- `components/Gate.jsx`: the preview lock. It stores only a SHA-256 hash of the lowercased password and checks input lowercased. It uses `crypto.subtle`, with a pure-JS SHA-256 fallback for plain http (phone testing over Wi-Fi), and remembers the unlock in `localStorage` (`hk27-preview`). It's a light gate, not real security: the code is public. **Remove it and the noindex tag at launch.** For real protection, use Netlify's paid password protection.
- `App.jsx`: Nav, Hero, then a `.page` wrapper with Spirit, Faq and Footer. It runs `observeReveals` from `motion/scroll.js`, which adds `.in` to `[data-reveal]` elements when they scroll into view.
- `components/Nav.jsx`: wordmark, About and FAQ links (hidden on phones), Register (**TODO href `#register`**), and the **MLH 2027 member badge**. The badge is MLH's "gray" (navy) variant, hangs from the top-right corner, fades in with the hero and tucks up out of view once you scroll past the hero. MLH requires it top-right, and Hacklahoma must be an official MLH member event to use it.
- `components/Hero.jsx`: the hero copy and the lazily imported 3D scene. **It reveals only when `scene.ready` resolves and the hero's fonts have loaded** (fonts capped at 2.5 s, overall fallback 10 s). While waiting, a small amber "night spark" pulses after 1.2 s. "Get event updates" is a **TODO href `#updates`**.
- `components/Spirit.jsx`: "The spirit of Hacklahoma / Small sparks. Extraordinary possibilities.", the copy on the right, then a rule with "Open minds / Shared ideas / Boundless possibility" (Figma layout).
- `components/Faq.jsx`: the Figma layout. A large heading on the left stays in place on desktop while the bold questions on the right open and close. There are 9 questions; the 2026 answers still need confirming for 2027 (cost, 18+, teams of 4, travel, new projects only). It ends with the MLH Code of Conduct and hacklahoma@ou.edu.
- `components/Footer.jsx`: wordmark, "Made for curious minds in Oklahoma.", About and FAQ links, "Where worlds meet.", © line, email, MLH Code of Conduct.
- `components/Lines.jsx`: headings that rise in line by line (used by Spirit and FAQ).
- `index.css`: all styles. Fonts are Cormorant Garamond (400/500/700 and italic), DM Sans and DM Mono, from Google Fonts in `preview/index.html`.

### The 3D hero (`src/scene/`, framework-free three.js 0.160.0, pinned)

- `heroScene.js`: assembles the hero: camera views (desk, wide, portrait, all eye level), the fleet, the painted person and the sky.
  - **Quality tiers:** `high` (desktop), `phone` (default on phones: 2× sharpness, half-size bloom, 512 reflection, no grain, no MSAA) and `low`. Force one with `?q=low|phone|high`.
  - **`?fps`** shows a meter: fps, worst frame, tier, render size, and a startup timeline ("scene · compiled · smooth") with the worst freeze while loading.
  - **`ready`** resolves after shaders compile, the sky's fonts land, and 12 frames in a row come in under 40 ms (8 s cap). Boats start lighting after that.
  - Portrait screens use a wider headline clearing in the sky and no extra-wide sky. Phones draw the sky instantly instead of animating it on.
  - The camera view only changes when the layout really changes, not when Safari's address bar resizes the page.
- `water.js`: reflective water (Reflector + custom shader), the boat fleet, post (bloom, grade with optional grain; Kuwahara off), pointer drift. It takes `opts.quality`. The canvas uses `touch-action: pan-y`, because OrbitControls otherwise blocks touch scrolling. The scene stops drawing when less than 20% of the hero is on screen.
- `sky.js`: the constellation sky (style `blend`). It's pinned to the camera (the stars don't move with the pointer), widened with extra star field on desktop so there are no side margins, drifts on its own five-minute loop and draws on over 13 s on desktop. **The local working copy also holds the uncommitted gilded style. See "Local-only" before editing or committing this file.**
- `boat.js`, `paper3d.js`, `painted.js`: the paper boat (2D renderer + 3D geometry/shader) and the painted figure card with the light in their hands.
- `src/intro/sparkIntro.js`: the opening animation (bee "orbit" style), finished but **not wired in** (see Open items).

### Phones: what mattered (measured on the user's iPhone 17)

Chrome on the Mac, even with a slower CPU simulated and in Playwright's WebKit, did **not** reproduce the iPhone problems. Only the real phone did. What fixed it:
1. **No CSS blur filters on touch screens.** The title's moonlit halos were two copies of the word blurred by 25 px and 84 px. Safari re-blurred them every frame while the title faded in, freezing the page at about 1 fps (733 ms frames) just as the lines below it faded. Phones now get a gradient glow (`.moon::before`). The load fade drops its blur and animated letter-spacing, and the solid nav bar replaces the blurred one.
2. **Touch scrolling:** see `touch-action` above.
3. **The sky draw-on** sent about 6 GB of texture uploads in 10 s. Phones draw it once instead.
4. **Reveal only when smooth and when fonts are in.** Otherwise lines "spawn" instead of fading.
5. **Layout:** sizes scale with screen width (320–440pt). The hero copy is anchored from the top, not centred, and there are tighter rules for short screens; safe areas are respected.

## Registration (Hacksy)

Bryan says a Hacklahoma event already exists on **Hacksy**, the user's own hackathon platform (a separate repository on the user's machine; Go API + React portal + Expo app).
- The link to use is in the **organizer portal** (https://portal.hacksy.app, Google sign-in): **Events → the event → Home → "Share your sign-up" → Copy** ("Sign-up link").
- From the Hacksy code, it will look like `https://hacksy.app/events/<org-slug>/<event-slug>/apply` for an application event, the same without `/apply` for one-tap sign-up, or `https://hacksy.app/apply?eventId=<id>` for unlisted or invite-only events. The slugs aren't in the code; **don't guess the URL**.
- On 2026-11-25/26, hacksy.app returned **502** and the portal API was intermittent (production is tunnelled from someone's PC). The event must also be **published**, or its link shows "No event at this link".
- **To do:** get the copied link from the user or Bryan, then point Register (nav) and "Get event updates" (hero) at it. Confirm hacksy.app is reliably up before sending the public there.

## Decisions made

- **Boat:** live 3D, Lantern style (amber inside, dark hull, translucent rim), softened folds, subtle drift and flicker, "Ignite" on hover.
- **Water:** smooth ripples.
- **Figure:** an AI-generated painting (ChatGPT), cut out, eye level, lower left, static. **The camera stays near eye level.**
- **Sky:** Blend style with our four constellations (The Vessel, Two Worlds, The Spark, The Bracket), SASEHacks-style coordinate labels, and draw-on. It moves independently of the foreground (director's request) and is pinned to the camera so the pointer doesn't move it. The gilded style was explored and kept local-only (user's call).
- **Wordmark:** moonlit (director's "glow like the moon"). Two blurred halos on desktop, a gradient glow on phones.
- **Hero copy:** "February 6–7, 2027 / University of Oklahoma" (two lines on phones), "Every great idea starts with a spark.", "Hacklahoma", the subtitle, "Get event updates", "First-time hackers. Seasoned makers. Everyone aboard." (hidden on very short phones), corners "01 / Where worlds meet" and "Scroll to explore" (links to `#about`).
- **MLH badge:** the navy ("gray") 2027 badge.
- **Opening animation (on hold):** Orbit with the bee.
- **Bryan's moodboard ("Journey Beyond the Horizon"):** mood only. Possibly borrow the Darkness → Signal → Discovery → Connection → Possibility flow, a distant lighthouse, and compass / north-star icons. Not the stone archway.

### Tried and rejected (don't redo without asking)

- **Quick build of all sections at once** (orbit carousel for the three cards, journey timeline, closing city, a "spark" line travelling down the margins, Lenis smooth scroll, drifting specks, light-ray stripes, code-drawn stand-in art). All removed, **never committed**. The user **did like the orbit carousel idea** for "Find your current": the focused card in front, the other two behind, a constellation ring with a star you drag to rotate them, and a "Drag me by the star" hint. Worth revisiting as its own study.
- **The descent** (scroll takes the camera under the water to a deep city): rejected, code deleted. The study artifact still exists: https://claude.ai/artifact/Lbuhcrv88qcSvU7BHkzaMP.
- **Zooming the sky to fill wide screens:** too zoomed; replaced by widening it with more star field.

## Open items

1. **Register / Get event updates links:** waiting on the Hacksy sign-up link (above).
2. **FAQ answers** come from 2026; confirm for 2027.
3. **AI-art approval:** the figure is AI-generated. Check with Hacklahoma and OU before launch.
4. **Sponsors:** no 2027 list yet.
5. **Intro not wired:** mount the scene with `intro: true`, call `playSparkIntro({ target: face, wordEl: moon, hooks: scene.intro, ready, style: 'orbit' })`, drop `.rise` from the h1, play once per session, and keep the reduced-motion path. It now also has to coexist with the `ready` / fonts reveal and the phone tiers.
6. **Desktop sky draw-on** still uploads about 6 GB of textures in its first 10 s (fine on desktop GPUs, wasteful). Fixing it properly means editing `sky.js`, which also holds the local gilded code.
7. **At launch:** remove the Gate and the noindex tag, decide what replaces the root announcement, and confirm the MLH member-event status.

## Next steps (suggested)

1. **"Find your current"** (Figma: "The experience / Find your current." with "There's more than one way to make a little magic." on the right, then three cards: 01 Follow a spark, 02 Find your crew, 03 Make waves). Ask the user for the Figma screenshot. Consider the orbit carousel idea as a study. Card art: ChatGPT paintings (prompts in `explorations/art-prompts.md`).
2. **Registration link** once available.
3. The remaining Figma sections, one at a time: "Your journey / From 'what if' to 'we made this'" (four steps) and the closing "Let's see where your spark goes." (with the underwater-city painting).
4. Confirm FAQ answers; sponsors; the intro decision.

## Local-only (not committed, keep it that way unless asked)

- **Gilded sky:** extra code in the working copy of `src/scene/sky.js` (88 lines, the `style === 'gilded'` block), study 07 `explorations/gilded/`, `exports/sky-current-vs-gilded.jpg`. When committing other `sky.js` changes, stage a copy without that block (as done for `93e2e21`).
- `explorations/homie/`: not ours; leave it.
- `.claude/`: local config, including `launch.json` (see Running).

## Design studies (`explorations/`)

Standalone pages; their scene modules are symlinks to `src/scene/`.

| Study | Folder | Artifact |
|---|---|---|
| 01 Paper boat | `boats/` | https://claude.ai/artifact/JMcVsG377CTgvPXUWvnDrU (public) |
| 02 Water | `water/` | https://claude.ai/artifact/ML8GtwLxR9FHYLhWAzuzi4 |
| 03 Figure in the water | `figure/` | https://claude.ai/artifact/PmGWNEBzwMnVrVZjYbRtJT |
| 04 Constellation sky | `sky/` | https://claude.ai/artifact/1m7eqMo9eU5xxPJ4eYen1E |
| Hero prototype | `hero/` | https://claude.ai/artifact/Y9iA9DY1i5awXfNc3RtGee (public) |
| 05 Moonlit wordmark | `wordmark/` | https://claude.ai/artifact/1wEetoo2whWEorGF2DFeKD |
| 06 Opening animation | `intro/` (`?manual` for stepping) | https://claude.ai/artifact/HiGNVsoqRDt9oWz4euUv9r |
| 07 Gilded sky (local-only) | `gilded/` | https://claude.ai/artifact/BG7S3cDDVM7QKxp2VRQU9R |
| 08 Descent (rejected, code deleted) | — | https://claude.ai/artifact/Lbuhcrv88qcSvU7BHkzaMP |

`explorations/art-prompts.md`: ChatGPT prompts for card 02 ("Find your crew"), the underwater city (closing + card 03), and an optional card 01. `exports/`: intro GIFs (`orbit-bee.gif` is the current direction).

## Reference material

- **Figma:** https://www.figma.com/design/KPhBBYkay3CuW7aPDMeblS/Untitled. Readable without sign-in: https://www.figma.com/proto/KPhBBYkay3CuW7aPDMeblS/Untitled?node-id=0-1&scaling=scale-down-width&content-scaling=fixed (click the canvas, then scroll).
- **Motion references (Pinterest):** a moon that travels with the scroll (https://pin.it/6BAVavAmS; the video plays without signing in once its sign-up pop-up is closed), an underwater village (https://pin.it/5DC45iHm8), KRAI-style focused cards (https://pin.it/1EK7bsclT).
- **2026 site (content only):** https://2026.hacklahoma.org. Contact: hacklahoma@ou.edu.
- **MLH brand guidelines:** https://www.mlh.com/brand-guidelines (the 2027 member badge and its embed code).
- **Bryan's moodboard:** a Discord attachment; ask the user to resend it if needed.
- **Measured palette:** water `#02233c` / `#07405d` / `#25516b` / `#041a2c`; boat interior `#e48821`, hull `#443732`, glow `#ffa63e`; UI ink `#f6ecd9`, amber `#e8b86a`, page `#07121c`.

## Running

`.claude/launch.json` entries (use `preview_start` with the name):
- **`site`:** dev server, http://localhost:5182 (the new site is at `/preview/`). It runs React StrictMode, so the scene is built twice; don't judge performance here.
- **`built`:** production build + `vite preview` on http://localhost:5183. Use this for performance measurements.
- **`lan`:** production build served on the Wi-Fi at port 5184, for the user to test on their phone: `http://<Mac's LAN IP>:5184/preview/?fps` (find the IP with `ipconfig getifaddr en0`). Stop it when done.
- **`studies`:** `explorations/` on port 5181.
- Build: `npm run build` → `build/` (both pages).

## Testing (headless, because the pane is often throttled)

Scripts live in the session scratchpad, so recreate them as needed: install `playwright-core` in a scratch folder, never the project. Launch the system Chrome headless with `--use-angle=metal --ignore-gpu-blocklist`; Playwright's WebKit (`npx playwright-core install webkit`) is useful for engine checks. To skip the Gate, set `localStorage['hk27-preview']` to the hash in `Gate.jsx` with `addInitScript`. Measurements that proved useful:
- phone screenshots at 320×568, 375×667, 393×852, 402×874 and 440×956 (`isMobile`, `hasTouch`, DPR 2–3), plus a layout report (element boxes, horizontal overflow)
- a touch swipe via CDP `Input.synthesizeScrollGesture` with `gestureSourceType: 'touch'`, to check that scrolling works
- launch cost with `Emulation.setCPUThrottlingRate` 4×: time to `.ready`, long tasks, especially any after the reveal
- GPU texture upload volume, by hooking `texImage2D` / `texSubImage2D`
- each hero line's opacity sampled every 100 ms after the reveal (fades), including with the Google font files delayed through `page.route`

**But the real iPhone is the final test.** The `?fps` meter screenshot from the user's phone is what found the blur freeze.

For GIFs of motion: step `window.__intro.seek(t)` at 15 fps in `explorations/intro/?manual`, screenshot each frame, then assemble with Pillow (600×375, one shared 200-colour palette).
