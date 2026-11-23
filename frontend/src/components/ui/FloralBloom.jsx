const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];
const MID_ANGLES = [30, 90, 150, 210, 270, 330];
const INNER_ANGLES = [0, 72, 144, 216, 288];

export default function FloralBloom({ className = '' }) {
  return (
    <svg
      className={`floral-bloom ${className}`.trim()}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="160" cy="160" r="150" fill="#FFFFFF" opacity="0.18" />
      <circle cx="160" cy="160" r="149" stroke="#C26476" strokeOpacity="0.14" strokeWidth="1.5" />

      <g transform="translate(160 160)">
        <g className="floral-bloom__layer floral-bloom__layer--outer">
          {PETAL_ANGLES.map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <ellipse cx="0" cy="-72" rx="33" ry="66" fill="#EEDFD7" fillOpacity="0.62" stroke="#C26476" strokeOpacity="0.28" />
              <path d="M0 -20V-124" stroke="#A84E60" strokeOpacity="0.16" strokeWidth="1.2" />
            </g>
          ))}
        </g>

        <g className="floral-bloom__layer floral-bloom__layer--middle">
          {MID_ANGLES.map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <ellipse cx="0" cy="-52" rx="25" ry="48" fill="#F5EDE8" fillOpacity="0.82" stroke="#C26476" strokeOpacity="0.34" />
              <path d="M0 -16V-92" stroke="#A84E60" strokeOpacity="0.2" strokeWidth="1.2" />
            </g>
          ))}
        </g>

        <g className="floral-bloom__layer floral-bloom__layer--inner">
          {INNER_ANGLES.map((angle) => (
            <ellipse
              key={angle}
              cx="0"
              cy="-32"
              rx="17"
              ry="32"
              transform={`rotate(${angle})`}
              fill="#E9C4C8"
              fillOpacity="0.78"
              stroke="#A84E60"
              strokeOpacity="0.26"
            />
          ))}
        </g>

        <g className="floral-bloom__core">
          <circle r="19" fill="#C26476" fillOpacity="0.85" />
          <circle r="12" fill="#F7EDE9" fillOpacity="0.7" />
          {PETAL_ANGLES.map((angle) => (
            <circle key={angle} cx="0" cy="-8" r="1.8" fill="#A84E60" transform={`rotate(${angle})`} />
          ))}
        </g>
      </g>
    </svg>
  );
}
