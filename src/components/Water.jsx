import { forwardRef, useEffect, useRef } from 'react';
import { drawReflection } from '../lib/paint.js';
import { event, faqs } from '../content.js';
import PaintedLayer from './PaintedLayer.jsx';

const REFLECT_W = 420;
const REFLECT_H = 560;

// The lantern's light shimmering on the water under the boat.
function Reflection({ x, hullOffset }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = REFLECT_W * dpr;
    c.height = REFLECT_H * dpr;
    ctx.scale(dpr, dpr);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = -1e9;
    let visible = false;
    const frame = (now) => {
      raf = visible && !still ? requestAnimationFrame(frame) : 0;
      if (now - last < 40) return;
      last = now;
      drawReflection(ctx, REFLECT_W, REFLECT_H, now / 1000, hullOffset);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(c);
    drawReflection(ctx, REFLECT_W, REFLECT_H, 0, hullOffset);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [hullOffset]);
  return <canvas ref={ref} className="reflection" style={{ left: x }} aria-hidden="true" />;
}

const Water = forwardRef(function Water({ boatX, hullOffset, width, paint, depth }, ref) {
  return (
    <section className="water" ref={ref} id="questions" aria-labelledby="faq-title">
      {paint && <PaintedLayer className="water-paint" width={width} height={depth} paint={paint} maxDpr={1} />}
      <Reflection x={boatX} hullOffset={hullOffset} />

      <div className="faq">
        <header className="faq-head">
          <p className="label">Beneath the surface</p>
          <h2 id="faq-title">
            Questions, <em>answered</em>
          </h2>
          <p className="faq-note">
            Still wondering? Write to <a href={`mailto:${event.contact}`}>{event.contact}</a>
          </p>
        </header>
        <div className="faq-list">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>
                <span className="faq-mark" aria-hidden="true" />
                <span>{f.q}</span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
});

export default Water;
