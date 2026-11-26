import { useEffect, useState } from 'react';
import { ArrowUpRight } from './ArrowUpRight.jsx';

export default function Nav() {
  const [solid, setSolid] = useState(false);

  // a backing appears once you've scrolled most of the way past the hero
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav${solid ? ' solid' : ''}`}>
      <a className="wordmark rise" style={{ '--d': '.9s' }} href="#top">hacklahoma</a>
      <div className="nav-right">
        <ul className="rise" style={{ '--d': '1.1s' }}>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        {/* TODO: point at the new registration flow once it's settled */}
        <a className="btn-sm rise" style={{ '--d': '1.2s' }} href="#register">Register <ArrowUpRight size={11} /></a>
      </div>
      {/* MLH 2027 season member badge, required top right; "gray" is MLH's navy */}
      <a
        id="mlh-trust-badge"
        className="mlh-badge rise"
        style={{ '--d': '1.3s' }}
        href="https://www.mlh.com/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2027-season&utm_content=gray"
        target="_blank"
        rel="noopener"
      >
        <img
          src="https://logged-assets.s3.amazonaws.com/trust-badge/2027/mlh-trust-badge-2027-gray.svg"
          alt="Major League Hacking 2027 Hackathon Season"
        />
      </a>
    </header>
  );
}
