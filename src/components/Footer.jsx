import { event, socials } from '../content.js';

export default function Footer() {
  return (
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
  );
}
