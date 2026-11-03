import { useEffect, useRef } from 'react';
import { drawRibbon } from '../lib/paint.js';

const MARGIN = 320;

// The river of light, redrawn about 25 times a second so its edges drift upward.
// The canvas covers the viewport plus a margin and scrolls with the page between
// redraws, so it never lags behind the content around it.
export default function LiveRibbon({ ribbon, width }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !ribbon || !width) return undefined;
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let h = 0;
    let raf = 0;
    let last = -1e9;
    let lastTop = null;

    const size = () => {
      h = innerHeight + MARGIN * 2;
      c.width = Math.round(width * dpr);
      c.height = Math.round(h * dpr);
      c.style.height = `${h}px`;
      lastTop = null;
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const viewTop = -c.parentElement.getBoundingClientRect().top;
      if (viewTop > ribbon.endY + 200 || viewTop + innerHeight < -300) return;
      const top = Math.round(viewTop - MARGIN);
      const drifted = lastTop === null || Math.abs(top - lastTop) > MARGIN * 0.6;
      if (!drifted && (still || now - last < 40)) return;
      last = now;
      lastTop = top;
      c.style.transform = `translateY(${top}px)`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
      ctx.clearRect(0, top, width, h);
      drawRibbon(ctx, top, h, ribbon, still ? 0 : now / 1000);
    };

    size();
    addEventListener('resize', size);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', size);
    };
  }, [ribbon, width]);

  return <canvas ref={ref} className="live-ribbon" aria-hidden="true" />;
}
