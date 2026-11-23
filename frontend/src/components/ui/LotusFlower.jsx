import { LOTUS_CENTER, LOTUS_PATHS } from './lotusPaths.js';

export default function LotusFlower({ className = '' }) {
  return (
    <svg
      className={`lotus-flower ${className}`.trim()}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {LOTUS_PATHS.map((petal) => (
        <path key={petal.id} d={petal.d} className={petal.className} />
      ))}
      <circle cx={LOTUS_CENTER.cx} cy={LOTUS_CENTER.cy} r={LOTUS_CENTER.r} className="lotus-flower__center" />
    </svg>
  );
}
