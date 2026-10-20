import { cn } from "@/lib/cn";

/** AngleOS mark: a glossy rounded square holding an angle (two lines meeting at a point). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 drop-shadow-[0_4px_12px_var(--accent)]", className)} fill="none" aria-hidden>
      <defs>
        <linearGradient id="lm-fill" x1="4" y1="0" x2="28" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5fb0ff" />
          <stop offset="1" stopColor="#6a5cf0" />
        </linearGradient>
        <linearGradient id="lm-shine" x1="16" y1="0" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9.5" fill="url(#lm-fill)" />
      <rect width="32" height="18" rx="9.5" fill="url(#lm-shine)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" stroke="white" strokeOpacity="0.25" />
      <path d="M9 22.5 16 9l7 13.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.2 18h7.6" stroke="white" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">AngleOS</span>
    </div>
  );
}
