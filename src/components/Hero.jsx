import { useEffect, useRef } from 'react';
import personUrl from '../assets/person.webp';
import { ArrowUpRight } from './ArrowUpRight.jsx';

/**
 * The hero: a live scene (sky, water, fleet, painted person) with the headline over the sky.
 * The text renders immediately; the 3D scene loads in its own chunk and fades up behind it.
 * `onReady` fires when the scene is up (or has failed), to start the load sequence.
 */
// Every face the hero uses, loaded before the reveal (but never waited on for more than 2.5s).
const HERO_FONTS = [
  '400 16px "DM Sans"', '500 16px "DM Sans"', '400 12px "DM Mono"',
  '500 64px "Cormorant Garamond"', 'italic 400 24px "Cormorant Garamond"',
];
const fontsReady = () => {
  if (!document.fonts?.load) return Promise.resolve();
  const all = Promise.all(HERO_FONTS.map((f) => document.fonts.load(f))).catch(() => {});
  return Promise.race([all, new Promise((r) => setTimeout(r, 2500))]);
};

export default function Hero({ onReady }) {
  const sceneRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene = null;
    let cancelled = false;
    // never leave the page dark, even if the scene is slow or WebGL is missing
    const fallback = setTimeout(onReady, 10000);   // only if something has gone wrong; the scene's own cap is 8s

    import('../scene/heroScene.js')
      .then(({ createHeroScene }) => {
        if (cancelled || !sceneRef.current) return;
        scene = createHeroScene(sceneRef.current, { reduce, personUrl });
        // reveal once the scene is warmed up (compiled and drawing) and the fonts are in, not before:
        // Safari keeps text invisible until its font arrives, so a font landing after a line's fade had
        // played made that line pop in instead of fading
        Promise.all([scene.ready, fontsReady()]).then(() => { if (!cancelled) onReady(); });
      })
      .catch((err) => {
        console.warn('Hero scene unavailable, showing the plain night background.', err);
        onReady();
      });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      scene?.dispose();
    };
  }, [onReady]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="scene" ref={sceneRef} aria-hidden="true" />
      <div className="veil" />
      <div className="night">
        {/* a quiet spark that only appears if getting ready takes more than a moment */}
        <span className="night-spark" aria-hidden="true" />
      </div>

      <div className="copy">
        <p className="eyebrow rise" style={{ '--d': '.7s' }}>
          February 6–7, 2027<span>/</span>University of Oklahoma
        </p>
        <p className="kicker rise" style={{ '--d': '1.05s' }}>Every great idea starts with a spark.</p>
        <h1 id="hero-title" className="rise" style={{ '--d': '1.35s' }}>
          <span className="moon">
            <span className="halo wide" aria-hidden="true">Hacklahoma</span>
            <span className="halo" aria-hidden="true">Hacklahoma</span>
            <span className="face">Hacklahoma</span>
          </span>
        </h1>
        <p className="sub rise" style={{ '--d': '2s' }}>
          Let your curiosity set sail. A student hackathon for big ideas, new connections, and the things you
          haven't imagined yet.
        </p>
        {/* TODO: point at the event-updates signup once it exists */}
        <a className="cta rise" style={{ '--d': '2.4s' }} href="#updates">
          Get event updates <ArrowUpRight size={12} />
        </a>
        <p className="fine rise" style={{ '--d': '2.75s' }}>First-time hackers. Seasoned makers. Everyone aboard.</p>
      </div>

      <p className="corner l rise" style={{ '--d': '3.2s' }}>01 / Where worlds meet</p>
      <a className="corner r rise" style={{ '--d': '3.4s' }} href="#about">
        Scroll to explore <i aria-hidden="true" />
      </a>
    </section>
  );
}
