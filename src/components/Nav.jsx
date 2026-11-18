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
          <li><a href="#about">About</a></li>
          <li><a href="#experience">The Experience</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        {/* TODO: point at the new registration flow once it's settled */}
        <a className="btn-sm rise" style={{ '--d': '1.2s' }} href="#register">Register <ArrowUpRight size={11} /></a>
      </div>
    </header>
  );
}
