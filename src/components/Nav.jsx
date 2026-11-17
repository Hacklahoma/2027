import { useEffect, useRef, useState } from 'react';
import { event, navLinks } from '../content.js';

// The Lantern Rail: a slim strip along the top of the sky. Transparent and tall at the
// top, then it condenses onto a frosted night-blue band with a gold reading-progress line.
// On small screens the links are hidden and only the logo and Register remain.
export default function Nav() {
  const rail = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      // reads first, writes after, so scrolling never forces a layout
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const next = y > 80;
      rail.current?.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
      document.documentElement.dataset.scrolled = String(next);
      setScrolled(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="rail" ref={rail} data-scrolled={scrolled}>
      <div className="rail-glass" aria-hidden="true" />
      <nav className="rail-bar" aria-label="Primary">
        <a className="rail-brand" href="#top" aria-label="Hacklahoma, back to top">
          <span className="rail-logo" aria-hidden="true" />
        </a>
        <ul className="rail-links">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
        <a className="rail-register" href={event.apply.href}>
          {event.apply.label} <span aria-hidden="true">→</span>
        </a>
      </nav>
      <div className="rail-progress" aria-hidden="true">
        <span />
      </div>
    </header>
  );
}
