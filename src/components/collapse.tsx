"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** A box that opens and closes when you press its title. Plain button, so it works the same on phone and desktop. */
export function Collapse({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="pt-2">{children}</div>}
    </div>
  );
}
