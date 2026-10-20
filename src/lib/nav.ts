import {
  Bookmark,
  Clapperboard,
  Compass,
  Crosshair,
  FolderOpen,
  ImageIcon,
  LayoutDashboard,
  Library,
  PenLine,
  ScanSearch,
  ScrollText,
  Settings,
  Ticket,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; hint?: string };

export const mainNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/angles", label: "Angle Generator", icon: Compass },
  { href: "/scripts", label: "Script Writer", icon: PenLine },
  { href: "/studio", label: "Animated Ad Studio", icon: Clapperboard },
  { href: "/static", label: "Static Ad Builder", icon: ImageIcon },
  { href: "/analyze", label: "Analyze Ad", icon: ScanSearch },
  { href: "/swipe", label: "Swipe File", icon: Bookmark },
  { href: "/gethooked", label: "Get Hooked Search", icon: Crosshair },
];

export const bottomNav: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

export const adminNav: NavItem[] = [
  { href: "/admin/knowledge-base", label: "Knowledge Base", icon: Library },
  { href: "/admin/prompts", label: "Prompts", icon: ScrollText },
  { href: "/admin/invites", label: "Invites", icon: Ticket },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function screenName(pathname: string): string {
  const all = [...mainNav, ...bottomNav, ...adminNav];
  const match = all.filter((n) => isActive(pathname, n.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "AngleOS";
}
