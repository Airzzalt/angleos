import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 text-[15px] text-fg placeholder:text-muted/70 " +
  "shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-border-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/20 " +
  "disabled:opacity-50";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[13px] font-medium text-muted", className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-28 py-3", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "h-12 appearance-none pr-10", className)} {...props} />;
}
