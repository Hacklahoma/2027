import { useEffect } from 'react';

// Moves every [data-speed] element by (distance from viewport centre × speed).
// Positive speeds lag behind the scroll (far away), negative ones rush past (close).
// data-anchor="end" measures from the element's bottom instead of its centre,
// so tall layers line up exactly at the horizon.
export default function useParallax(deps) {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let items = [];
    let raf = 0;

    const update = () => {
      raf = 0;
      const c = scrollY + innerHeight / 2;
      for (const p of items) p.el.style.translate = `0 ${((c - p.anchor) * p.speed).toFixed(1)}px`;
    };

    const measure = () => {
      const els = [...document.querySelectorAll('[data-speed]')];
      els.forEach((el) => (el.style.translate = ''));
      const sy = scrollY;
      const vh = innerHeight;
      items = els
        .map((el) => {
          const r = el.getBoundingClientRect();
          const speed = parseFloat(el.dataset.speed);
          const anchor = el.dataset.anchor === 'end' ? r.bottom + sy - vh / 2 : r.top + sy + r.height / 2;
          return { el, speed, anchor };
        })
        .filter((p) => p.speed);
      update();
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    measure();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
