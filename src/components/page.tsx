import { cn } from "@/lib/cn";
import { Badge, Skeleton } from "@/components/ui/card";

export function PageHeader({
  title,
  description,
  actions,
  preview = true,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Shows a small "Preview data" badge while a screen still uses sample content. */
  preview?: boolean;
}) {
  return (
    <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-gradient text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">{title}</h1>
          {preview && <Badge tone="accent">Preview data</Badge>}
        </div>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "reveal flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface px-6 py-16 text-center backdrop-blur-xl",
        className,
      )}
    >
      <span className="float mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-[0_8px_30px_-8px_var(--accent)]">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-[17px] font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass-card rounded-card p-6 reveal" style={{ ["--i" as string]: i } as React.CSSProperties}>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** For screens that list things: ?state=empty or ?state=loading previews those states. */
export type PreviewState = "empty" | "loading" | undefined;
export function previewState(sp: { state?: string | string[] } | undefined): PreviewState {
  const s = Array.isArray(sp?.state) ? sp?.state[0] : sp?.state;
  return s === "empty" || s === "loading" ? s : undefined;
}
