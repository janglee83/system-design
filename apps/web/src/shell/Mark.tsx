export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="text-accent">
      <path d="M6 6 L14 10 L6 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="2" y="3" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="12" y="7" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="2" y="11" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
