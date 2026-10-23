"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, MessageSquare, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { adminNav, bottomNav, isActive, mainNav, screenName, type NavItem } from "@/lib/nav";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat-panel";
import { Heartbeat } from "@/components/presence";

type User = { name: string; email: string; role: "admin" | "member" };

/** A group of links with one glass "pill" that glides to whichever link is active. */
function NavGroup({
  pathname,
  onNavigate,
  sections,
  className,
  startIndex = 0,
}: {
  pathname: string;
  onNavigate: () => void;
  sections: { label?: string; items: NavItem[] }[];
  className?: string;
  startIndex?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ y: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const active = box.current?.querySelector<HTMLElement>('[aria-current="page"]');
    setPill(active ? { y: active.offsetTop, h: active.offsetHeight } : null);
  }, [pathname]);
  // Switch the glide animation on only after the first placement so it doesn't fly in from the top.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  let n = startIndex;
  return (
    <div ref={box} className={cn("relative", className)}>
      {pill && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 left-0 top-0 rounded-2xl bg-accent-soft",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_22px_-8px_var(--accent)]",
            ready && "transition-[transform,height] duration-500 ease-[var(--ease-sheet)]",
          )}
          style={{ transform: `translateY(${pill.y}px)`, height: pill.h }}
        />
      )}
      {sections.map((sec, si) => (
        <div key={si}>
          {sec.label && (
            <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted/80">{sec.label}</p>
          )}
          {sec.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const i = n++;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                style={{ "--i": i } as React.CSSProperties}
                className={cn(
                  "reveal group relative flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium",
                  "transition-[color,background-color,transform] duration-200 active:scale-[0.97]",
                  active ? "text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon
                  className="h-[19px] w-[19px] shrink-0 transition-transform duration-300 ease-out group-hover:scale-110"
                  strokeWidth={active ? 2.2 : 1.9}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Sidebar({ user, pathname, close }: { user: User; pathname: string; close: () => void }) {
  const sections = [{ items: mainNav }, ...(user.role === "admin" ? [{ label: "Admin", items: adminNav }] : [])];
  const count = mainNav.length + (user.role === "admin" ? adminNav.length : 0);
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[68px] shrink-0 items-center justify-between px-5">
        <Logo />
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={close} aria-label="Close menu">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        <NavGroup pathname={pathname} onNavigate={close} sections={sections} />
      </nav>
      <div className="shrink-0 border-t border-border px-3 py-3">
        <NavGroup pathname={pathname} onNavigate={close} sections={[{ items: bottomNav }]} startIndex={count} />
        <div className="reveal mt-2 flex items-center gap-3 rounded-2xl bg-surface-2 p-2.5" style={{ "--i": count + 1 } as React.CSSProperties}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.role === "admin" ? "Admin" : "Member"}</p>
          </div>
          <form action={logoutAction}>
            <Button variant="ghost" size="icon-sm" type="submit" aria-label="Sign out">
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // The top bar slides away when scrolling down (so it never covers content) and returns when scrolling up.
  const [barHidden, setBarHidden] = useState(false);

  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
        setChatOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setChatOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 60) setBarHidden(false);
        else if (y > last + 6) setBarHidden(true);
        else if (y < last - 6) setBarHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setNavOpen(false);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar: a floating glass panel */}
      <aside className="glass fixed bottom-3 left-3 top-3 z-30 hidden w-[256px] rounded-[30px] lg:block">
        <Sidebar user={user} pathname={pathname} close={close} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", navOpen ? "visible" : "invisible delay-300")} aria-hidden={!navOpen}>
        <div
          className={cn(
            "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            navOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={close}
        />
        <aside
          className={cn(
            "glass absolute bottom-2 left-2 top-2 w-[290px] max-w-[86vw] rounded-[30px] transition-transform duration-[380ms] ease-[var(--ease-sheet)]",
            navOpen ? "translate-x-0" : "-translate-x-[110%]",
          )}
        >
          {navOpen && <Sidebar user={user} pathname={pathname} close={close} />}
        </aside>
      </div>

      <div className="lg:pl-[284px]">
        <header
          data-hidden={barHidden}
          className={cn(
            "sticky top-0 z-20 px-3 pt-3 transition-transform duration-[380ms] ease-[var(--ease-sheet)] sm:px-5 lg:px-6",
            barHidden && "-translate-y-[130%]",
          )}
        >
          <div className="glass mx-auto flex h-14 max-w-[1240px] items-center gap-2 rounded-full pl-2 pr-2 sm:pl-3">
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <p className="truncate pl-1 text-[15px] font-semibold tracking-tight lg:hidden">{screenName(pathname)}</p>
            <button
              onClick={() => setChatOpen(true)}
              className="hidden h-9 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surface-2 px-4 text-left text-sm text-muted transition-colors duration-200 hover:bg-surface-3 lg:flex lg:max-w-[460px]"
              aria-label="Search or ask AI"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search or ask AI about {screenName(pathname)}</span>
              <kbd className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-sans text-[11px]">Ctrl K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <Button size="sm" onClick={() => setChatOpen(true)}>
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-[1240px] px-4 pb-14 pt-8 sm:px-6 lg:px-6 lg:pt-10">{children}</main>
      </div>

      <Heartbeat />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} screen={screenName(pathname)} projectId={/^\/projects\/([0-9a-f-]{36})/i.exec(pathname)?.[1] ?? null} />
    </div>
  );
}
