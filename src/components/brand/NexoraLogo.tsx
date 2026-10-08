import React from 'react';

interface NexoraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  glow?: boolean;
}

export const NexoraLogo: React.FC<NexoraLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  className = '',
  glow = true,
}) => {
  const sizeMap = {
    xs: { box: 24, font: 'text-sm', sub: 'text-[9px]' },
    sm: { box: 32, font: 'text-base', sub: 'text-[10px]' },
    md: { box: 42, font: 'text-xl', sub: 'text-[11px]' },
    lg: { box: 56, font: 'text-2xl', sub: 'text-xs' },
    xl: { box: 76, font: 'text-3xl', sub: 'text-sm' },
    '2xl': { box: 96, font: 'text-4xl', sub: 'text-base' },
  };

  const current = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Exact Neural N Logo Symbol from image.png */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden bg-black border border-emerald-500/20"
        style={{
          width: current.box,
          height: current.box,
          boxShadow: glow
            ? '0 0 20px -3px rgba(0, 255, 163, 0.4), inset 0 0 12px rgba(0, 255, 163, 0.1)'
            : 'none',
        }}
      >
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full p-1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id={`neon-glow-${size}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Triangulated Neural Network Webbing */}
          <g
            stroke="#00ffa3"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={glow ? `url(#neon-glow-${size})` : undefined}
          >
            {/* Outer Left Stem */}
            <line x1="215" y1="220" x2="215" y2="500" />
            <line x1="215" y1="500" x2="215" y2="785" />
            <line x1="215" y1="220" x2="340" y2="220" />
            <line x1="340" y1="220" x2="450" y2="325" />
            <line x1="215" y1="785" x2="295" y2="615" />
            <line x1="295" y1="615" x2="380" y2="615" />

            {/* Left Inner Web */}
            <line x1="215" y1="220" x2="295" y2="425" />
            <line x1="215" y1="220" x2="380" y2="375" />
            <line x1="215" y1="500" x2="295" y2="425" />
            <line x1="215" y1="500" x2="295" y2="575" />
            <line x1="215" y1="785" x2="295" y2="575" />
            <line x1="295" y1="425" x2="380" y2="375" />
            <line x1="295" y1="425" x2="380" y2="495" />
            <line x1="295" y1="575" x2="380" y2="495" />
            <line x1="295" y1="575" x2="380" y2="615" />
            <line x1="380" y1="495" x2="380" y2="615" />

            {/* Center Slanted Crossbars */}
            <line x1="380" y1="375" x2="450" y2="325" />
            <line x1="380" y1="375" x2="505" y2="495" />
            <line x1="380" y1="495" x2="505" y2="495" />
            <line x1="380" y1="615" x2="505" y2="495" />
            <line x1="380" y1="615" x2="550" y2="670" />

            <line x1="450" y1="325" x2="505" y2="495" />
            <line x1="450" y1="325" x2="620" y2="495" />
            <line x1="505" y1="495" x2="620" y2="495" />
            <line x1="505" y1="495" x2="550" y2="670" />
            <line x1="505" y1="495" x2="620" y2="615" />

            {/* Right Diagonal & Stem */}
            <line x1="550" y1="670" x2="620" y2="615" />
            <line x1="550" y1="670" x2="650" y2="785" />
            <line x1="550" y1="670" x2="705" y2="575" />
            <line x1="650" y1="785" x2="785" y2="785" />
            <line x1="650" y1="785" x2="705" y2="575" />
            <line x1="620" y1="615" x2="620" y2="495" />
            <line x1="620" y1="615" x2="705" y2="575" />
            <line x1="620" y1="495" x2="615" y2="385" />
            <line x1="620" y1="495" x2="705" y2="425" />
            <line x1="620" y1="495" x2="705" y2="575" />

            {/* Right Outer Stem */}
            <line x1="615" y1="385" x2="785" y2="220" />
            <line x1="615" y1="385" x2="705" y2="425" />
            <line x1="785" y1="220" x2="705" y2="425" />
            <line x1="785" y1="220" x2="785" y2="500" />
            <line x1="705" y1="425" x2="785" y2="500" />
            <line x1="705" y1="425" x2="705" y2="575" />
            <line x1="785" y1="500" x2="705" y2="575" />
            <line x1="785" y1="500" x2="785" y2="785" />
            <line x1="705" y1="575" x2="785" y2="785" />
          </g>

          {/* Node Vertices */}
          <g fill="#00ffa3">
            <circle cx="215" cy="500" r="16" />
            <circle cx="295" cy="425" r="16" />
            <circle cx="295" cy="575" r="16" />
            <circle cx="380" cy="375" r="16" />
            <circle cx="380" cy="495" r="16" />
            <circle cx="450" cy="325" r="16" />
            <circle cx="505" cy="495" r="16" />
            <circle cx="550" cy="670" r="16" />
            <circle cx="620" cy="495" r="16" />
            <circle cx="620" cy="615" r="16" />
            <circle cx="705" cy="425" r="16" />
            <circle cx="705" cy="575" r="16" />
            <circle cx="785" cy="500" r="16" />
          </g>

          {/* Core White Pips */}
          <g fill="#ffffff">
            <circle cx="215" cy="500" r="6" />
            <circle cx="295" cy="425" r="6" />
            <circle cx="295" cy="575" r="6" />
            <circle cx="380" cy="375" r="6" />
            <circle cx="380" cy="495" r="6" />
            <circle cx="450" cy="325" r="6" />
            <circle cx="505" cy="495" r="6" />
            <circle cx="550" cy="670" r="6" />
            <circle cx="620" cy="495" r="6" />
            <circle cx="620" cy="615" r="6" />
            <circle cx="705" cy="425" r="6" />
            <circle cx="705" cy="575" r="6" />
            <circle cx="785" cy="500" r="6" />
          </g>
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-wider text-white font-mono uppercase ${current.font}`}
            >
              NEXORA
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ffa3]" />
          </div>
          {showTagline && (
            <span
              className={`text-emerald-400/90 font-medium tracking-wide mt-0.5 ${current.sub}`}
            >
              One Intelligence. Multiple Minds.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
