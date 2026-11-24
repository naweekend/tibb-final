import React from 'react';

interface TibbGlobeProps {
  size?: 'sm' | 'lg';
  activePulse?: boolean;
}

/**
 * Sculptural botanical cream, rose-sand, and sage-forest Tibb globe emblem.
 */
export const TibbGlobe: React.FC<TibbGlobeProps> = ({ size = 'lg', activePulse = false }) => {
  const dim = size === 'sm' ? 'w-14 h-14' : 'w-52 h-52 sm:w-60 sm:h-60';
  return (
    <div className={`relative flex items-center justify-center ${dim} select-none`} aria-hidden="true">
      <svg viewBox="0 0 260 260" className="w-full h-full drop-shadow-[0_18px_36px_rgba(15,31,28,0.28)]">
        <defs>
          <radialGradient id="tibbBotanicalGlobe" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#F6F4EC" />
            <stop offset="32%" stopColor="#D7E6DC" />
            <stop offset="68%" stopColor="#7BB88D" />
            <stop offset="100%" stopColor="#1E4B3E" />
          </radialGradient>
          <radialGradient id="tibbCreamHighlight" cx="28%" cy="26%" r="48%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx="130"
          cy="130"
          r="120"
          fill="#7BB88D"
          opacity={activePulse ? '0.24' : '0.14'}
          className={activePulse ? 'transition-opacity duration-500' : ''}
        />

        <circle cx="130" cy="130" r="98" fill="url(#tibbBotanicalGlobe)" />
        <circle cx="130" cy="130" r="98" fill="url(#tibbCreamHighlight)" />

        <g stroke="#F6F4EC" strokeOpacity="0.52" strokeWidth="1.25" fill="none">
          <ellipse cx="130" cy="130" rx="44" ry="96" />
          <ellipse cx="130" cy="130" rx="78" ry="96" />
          <ellipse cx="130" cy="130" rx="96" ry="34" />
          <line x1="32" y1="130" x2="228" y2="130" />
        </g>

        <circle
          cx="130"
          cy="130"
          r="110"
          stroke="#7BB88D"
          strokeOpacity="0.35"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
};
