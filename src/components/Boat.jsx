import { forwardRef } from 'react';

// A small rowboat on the horizon. The river of light rises from its lantern.
const Boat = forwardRef(function Boat(_, lanternRef) {
  return (
    <div className="boat" aria-hidden="true">
      <div className="boat-bob">
        <span className="boat-lantern" ref={lanternRef} />
        <svg viewBox="0 0 240 130" filter="url(#hk-wobble)">
          {/* pole + lantern */}
          <path d="M158 92 L156 44 Q156 36 164 34" fill="none" stroke="#10172E" strokeWidth="3" strokeLinecap="round" />
          <path d="M156 36 C155 28 173 28 172 36 C171 46 169 52 167 56 L161 56 C159 52 157 46 156 36 Z" fill="url(#hk-mini)" />
          {/* rower */}
          <path d="M84 90 C82 72 86 62 96 60 C106 62 108 74 106 90 Z" fill="#10172E" />
          <circle cx="96" cy="52" r="8" fill="#10172E" />
          <path d="M100 74 L136 100" stroke="#10172E" strokeWidth="3" strokeLinecap="round" />
          {/* hull */}
          <path d="M14 86 Q120 102 226 82 L210 104 Q120 122 34 106 Z" fill="#0E1530" />
          <path d="M14 86 Q120 102 226 82" fill="none" stroke="#F49A3C" strokeWidth="2" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
});

export default Boat;
