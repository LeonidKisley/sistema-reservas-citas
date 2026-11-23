import { useId } from 'react';

export default function BrandLogo({ inverse = false, showText = true, showTagline = true, size = 'md' }) {
  const rawId = useId();
  const gradientId = `auraia-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const glowId = `auraia-glow-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <span className={`brand-logo brand-logo--${size} ${inverse ? 'brand-logo--inverse' : ''}`}>
      <svg className="brand-logo__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="8" y1="4" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor={inverse ? '#F6DCDD' : '#D98493'} />
            <stop offset="0.55" stopColor={inverse ? '#E5A4A6' : '#C86D7E'} />
            <stop offset="1" stopColor={inverse ? '#C86D7E' : '#A84E60'} />
          </linearGradient>
          <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="translate(24 24) rotate(90) scale(23)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5EDE8" stopOpacity={inverse ? '0.22' : '0.85'} />
            <stop offset="1" stopColor="#F5EDE8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="23" fill={`url(#${glowId})`} />
        <path d="M24 6.5c4.1 5.7 6.2 10.8 0 19.1-6.2-8.3-4.1-13.4 0-19.1Z" fill={`url(#${gradientId})`} />
        <path d="M21.4 25.6C14 23.7 9.2 18.7 8.8 11.8c7.4.7 12.4 5.4 12.6 13.8Z" fill={`url(#${gradientId})`} opacity="0.92" />
        <path d="M26.6 25.6c7.4-1.9 12.2-6.9 12.6-13.8-7.4.7-12.4 5.4-12.6 13.8Z" fill={`url(#${gradientId})`} opacity="0.92" />
        <path d="M20.7 28.1c-8.4.1-13.9-3.7-16.2-9.3 8.1-1.2 14.4 1.9 16.2 9.3Z" fill={`url(#${gradientId})`} opacity="0.75" />
        <path d="M27.3 28.1c8.4.1 13.9-3.7 16.2-9.3-8.1-1.2-14.4 1.9-16.2 9.3Z" fill={`url(#${gradientId})`} opacity="0.75" />
        <path d="M6.6 30.4c4.5 6.5 10.1 9.9 17.4 9.9s12.9-3.4 17.4-9.9c-5.7 3.4-11.1 5-17.4 5s-11.7-1.6-17.4-5Z" fill={`url(#${gradientId})`} />
        <path d="M37.5 5.5c.5 2.1 1.4 3 3.5 3.5-2.1.5-3 1.4-3.5 3.5-.5-2.1-1.4-3-3.5-3.5 2.1-.5 3-1.4 3.5-3.5Z" fill="#E8BFA6" />
      </svg>
      {showText && (
        <span className="brand-logo__text">
          <span className="brand-logo__name">Auraia</span>
          {showTagline && <span className="brand-logo__tagline">Beauty &amp; Spa Management</span>}
        </span>
      )}
    </span>
  );
}
