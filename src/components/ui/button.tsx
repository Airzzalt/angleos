import { cn } from "@/lib/cn";

const variants = {
  primary:
    "sheen text-white bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_82%,white),var(--accent))] " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_-6px_var(--accent)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_28px_-6px_var(--accent)]",
  secondary:
    "bg-surface-2 text-fg border border-border backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-surface-3 hover:border-border-strong",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
} as const;

const sizes = {
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-4 text-sm",
  icon: "h-11 w-11",
  "icon-sm": "h-9 w-9",
} as const;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-medium",
        "transition-[transform,background-color,box-shadow,filter,color,border-color] duration-200 ease-out",
        "active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
