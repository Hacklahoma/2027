import { useEffect, useRef, useState } from 'react';
import { event, pastYears, socials, team } from '../content.js';

export default function Menu() {
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('is-locked');
    panel.current?.querySelector('a')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('is-locked');
      button.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        className={`kebab${open ? ' is-open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <i />
        <i />
        <i />
      </button>

      <nav
        id="site-menu"
        ref={panel}
        className={`menu${open ? ' is-open' : ''}`}
        aria-label="Hacklahoma"
        aria-hidden={!open}
        inert={open ? undefined : ''}
      >
        <div className="menu-inner">
          <section>
            <p className="label">Lights we’ve lit before</p>
            <ul className="menu-years">
              {pastYears.map((y) => (
                <li key={y.year}>
                  <a href={y.href}>{y.year}</a>
                </li>
              ))}
            </ul>
          </section>
          <section className="menu-side">
            <p className="label">The people</p>
            <a className="menu-big" href={team.href}>
              {team.label} →
            </a>
            <p className="label">This year</p>
            <a className="menu-big" href={event.apply.href}>
              {event.apply.label} →
            </a>
            <ul className="menu-small">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href}>{s.label}</a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </nav>
    </>
  );
}
