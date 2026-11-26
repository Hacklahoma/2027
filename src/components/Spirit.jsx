import { Lines } from './Lines.jsx';

// "The spirit of Hacklahoma": the first section after the hero (Figma layout).
// A heading on the left, the why on the right, then a rule and three words across the page.
export default function Spirit() {
  return (
    <section className="spirit wrap" id="about">
      <div className="spirit-grid" data-reveal>
        <div>
          <p className="eyebrow fade">The spirit of Hacklahoma</p>
          <Lines lines={['Small sparks.', 'Extraordinary possibilities.']} />
        </div>
        <div className="spirit-copy">
          <p className="fade" style={{ '--d': '.35s' }}>
            A hackathon is more than a place to write code. It’s a place to follow a “what if,” meet someone new, and
            bring an idea to life together.
          </p>
          <p className="fade" style={{ '--d': '.5s' }}>Come curious. Leave with something you’re proud of.</p>
        </div>
      </div>

      <ul className="strip" data-reveal>
        <li className="fade" style={{ '--d': '.5s' }}>Open minds</li>
        <li className="fade" style={{ '--d': '.65s' }}>Shared ideas</li>
        <li className="fade" style={{ '--d': '.8s' }}>Boundless possibility</li>
      </ul>
    </section>
  );
}
