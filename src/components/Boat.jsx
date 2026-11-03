import { forwardRef, useEffect, useRef } from 'react';
import { BOAT_BOX, paintBoat } from '../lib/paint.js';

// A rowboat on the horizon with Hacksy aboard. The river of light rises from its lantern.
const Boat = forwardRef(function Boat(_, lanternRef) {
  const box = useRef(null);
  const art = useRef(null);

  useEffect(() => {
    let w = 0;
    const ro = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (!next || next === w) return;
      w = next;
      paintBoat(art.current, w, Math.min(window.devicePixelRatio || 1, 2));
    });
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const { w, h, lantern } = BOAT_BOX;
  return (
    <div className="boat" ref={box}>
      <div className="boat-bob">
        <span
          className="boat-lantern"
          ref={lanternRef}
          style={{ left: `${(lantern.x / w) * 100}%`, top: `${((lantern.y - 11) / h) * 100}%` }}
          aria-hidden="true"
        />
        <canvas ref={art} role="img" aria-label="Hacksy, the Hacklahoma mascot, in a rowboat with a lantern" />
      </div>
    </div>
  );
});

export default Boat;
