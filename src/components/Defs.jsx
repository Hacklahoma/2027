// Shared SVG filters and gradients. Rendered once, referenced by id everywhere.
export default function Defs() {
  return (
    <svg className="defs" aria-hidden="true" focusable="false">
      <defs>
        {/* wobbly, hand-cut edges */}
        <filter id="hk-wobble" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="4" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* keeps only a scatter of dots from whatever it is applied to */}
        <filter id="hk-speckle" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="9" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  16 0 0 0 -10" result="dots" />
          <feComposite in="SourceGraphic" in2="dots" operator="in" />
        </filter>

        {/* printed ink: slightly rough edges with tiny dropouts */}
        <filter id="hk-ink" x="-2%" y="-10%" width="104%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="2" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="3" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="11" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -40 0 0 0 29" result="holes" />
          <feComposite in="d" in2="holes" operator="in" />
        </filter>

        <radialGradient id="hk-mini" cx="50%" cy="78%" r="80%">
          <stop offset="0" stopColor="#FFF6D8" />
          <stop offset="0.35" stopColor="#FFD263" />
          <stop offset="0.75" stopColor="#F4913A" />
          <stop offset="1" stopColor="#C4532A" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export const LANTERN_BODY =
  'M58 92 C52 46 120 26 200 26 C280 26 348 46 342 92 C338 230 318 372 292 474 L108 474 C82 372 62 230 58 92 Z';
