import { useEffect, useRef, useState } from 'react';
import { paintLantern } from '../lib/paint.js';

// A big paper sky lantern, painted in the same grain as the sky, that ignites
// as it drifts into view.
export default function Lantern({ numeral, label, title, side, children }) {
  const ref = useRef(null);
  const art = useRef(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLit(true), {
      rootMargin: '0px 0px -30% 0px',
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let w = 0;
    const ro = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (!next || next === w) return;
      w = next;
      paintLantern(art.current, w, Math.min(window.devicePixelRatio || 1, 2));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <article ref={ref} className={`lantern${lit ? ' is-lit' : ''}`} data-side={side}>
      <div className="lantern-halo" aria-hidden="true" />
      <div className="lantern-float">
        <canvas ref={art} className="lantern-art" aria-hidden="true" />
        <div className="lantern-copy">
          <p className="lantern-label">
            <span className="numeral">{numeral}</span> {label}
          </p>
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    </article>
  );
}
