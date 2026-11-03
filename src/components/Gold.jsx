import { forwardRef } from 'react';
import { event, socials, sponsorCta, sponsors } from '../content.js';

// Staggered offsets so the windows hang like lit panes in a dark building.
const DRIFT = [0, 70, -30, 40, -50, 20, 60, -20];

const Gold = forwardRef(function Gold(_, ref) {
  return (
    <section className="gold" ref={ref} id="sponsors" aria-labelledby="sponsor-title">
      <div className="gold-reflection" aria-hidden="true">
        <span>{event.name}</span>
      </div>

      <header className="gold-head">
        <p className="label">A reflection</p>
        <h2 id="sponsor-title">
          The people who <em>keep the lights on</em>
        </h2>
        <p>Hacklahoma is free for every hacker because of them.</p>
      </header>

      <ul className="windows">
        {sponsors.map((s, i) => (
          <li
            key={i}
            className={`window window-${s.tier}`}
            style={{ '--drift': `${DRIFT[i % DRIFT.length]}px` }}
            data-speed={((i % 3) - 1) * 0.04}
          >
            <div className="window-pane">
              {s.logo ? <img src={s.logo} alt={s.name} /> : <span>{s.name}</span>}
            </div>
            <p className="window-tier">{s.tier}</p>
          </li>
        ))}
      </ul>

      <p className="gold-cta">
        <a href={sponsorCta.href}>{sponsorCta.label} →</a>
      </p>

      <footer className="footer">
        <p className="footer-mark">{event.name}</p>
        <p className="footer-sub">
          {event.dates} · {event.place}
        </p>
        <ul>
          {socials.map((s) => (
            <li key={s.label}>
              <a href={s.href}>{s.label}</a>
            </li>
          ))}
          <li>
            <a href={`mailto:${event.contact}`}>{event.contact}</a>
          </li>
        </ul>
      </footer>
    </section>
  );
});

export default Gold;
