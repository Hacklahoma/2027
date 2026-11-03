import { useEffect, useRef } from 'react';

// Fixed particle field. Embers in the sky, bubbles under water, dust in the gold.
export default function Motes({ waterRef, goldRef }) {
  const ref = useRef(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const c = ref.current;
    const ctx = c.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = innerWidth;
      H = innerHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    const N = W < 700 ? 36 : 70;
    const ps = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.6 + Math.random() * 1.8,
      v: 0.15 + Math.random() * 0.5,
      p: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let lastY = scrollY;
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const wTop = waterRef.current?.getBoundingClientRect().top ?? 1e9;
      const gTop = goldRef.current?.getBoundingClientRect().top ?? 1e9;
      const dy = scrollY - lastY;
      lastY = scrollY;
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.y -= p.v + dy * 0.12 * p.s;
        p.x += Math.sin(t / 1600 + p.p) * 0.25;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
        const zone = p.y > gTop ? 2 : p.y > wTop ? 1 : 0;
        const tw = 0.55 + 0.45 * Math.sin(t / 380 + p.p * 3);
        if (zone === 0) {
          ctx.fillStyle = `rgba(255,${180 + (p.p * 10) % 60 | 0},90,${0.75 * tw})`;
          ctx.fillRect(p.x, p.y, p.s, p.s);
        } else if (zone === 1) {
          ctx.strokeStyle = `rgba(170,200,240,${0.35 * tw})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s * 1.6, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(255,214,150,${0.5 * tw})`;
          ctx.fillRect(p.x, p.y, p.s * 0.9, p.s * 0.9);
        }
      }
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [waterRef, goldRef]);

  return <canvas ref={ref} className="motes" aria-hidden="true" />;
}
