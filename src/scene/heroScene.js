// The hero scene: constellation sky over night water, the fleet, and the
// painted person at eye level. Framework-free; Hero.jsx mounts and disposes it.
import { mountWater } from './water.js';
import { addPaintedPerson } from './painted.js';
import { addSky } from './sky.js';

const FIG = { x: -0.95, z: 1.35 };

// The painting was made at eye level, so the camera only moves sideways and back.
const VIEWS = {
  desk:     { pos: [0.1, 1.0, 5.2],    target: [-0.25, 1.3, -2], fov: 34 },
  wide:     { pos: [0.1, 1.0, 5.6],    target: [-0.2, 1.25, -2], fov: 32 },
  portrait: { pos: [-0.45, 1.12, 6.6], target: [-0.6, 1.45, -2], fov: 54 },
};
const pickView = () => {
  const a = innerWidth / innerHeight;
  return a < 0.85 ? 'portrait' : a > 2.1 ? 'wide' : 'desk';
};

/**
 * Mount the scene into `el`. Returns { dispose }.
 * opts.reduce: prefers-reduced-motion (no drift, sky drawn, boats lit, sky still).
 * opts.personUrl: the cut-out painting.
 */
export function createHeroScene(el, { reduce = false, personUrl } = {}) {
  const ui = {};
  const api = mountWater(el, ui, {
    count: 18, boatScale: 0.55, spread: 0.85, lightScale: 0.42, drift: reduce ? 0 : 1,
    exclude: [{ x: FIG.x, z: FIG.z, r: 0.55 }, { x: 0.2, z: 3.6, r: 1.9 }],
    views: Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, { pos: v.pos, target: v.target }])),
    view: pickView(),
  });
  ui.setMode('smooth');
  ui.setPaint(false);   // the sky's hairlines need a crisp image; the painting carries the painterly feel

  const person = addPaintedPerson(api, { url: personUrl, x: FIG.x, z: FIG.z, height: 1.05 });
  // the sky moves on its own (independent of everything in front of it); lines clear around the headline
  addSky(api, {
    style: 'blend', instant: reduce, delay: 0.6, drift: reduce ? 0 : 1 / 300,
    clear: { x: 0.5, y: 0.6, rx: 0.34, ry: 0.36 },
  });

  const frame = () => {
    const name = pickView();
    ui.setView(name);
    api.camera.fov = VIEWS[name].fov;
    api.camera.updateProjectionMatrix();
  };
  frame();
  addEventListener('resize', frame);

  // the boats start dark and light one by one: the one in their hands first, then outward
  const timers = [];
  if (!reduce) {
    const d = (b) => Math.hypot(b.group.position.x - FIG.x, b.group.position.z - FIG.z);
    for (const b of api.fleet) { b.lit = 0; b.litTarget = 0; }
    timers.push(setTimeout(() => (person.boat.litTarget = 1), 1100));
    api.fleet.filter((b) => b !== person.boat).sort((a, b) => d(a) - d(b))
      .forEach((b, i) => timers.push(setTimeout(() => (b.litTarget = 1), 2200 + i * 210)));
  }

  return {
    dispose() {
      timers.forEach(clearTimeout);
      removeEventListener('resize', frame);
      api.dispose();
    },
  };
}
