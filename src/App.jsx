import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Faq from './components/Faq.jsx';
import Footer from './components/Footer.jsx';
import { observeReveals } from './motion/scroll.js';

export default function App() {
  // `ready` starts the load sequence: the night fades up and each line of the hero arrives in turn
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const pageRef = useRef(null);

  // below the hero, headings rise in as you reach them
  useEffect(() => observeReveals(pageRef.current), []);

  return (
    <div className={`site${ready ? ' ready' : ''}`}>
      <Nav />
      <main id="top">
        <Hero onReady={onReady} />
        <div className="page" ref={pageRef}>
          <Faq />
          <Footer />
        </div>
      </main>
    </div>
  );
}
