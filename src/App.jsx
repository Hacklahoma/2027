import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { chapters, event } from './content.js';
import { makeForest, makeRibbon, makeWaterPainter, paintForest, paintRibbonGlow } from './lib/paint.js';
import Defs from './components/Defs.jsx';
import LiveRibbon from './components/LiveRibbon.jsx';
import PaintedLayer from './components/PaintedLayer.jsx';
import Lantern from './components/Lantern.jsx';
import { FloatingLanterns, Shore, Sparkles } from './components/SkyDecor.jsx';
import Boat from './components/Boat.jsx';
import Water from './components/Water.jsx';
import Gold from './components/Gold.jsx';
import Menu from './components/Menu.jsx';
import Motes from './components/Motes.jsx';
import useParallax from './useParallax.js';

const WATER_DEPTH = 900;

export default function App() {
  const skyRef = useRef(null);
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const lanternRefs = useRef([]);
  const boatLanternRef = useRef(null);
  const waterRef = useRef(null);
  const goldRef = useRef(null);
  const [layout, setLayout] = useState(null);

  // Read where the title, lanterns and boat ended up, so the light can wind between them.
  const measure = useCallback(() => {
    const sky = skyRef.current;
    if (!sky) return;
    const base = sky.getBoundingClientRect();
    const W = sky.clientWidth;
    const H = sky.offsetHeight;
    const mobile = W < 900;
    const heroEnd = heroRef.current.offsetHeight;
    const titleW = titleRef.current.getBoundingClientRect().width;
    const hwTop = Math.min(W * (mobile ? 0.6 : 0.36), titleW / 2 / 0.74 + 24);
    const b = boatLanternRef.current.getBoundingClientRect();
    const end = { x: b.left + b.width / 2 - base.left, y: b.top + b.height / 2 - base.top };
    // the hull's middle sits 62 of the boat's 300 units left of its lantern
    const hullOffset = -(62 / 300) * boatLanternRef.current.closest('.boat').offsetWidth;

    const keys = [
      { y: 0, x: W / 2 },
      { y: heroEnd * 0.8, x: W / 2 },
    ];
    lanternRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const y = r.top + r.height / 2 - base.top;
      const left = i % 2 === 0;
      const x = mobile ? W / 2 + (left ? 1 : -1) * W * 0.12 : left ? W * 0.68 : W * 0.32;
      keys.push({ y, x });
    });
    keys.push({ y: end.y - 260, x: end.x }, { y: end.y, x: end.x });

    setLayout((prev) => {
      if (prev && prev.W === W && prev.H === H && prev.end.y === end.y) return prev;
      return { W, H, mobile, heroEnd, hwTop, keys, end, hullOffset };
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    document.fonts?.ready.then(measure);
    let lastW = innerWidth;
    let t = 0;
    const onResize = () => {
      if (innerWidth === lastW) return;
      lastW = innerWidth;
      clearTimeout(t);
      t = setTimeout(measure, 180);
    };
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, [measure]);

  const painters = useMemo(() => {
    if (!layout) return null;
    const { W, H, mobile, heroEnd, hwTop, keys, end } = layout;
    const ribbon = makeRibbon({ keys, hwTop, heroEnd, endY: end.y, mobile });
    const far = makeForest({ W, top: -560, bottom: H - 420, ground: H - 40, kind: 'far', seed: 11, mobile });
    const near = makeForest({ W, top: -560, bottom: H - 240, ground: H + 10, kind: 'near', seed: 23, mobile });
    const water = makeWaterPainter({ W, depth: WATER_DEPTH, mobile });
    return {
      ribbon,
      glow: (ctx, y0, h, dpr) => paintRibbonGlow(ctx, y0, h, dpr, ribbon),
      water: (ctx, y0) => water(ctx.canvas, y0, 1),
      far: (ctx, y0, h, dpr) => paintForest(ctx, y0, h, dpr, far),
      near: (ctx, y0, h, dpr) => paintForest(ctx, y0, h, dpr, near),
    };
  }, [layout]);

  useParallax([layout]);

  const W = layout?.W ?? 0;
  const H = layout?.H ?? 0;

  return (
    <>
      <Defs />
      <Motes waterRef={waterRef} goldRef={goldRef} />
      <Menu />

      <main>
        <section className="sky" ref={skyRef}>
          <div className="sky-paint">
            <Sparkles />
            {painters && (
              <>
                <PaintedLayer className="far" width={W} top={-560} height={H + 560} paint={painters.far} speed={0.1} anchor="end" />
                <Shore />
                <div className="haze" aria-hidden="true">
                  <i /><i /><i />
                </div>
                <FloatingLanterns />
                <PaintedLayer className="ribbon-glow" width={W} top={0} height={H} paint={painters.glow} maxDpr={1} />
                <LiveRibbon ribbon={painters.ribbon} width={W} />
                <PaintedLayer className="near" width={W} top={-560} height={H + 560} paint={painters.near} speed={-0.05} anchor="end" />
              </>
            )}
            <div className="mist" aria-hidden="true" />
          </div>

          <header className="hero" ref={heroRef}>
            <p className="label hero-kicker">{event.kicker}</p>
            <h1 className="hero-title" ref={titleRef}>
              {event.name}
            </h1>
            <p className="label hero-date">
              {event.dates} <span aria-hidden="true">✦</span> {event.place}
            </p>
            <a className="hero-cue" href="#light">
              follow the light
            </a>
          </header>

          <div className="chapters" id="light">
            {chapters.map((c, i) => (
              <div className="chapter" key={c.numeral} data-side={i % 2 === 0 ? 'left' : 'right'}>
                <div ref={(el) => (lanternRefs.current[i] = el)} className="chapter-slot">
                  <Lantern numeral={c.numeral} label={c.label} title={c.title} side={i % 2 === 0 ? 'left' : 'right'}>
                    <p>{c.body}</p>
                    {c.cta && event.apply.href && (
                      <a className="lantern-cta" href={event.apply.href}>
                        {event.apply.label} →
                      </a>
                    )}
                  </Lantern>
                </div>
              </div>
            ))}
          </div>

          <div className="landing">
            <p className="landing-line">
              Every light <em>starts somewhere small.</em>
            </p>
            <FloatingLanterns count={5} seed={91} front band={[24, 76]} />
            <Boat ref={boatLanternRef} />
          </div>
        </section>

        <Water
          ref={waterRef}
          boatX={layout ? layout.end.x : '50%'}
          hullOffset={layout?.hullOffset ?? 0}
          width={W}
          depth={WATER_DEPTH}
          paint={painters?.water}
        />
        <Gold ref={goldRef} />
      </main>
    </>
  );
}
