// Reveals below the hero: any [data-reveal] element gets `.in` the first time it scrolls into view.
// CSS decides what that means (headings rise line by line, smaller text settles in after them).

export const reduceMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mark [data-reveal] elements `.in` once they enter the view. Returns a cleanup. */
export function observeReveals(root = document) {
  const els = root.querySelectorAll('[data-reveal]:not(.in)');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -14% 0px', threshold: 0 },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
