/** The brand mark: a 26 px accent square with three linked nodes (design-system §2.1). */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <rect width="26" height="26" rx="7" fill="var(--sd-accent)" />
      <g stroke="var(--sd-on-accent)" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M9 13 L17 8.5 M9 13 L17 17.5" />
      </g>
      <g fill="var(--sd-on-accent)">
        <circle cx="8" cy="13" r="2.6" />
        <circle cx="18" cy="8" r="2.6" />
        <circle cx="18" cy="18" r="2.6" />
      </g>
    </svg>
  );
}
