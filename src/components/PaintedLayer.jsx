import { useEffect, useRef } from 'react';

const TILE = 1024;

// A tall stack of canvas tiles painted once by `paint(ctx, y0, h, dpr)`.
// `top` and `height` are in the parent section's coordinates.
export default function PaintedLayer({ width, top = 0, height, paint, className, speed, anchor, maxDpr = 1.5 }) {
  const refs = useRef([]);
  const count = height > 0 ? Math.ceil(height / TILE) : 0;

  useEffect(() => {
    if (!width || !height || !paint) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    let i = 0;
    let raf = 0;
    const step = () => {
      const c = refs.current[i];
      if (!c) return;
      const h = Math.min(TILE, height - i * TILE);
      c.width = Math.round(width * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, -(top + i * TILE) * dpr);
      paint(ctx, top + i * TILE, h, dpr);
      c.classList.add('is-painted');
      i += 1;
      if (i < count) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [width, height, top, paint, count, maxDpr]);

  return (
    <div
      className={`painted ${className || ''}`}
      style={{ top, height }}
      data-speed={speed}
      data-anchor={anchor}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <canvas
          key={i}
          ref={(el) => (refs.current[i] = el)}
          style={{ top: i * TILE, height: Math.min(TILE, height - i * TILE) }}
        />
      ))}
    </div>
  );
}
