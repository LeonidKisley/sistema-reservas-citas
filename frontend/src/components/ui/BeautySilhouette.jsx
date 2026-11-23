import { useId } from 'react';

export default function BeautySilhouette({ className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bodyId = `silhouette-body-${uid}`;
  const hairId = `silhouette-hair-${uid}`;

  return (
    <svg
      className={`beauty-silhouette ${className}`.trim()}
      viewBox="0 0 280 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={bodyId} x1="48" y1="30" x2="224" y2="378" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7E6E4" />
          <stop offset="0.55" stopColor="#E7BFC4" />
          <stop offset="1" stopColor="#C26476" />
        </linearGradient>
        <linearGradient id={hairId} x1="100" y1="24" x2="220" y2="310" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A84E60" />
          <stop offset="0.6" stopColor="#6D2433" />
          <stop offset="1" stopColor="#3E1622" />
        </linearGradient>
      </defs>

      <circle cx="150" cy="158" r="120" fill="#FFFFFF" opacity="0.24" />
      <circle cx="150" cy="158" r="119" stroke="#A84E60" strokeOpacity="0.16" strokeWidth="1.5" />

      <path
        d="M128 24C94 24 68 46 64 82c-1 13-6 21-15 30-8 8-8 15 2 19 7 3 11 6 9 12-2 6 3 10 9 13 5 3 4 8-1 12-5 5-1 12 9 16 11 5 23 3 31-4 6-5 10-2 12 12l2 32c0 12-16 20-36 28-28 11-48 32-58 68l-6 58h232l-6-58c-10-36-30-57-58-68-20-8-36-16-36-28l2-32c2-16 8-24 18-34 14-14 22-34 22-58 0-32-16-60-44-68-8-3-16-6-24-8Z"
        fill={`url(#${bodyId})`}
        opacity="0.94"
      />

      <path
        d="M128 24C94 24 68 46 64 82c-1 10-4 16-9 22 4-18 12-30 26-38 12-7 28-10 42-8 26 3 46 20 54 44 8 24 6 52 0 76-6 24-4 48 8 70 8 16 16 36 18 60 2-30-2-56-10-80-8-24-14-46-14-70 0-30 8-58-6-82-6-12-20-21-42-24Z"
        fill={`url(#${hairId})`}
        opacity="0.94"
      />

      <path
        d="M94 66c-12 9-19 21-22 36"
        stroke="#F5EDE8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.42"
      />
      <path
        d="M186 212c8 20 13 42 14 66"
        stroke="#F5EDE8"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.24"
      />

      <g transform="translate(176 56)">
        <g fill="#F7EDE9" opacity="0.95">
          <ellipse cx="0" cy="-11" rx="5" ry="10" />
          <ellipse cx="0" cy="-11" rx="5" ry="10" transform="rotate(72)" />
          <ellipse cx="0" cy="-11" rx="5" ry="10" transform="rotate(144)" />
          <ellipse cx="0" cy="-11" rx="5" ry="10" transform="rotate(216)" />
          <ellipse cx="0" cy="-11" rx="5" ry="10" transform="rotate(288)" />
        </g>
        <circle r="5.5" fill="#C26476" />
        <circle r="2.2" fill="#F7EDE9" />
      </g>

      <g fill="#C26476" opacity="0.38">
        <ellipse cx="44" cy="74" rx="3.2" ry="6" transform="rotate(-28 44 74)" />
        <ellipse cx="58" cy="164" rx="2.6" ry="5" transform="rotate(34 58 164)" />
        <ellipse cx="238" cy="178" rx="3" ry="5.6" transform="rotate(-42 238 178)" />
        <ellipse cx="222" cy="110" rx="2.2" ry="4.4" transform="rotate(22 222 110)" />
      </g>
    </svg>
  );
}
