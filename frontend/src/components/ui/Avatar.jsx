export function initialsOf(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'A';
}

export default function Avatar({ name = '', size = 'md', tone = 'rose' }) {
  return (
    <span className={`avatar avatar--${size} avatar--${tone}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
