import { useEffect, useMemo, useRef } from 'react';
import { paintLantern, paintMountains, rng } from '../lib/paint.js';

let sprite = null;
// One small painted lantern, reused by every floater.
export function lanternSprite() {
  if (!sprite) {
    const c = document.createElement('canvas');
    paintLantern(c, 64, 2, 1.1);
    sprite = c.toDataURL();
  }
  return sprite;
}
const SPARK = 'M0 -10 C1 -2.5 2.5 -1 10 0 C2.5 1 1 2.5 0 10 C-1 2.5 -2.5 1 -10 0 C-2.5 -1 -1 -2.5 0 -10 Z';

// Little lanterns drifting up through the night, at three depths.
export function FloatingLanterns({ count = 26, seed = 7, front = false, band = [2, 98] }) {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => {
      const z = front ? 0.7 + r() * 0.3 : r() * 0.7;
      return {
        left: band[0] + r() * (band[1] - band[0]),
        top: 2 + r() * 84,
        size: 8 + z * (front ? 46 : 26),
        z,
        dur: 9 + r() * 10,
        delay: -r() * 20,
        tilt: (r() - 0.5) * 10,
      };
    });
  }, [count, seed, front, band[0], band[1]]);
  const src = useMemo(lanternSprite, []);

  return (
    <div className="floaters" aria-hidden="true">
      {items.map((l, i) => (
        <div
          key={i}
          className="floater"
          data-speed={(0.32 - l.z * 0.42).toFixed(3)}
          style={{
            left: `${l.left}%`,
            top: `${l.top}%`,
            width: l.size,
            '--blur': `${((1 - l.z) * 1.6).toFixed(2)}px`,
            '--o': (0.45 + l.z * 0.55).toFixed(2),
            '--dur': `${l.dur.toFixed(1)}s`,
            '--delay': `${l.delay.toFixed(1)}s`,
            '--tilt': `${l.tilt.toFixed(1)}deg`,
          }}
        >
          <img src={src} alt="" />
        </div>
      ))}
    </div>
  );
}

// Four-point sparkles plus a few red asterisks, the way the old risograph posters did it.
export function Sparkles({ count = 34, seed = 3 }) {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, (_, i) => ({
      left: r() * 100,
      top: r() * 92,
      size: 6 + r() * (i % 6 === 0 ? 22 : 10),
      kind: i % 5 === 0 ? 'ast' : i % 3 === 0 ? 'dot' : 'spark',
      dur: 2.5 + r() * 4,
      delay: -r() * 6,
    }));
  }, [count, seed]);

  return (
    <div className="sparkles" aria-hidden="true">
      {items.map((s, i) => (
        <svg
          key={i}
          className={`sparkle sparkle-${s.kind}`}
          viewBox="-12 -12 24 24"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            '--dur': `${s.dur.toFixed(1)}s`,
            '--delay': `${s.delay.toFixed(1)}s`,
          }}
        >
          {s.kind === 'spark' && <path d={SPARK} />}
          {s.kind === 'dot' && <circle r="3.2" fill="none" strokeWidth="1.6" />}
          {s.kind === 'ast' && (
            <path d="M0 -9 V9 M-7.8 -4.5 L7.8 4.5 M-7.8 4.5 L7.8 -4.5" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      ))}
    </div>
  );
}

// The far shore: painted mountain ridges on the horizon behind the boat.
export function Shore() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    let w = 0;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || Math.round(width) === w) return;
      w = Math.round(width);
      paintMountains(c, w, Math.round(height), Math.min(window.devicePixelRatio || 1, 1.5));
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={ref} className="shore" aria-hidden="true" />;
}
