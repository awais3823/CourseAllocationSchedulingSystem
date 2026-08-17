import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import './ScheduliXLogo.css';

/**
 * ScheduliX wordmark + mark. Matches app tokens: --primary #0B3C5D, hero teal accents.
 * @param {'onDark' | 'onLight'} theme - Navbar/landing (onDark) vs auth card (onLight)
 * @param {'default' | 'compact' | 'hero'} size
 * @param {string} [to] - if set, wraps in react-router <Link>
 * @param {string} className
 */
const ScheduliXLogo = ({
  theme = 'onDark',
  size = 'default',
  to,
  className = '',
  hideWordmark = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const gradId = `sx-grad-${uid}`;
  const isDark = theme === 'onDark';

  const mark = (
    <svg
      className="schedulix-logo__svg"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#1a7aad' : '#0B3C5D'} />
          <stop offset="1" stopColor={isDark ? '#38bdf8' : '#0d5a82'} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="9" fill={`url(#${gradId})`} />
      <path
        d="M11 14h18M11 20h18M11 26h12"
        stroke={isDark ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.92)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M26 24l6 6"
        stroke={isDark ? '#a5f3fc' : '#99f6e4'}
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="28" cy="22" r="3" fill={isDark ? '#a5f3fc' : '#ccfbf1'} fillOpacity="0.95" />
    </svg>
  );

  const wordmark = (
    <span className="schedulix-logo__text">
      <span className="schedulix-logo__scheduli">Scheduli</span>
      <span className={`schedulix-logo__x schedulix-logo__x--${theme}`}>X</span>
    </span>
  );

  const inner = (
    <>
      <span className="schedulix-logo__mark">{mark}</span>
      {!hideWordmark && wordmark}
    </>
  );

  const classes = [
    'schedulix-logo',
    `schedulix-logo--${theme}`,
    `schedulix-logo--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} aria-label="ScheduliX home">
        {inner}
      </Link>
    );
  }

  return (
    <span className={classes} role="img" aria-label="ScheduliX">
      {inner}
    </span>
  );
};

export default ScheduliXLogo;
