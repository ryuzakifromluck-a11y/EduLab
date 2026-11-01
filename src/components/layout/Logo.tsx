export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path
        d="M12.5 7h7M14 7v7l-5.2 9.2A1.9 1.9 0 0 0 10.4 26h11.2a1.9 1.9 0 0 0 1.6-2.8L18 14V7"
        fill="none"
        stroke="var(--surface)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14.2" cy="21.4" r="1.4" fill="var(--surface)" />
      <circle cx="18.4" cy="19.2" r="1" fill="var(--surface)" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-ink">
        Edu<span className="text-brand">Lab</span>
      </span>
    </span>
  )
}
