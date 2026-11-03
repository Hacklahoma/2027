import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { event, faqs, sponsorCta, sponsors } from '../content.js';
import { BOAT_BOX, paintLantern, rng } from '../lib/paint.js';
import { buildScenery, drawWake, makeRoute, makeSchedule, makeStops, paintWorld, placeBeacons } from '../lib/voyage.js';
import { lanternSprite } from './SkyDecor.jsx';
import Boat from './Boat.jsx';

// After the horizon the boat sets sail. The section pins to the screen and
// scrolling carries Hacksy down a winding river with three stops: a cove where
// every question is posted, a grove of sponsor lanterns, and the dock.

const LEGS = { start: 'Setting sail', faq: 'The cove', sponsor: 'The grove', end: 'Arrival' };
const SIZE = (mobile) => (tier) => (mobile ? { title: 130, gold: 100, silver: 84 } : { title: 190, gold: 145, silver: 115 })[tier] ?? 84;

function Beacon({ b, lit }) {
  const art = useRef(null);
  useEffect(() => {
    paintLantern(art.current, b.size, Math.min(window.devicePixelRatio || 1, 2));
  }, [b.size]);
  const { sponsor } = b;
  return (
    <div className={`beacon beacon-${sponsor.tier}${lit ? ' is-lit' : ''}`} style={{ left: b.x, top: b.y, width: b.size }}>
      <div className="beacon-lantern">
        <canvas ref={art} aria-hidden="true" />
        <div className="beacon-name">
          {sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name} /> : <span>{sponsor.name}</span>}
        </div>
      </div>
      <div className="beacon-post" aria-hidden="true" />
      <p className="beacon-tier">{sponsor.tier}</p>
    </div>
  );
}

const Voyage = forwardRef(function Voyage(_, boatLanternRef) {
  const section = useRef(null);
  const worldRef = useRef(null);
  const art = useRef(null);
  const wake = useRef(null);
  const boatRef = useRef(null);
  const flipRef = useRef(null);
  const [dims, setDims] = useState(null);
  const [active, setActive] = useState(null);
  const [boatS, setBoatS] = useState(0);
  const sprite = useMemo(lanternSprite, []);

  useLayoutEffect(() => {
    const measure = () => {
      const W = document.documentElement.clientWidth;
      const H = window.innerHeight;
      setDims((d) => (d && d.W === W && Math.abs(d.H - H) < 120 ? d : { W, H, mobile: W < 760 }));
    };
    measure();
    let lastW = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      measure();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const route = useMemo(() => dims && makeRoute(dims), [dims]);
  const stops = useMemo(() => route && makeStops(route), [route]);
  const schedule = useMemo(() => stops && makeSchedule(route.L, stops), [route, stops]);
  const beacons = useMemo(() => route && placeBeacons(route, sponsors, SIZE(route.mobile)), [route]);

  // nine little lanterns bobbing in the cove, one for each question
  const coveLights = useMemo(() => {
    if (!stops) return [];
    const st = stops[0];
    const p = route.at(st.s);
    const r = rng(9);
    return faqs.map((_, i) => {
      const along = (i - (faqs.length - 1) / 2) * (route.mobile ? 22 : 46);
      const across = (r() - 0.5) * st.hw * 0.9;
      return { x: p.x + p.tx * along + p.nx * across, y: p.y + p.ty * along + p.ny * across, delay: -r() * 5 };
    });
  }, [route, stops]);

  const floaters = useMemo(() => {
    if (!route) return [];
    const r = rng(404);
    return Array.from({ length: route.mobile ? 8 : 14 }, () => ({
      x: r() * route.Ww,
      y: 200 + r() * (route.Wh - 300),
      size: 8 + r() * 14,
      dur: 8 + r() * 8,
      delay: -r() * 16,
    }));
  }, [route]);

  useEffect(() => {
    if (!route) return undefined;
    return paintWorld(art.current, route, buildScenery(route, stops));
  }, [route, stops]);

  // Each frame: scroll → distance along the route → boat, camera and wake.
  useEffect(() => {
    if (!route) return undefined;
    const { W, H, Ww, Wh, mobile } = route;
    const c = wake.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const approach = H * 0.55;
    let raf = 0;
    let facing = 1;
    let lastActive;
    let lastBucket = -1;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const sec = section.current;
      const top = sec.getBoundingClientRect().top;
      if (top > H || top + sec.offsetHeight < 0) return;
      const total = sec.offsetHeight - H + approach;
      const p = Math.min(1, Math.max(0, (approach - top) / total));
      const s = schedule.pToS(p);
      const pt = route.at(s);

      // the camera holds still until the boat has left the horizon, then follows it
      const follow = Math.min(1, Math.max(0, s / 600));
      const ease = follow * follow * (3 - 2 * follow);
      const ax = W / 2 + ((mobile ? W / 2 : W * 0.3) - W / 2) * ease;
      const ay = (mobile ? H * 0.24 : H * 0.5) * ease;
      const camX = Math.min(Math.max(pt.x - ax, 0), Ww - W);
      const camY = Math.min(Math.max(pt.y - ay, 0), Wh - H);
      worldRef.current.style.transform = `translate3d(${-camX}px, ${-camY}px, 0)`;

      const bw = boatRef.current.offsetWidth;
      const bh = (bw * BOAT_BOX.h) / BOAT_BOX.w;
      const lx = (BOAT_BOX.lantern.x / BOAT_BOX.w) * bw;
      const wl = (BOAT_BOX.waterline / BOAT_BOX.h) * bh;
      boatRef.current.style.transform = `translate3d(${pt.x - camX - lx}px, ${pt.y - camY - wl}px, 0)`;
      if (pt.tx > 0.35) facing = 1;
      else if (pt.tx < -0.35) facing = -1;
      flipRef.current.style.transform = `scaleX(${facing})`;

      drawWake(ctx, W, H, route, s, camX, camY, still ? 0 : now / 1000);

      let near = null;
      for (const st of stops) if (Math.abs(st.s - s) < (st.kind === 'end' ? 260 : 380)) near = st.kind;
      if (near !== lastActive) {
        lastActive = near;
        setActive(near);
      }
      const bucket = Math.round(s / 40);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        setBoatS(s);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [route, stops, schedule]);

  const passed = stops ? stops.filter((st) => st.s <= boatS + 380).length : 0;
  const leg = active ?? (passed ? stops[passed - 1].kind : 'start');
  const range = dims ? dims.H * (dims.mobile ? 4.6 : 4) : 0;

  return (
    <section className="voyage" ref={section} style={{ height: dims ? dims.H + range : '100vh' }} aria-label="The voyage">
      <div className="voyage-stage">
        <div className="voyage-clip">
          <div className="voyage-world" ref={worldRef} style={route ? { width: route.Ww, height: route.Wh } : undefined}>
            <canvas ref={art} className="world-art" aria-hidden="true" />

            {floaters.map((f, i) => (
              <img
                key={i}
                className="world-floater"
                src={sprite}
                alt=""
                style={{ left: f.x, top: f.y, width: f.size, '--dur': `${f.dur.toFixed(1)}s`, '--delay': `${f.delay.toFixed(1)}s` }}
              />
            ))}

            {coveLights.map((l, i) => (
              <div key={i} className={`cove-light${active === 'faq' ? ' is-lit' : ''}`} style={{ left: l.x, top: l.y, '--delay': `${l.delay.toFixed(1)}s` }}>
                <span className="buoy-ripple" />
                <img src={sprite} alt="" />
              </div>
            ))}

            {beacons?.map((b, i) => (
              <Beacon key={i} b={b} lit={b.s <= boatS + 260} />
            ))}

            {stops && (
              <div className={`arrival${active === 'end' ? ' is-active' : ''}`} style={{ left: stops[2].x, top: stops[2].y }}>
                <p className="label">You made it</p>
                <h2>
                  See you in <em>Norman</em>
                </h2>
                <p>
                  {event.dates} · {event.place}
                </p>
                <div className="arrival-links">
                  {event.apply.href && (
                    <a className="arrival-cta" href={event.apply.href}>
                      {event.apply.label} →
                    </a>
                  )}
                  <a href={sponsorCta.href}>{sponsorCta.label}</a>
                </div>
              </div>
            )}
          </div>
          <canvas ref={wake} className="wake" aria-hidden="true" />
        </div>

        <div className="voyage-boat" ref={boatRef}>
          <div className="voyage-boat-flip" ref={flipRef}>
            <Boat ref={boatLanternRef} />
          </div>
        </div>

        <div className="voyage-hud" aria-hidden="true">
          <p className="label">{LEGS[leg]}</p>
          <ol>
            {(stops ?? []).map((st, i) => (
              <li key={st.kind} className={`${i < passed ? 'is-passed' : ''}${active === st.kind ? ' is-active' : ''}`} />
            ))}
          </ol>
        </div>

        <aside className={`cove${active === 'faq' ? ' is-open' : ''}`} id="questions" aria-labelledby="cove-title">
          <span className="cove-pin" aria-hidden="true" />
          <p className="label">The cove</p>
          <h2 id="cove-title">Questions, posted for every boat that passes</h2>
          <div className="cove-list">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="cove-note">
            Didn’t see yours? <a href={`mailto:${event.contact}`}>{event.contact}</a>
          </p>
        </aside>

        <div className={`grove-head${active === 'sponsor' ? ' is-open' : ''}`} id="sponsors">
          <p className="label">The grove</p>
          <h2>
            Lit by <em>our sponsors</em>
          </h2>
          <a href={sponsorCta.href}>{sponsorCta.label} →</a>
        </div>

        {dims?.mobile && active === 'end' && (
          <div className="voyage-caption" aria-live="polite">
            <p className="label">You made it</p>
            <h3>See you in Norman, {event.dates}</h3>
            {event.apply.href && (
              <p>
                <a href={event.apply.href}>{event.apply.label} →</a>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
});

export default Voyage;
