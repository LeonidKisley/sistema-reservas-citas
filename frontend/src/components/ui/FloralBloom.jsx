const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];
const MID_ANGLES = [30, 90, 150, 210, 270, 330];
const INNER_ANGLES = [0, 72, 144, 216, 288];

export default function FloralBloom({ className = '', blurred = false }) {
  const classes = ['floral-bloom', blurred ? 'floral-bloom--blurred' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={classes}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="floral-bloom__ring" cx="160" cy="160" r="149" />

      <g transform="translate(160 160)">
        <g className="floral-bloom__layer floral-bloom__layer--outer">
          {PETAL_ANGLES.map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <ellipse className="floral-bloom__petal floral-bloom__petal--outer" cx="0" cy="-72" rx="33" ry="66" />
              <path className="floral-bloom__vein" d="M0 -20V-124" />
            </g>
          ))}
        </g>

        <g className="floral-bloom__layer floral-bloom__layer--middle">
          {MID_ANGLES.map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <ellipse className="floral-bloom__petal floral-bloom__petal--middle" cx="0" cy="-52" rx="25" ry="48" />
              <path className="floral-bloom__vein" d="M0 -16V-92" />
            </g>
          ))}
        </g>

        <g className="floral-bloom__layer floral-bloom__layer--inner">
          {INNER_ANGLES.map((angle) => (
            <ellipse
              key={angle}
              className="floral-bloom__petal floral-bloom__petal--inner"
              cx="0"
              cy="-32"
              rx="17"
              ry="32"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>

        <g className="floral-bloom__core">
          <circle className="floral-bloom__core-dot" r="19" />
          <circle className="floral-bloom__core-center" r="12" />
          {PETAL_ANGLES.map((angle) => (
            <circle
              key={angle}
              className="floral-bloom__core-seed"
              cx="0"
              cy="-8"
              r="1.8"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}
