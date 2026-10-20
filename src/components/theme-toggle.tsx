"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("angleos-theme", next);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  }
  // Both icons are always in the page; CSS cross-fades and rotates between them.
  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Switch between dark and light mode" className={className}>
      <span className="relative block h-[18px] w-[18px]">
        <Sun className="absolute inset-0 h-[18px] w-[18px] transition-[transform,opacity] duration-300 ease-out [[data-theme=dark]_&]:rotate-0 [[data-theme=dark]_&]:opacity-100 [[data-theme=light]_&]:-rotate-90 [[data-theme=light]_&]:scale-50 [[data-theme=light]_&]:opacity-0" />
        <Moon className="absolute inset-0 h-[18px] w-[18px] transition-[transform,opacity] duration-300 ease-out [[data-theme=light]_&]:rotate-0 [[data-theme=light]_&]:opacity-100 [[data-theme=dark]_&]:rotate-90 [[data-theme=dark]_&]:scale-50 [[data-theme=dark]_&]:opacity-0" />
      </span>
    </Button>
  );
}
