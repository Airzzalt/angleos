import { cn } from "@/lib/cn";
import { stagger } from "@/lib/fx";

/* Chunky pill bar chart (hover or keyboard-focus a bar to see its value). Pure CSS motion. */
const barLooks = [
  "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-2)_55%,white),var(--accent-2))]",
  "bg-[linear-gradient(180deg,var(--accent-2),color-mix(in_srgb,var(--accent-2)_60%,black))]",
  "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_70%,white),var(--accent))]",
  "bar-striped",
  "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-2)_40%,white),color-mix(in_srgb,var(--accent-2)_80%,white))]",
  "bg-surface-3",
];

export function WeekChart({ data }: { data: { day: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex h-[210px] items-end gap-2.5 sm:gap-4" role="list" aria-label="Scripts written per day, sample data">
      {data.map((d, i) => (
        <div key={d.day} role="listitem" className="group/bar flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <div className="relative flex w-full flex-1 items-end justify-center">
            <span
              className={cn(
                "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-fg px-2.5 py-1 text-[11px] font-semibold text-bg",
                "translate-y-1 opacity-0 transition-[opacity,transform] duration-200 ease-out",
                "group-hover/bar:translate-y-0 group-hover/bar:opacity-100 group-focus-within/bar:translate-y-0 group-focus-within/bar:opacity-100",
              )}
              style={{ bottom: `calc(${(d.value / max) * 100}% + 8px)` }}
            >
              {d.value} scripts
            </span>
            <button
              type="button"
              aria-label={`${d.day}: ${d.value} scripts`}
              className={cn(
                "bar-grow w-full max-w-[56px] rounded-full transition-[filter,transform] duration-300 ease-out",
                "hover:brightness-125 hover:scale-x-[1.06] focus-visible:brightness-125",
                barLooks[i % barLooks.length],
              )}
              style={{ ...stagger(i), height: `${Math.max(14, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

/* Donut ring: each segment draws itself in. */
export function Donut({
  parts,
  centerTop,
  centerBottom,
}: {
  parts: { label: string; value: number; color: string }[];
  centerTop: string;
  centerBottom: string;
}) {
  const r = 62;
  const C = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + p.value, 0);
  const gap = 7;
  let acc = 0;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[168px] w-[168px]">
        <svg viewBox="0 0 168 168" className="h-full w-full -rotate-90" role="img" aria-label="Format mix, sample data">
          <circle cx="84" cy="84" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="20" />
          {parts.map((p, i) => {
            const len = (p.value / total) * C;
            const seg = (
              <circle
                key={p.label}
                cx="84"
                cy="84"
                r={r}
                fill="none"
                stroke={p.color}
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
                strokeDashoffset={-acc}
                className="seg-in"
                style={{ ...stagger(i), ["--C" as string]: C } as React.CSSProperties}
              />
            );
            acc += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[26px] font-semibold leading-none tracking-tight">{centerTop}</span>
          <span className="mt-1 text-xs text-muted">{centerBottom}</span>
        </div>
      </div>
      <ul className="mt-5 w-full space-y-2.5">
        {parts.map((p, i) => (
          <li key={p.label} className="reveal flex items-center gap-3 text-sm" style={stagger(i + 5)}>
            <span className="h-3 w-3 shrink-0 rounded-[5px]" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate text-muted">{p.label}</span>
            <span className="font-semibold tabular-nums">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Half-circle gauge. `percent` is 0 to 100. Children sit in the middle. */
export function Gauge({ percent, children }: { percent: number; children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[128px] w-[220px]">
      <svg viewBox="0 0 220 128" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--accent-3)" />
            <stop offset="1" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <path d="M 22 112 A 88 88 0 0 1 198 112" fill="none" stroke="var(--surface-2)" strokeWidth="18" strokeLinecap="round" />
        <path
          d="M 22 112 A 88 88 0 0 1 198 112"
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="18"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - percent}
          className="gauge-in"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">{children}</div>
    </div>
  );
}

/* Tiny score ring used in project rows. `score` is 0 to 10. */
export function ScoreRing({ score }: { score: number }) {
  const r = 15;
  const C = 2 * Math.PI * r;
  const tone = score >= 7 ? "var(--success)" : score >= 5 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="relative h-10 w-10 shrink-0" title={`Context score ${score.toFixed(1)} out of 10`}>
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(score / 10) * C} ${C}`}
          className="seg-in"
          style={{ ["--C" as string]: C } as React.CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {score.toFixed(1)}
      </span>
    </div>
  );
}
