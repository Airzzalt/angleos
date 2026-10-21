import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Compass,
  Crosshair,
  FolderOpen,
  FolderPlus,
  PenLine,
  ScanSearch,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { stagger } from "@/lib/fx";
import { sampleProjects, sampleScripts } from "@/lib/placeholder";
import { cn } from "@/lib/cn";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/count-up";
import { Donut, Gauge, ScoreRing, WeekChart } from "@/components/dashboard-widgets";

export const metadata = { title: "Dashboard" };

// Every number below is SAMPLE data until the real features arrive in later phases.
const stats = [
  { label: "Projects", value: 4, delta: "+1 this month", icon: FolderOpen, tone: "bg-fg text-bg" },
  { label: "Scripts this week", value: 11, delta: "+12% vs last week", icon: PenLine, tone: "bg-accent-2/20 text-accent-2" },
  { label: "Angles saved", value: 36, delta: "+8 this week", icon: Compass, tone: "bg-accent/20 text-accent" },
  { label: "Swipe file ads", value: 58, delta: "+5 this week", icon: Bookmark, tone: "bg-accent-3/20 text-accent-3" },
];

const week = [
  { day: "Mon", value: 3 },
  { day: "Tue", value: 5 },
  { day: "Wed", value: 2 },
  { day: "Thu", value: 7 },
  { day: "Fri", value: 4 },
  { day: "Sat", value: 6 },
  { day: "Sun", value: 1 },
];

const formatMix = [
  { label: "UGC video", value: 14, color: "var(--accent-2)" },
  { label: "Skeleton and animated", value: 9, color: "var(--accent)" },
  { label: "VSL and long form", value: 6, color: "var(--accent-3)" },
  { label: "Static ads", value: 9, color: "color-mix(in srgb, var(--fg) 75%, transparent)" },
];

const shortcuts = [
  { href: "/projects", label: "New project", icon: FolderPlus },
  { href: "/angles", label: "Generate angles", icon: Compass },
  { href: "/scripts", label: "Write a script", icon: PenLine },
  { href: "/analyze", label: "Analyze an ad", icon: ScanSearch },
  { href: "/gethooked", label: "Search competitors", icon: Crosshair },
  { href: "/swipe", label: "Open swipe file", icon: Bookmark },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const first = user.name.split(" ")[0];
  const weakest = [...sampleProjects].sort((a, b) => a.score - b.score)[0];

  return (
    <div className="space-y-5">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-gradient text-[34px] font-semibold leading-tight tracking-tight sm:text-[44px]">Hello, {first}!</h1>
            <Badge tone="accent">Preview data</Badge>
          </div>
          <p className="mt-1 text-[16px] text-muted">Here&rsquo;s your weekly overview.</p>
        </div>
        <Link href="/scripts">
          <Button className="h-12 px-6">
            <Sparkles className="h-4 w-4" /> New script
          </Button>
        </Link>
      </div>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={s.label} interactive className="reveal p-5" style={stagger(i + 1)}>
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.tone)}>
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-5 text-[40px] font-semibold leading-none tracking-tight tabular-nums">
              <CountUp value={s.value} />
            </p>
            <p className="mt-1.5 text-sm text-muted">{s.label}</p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3" /> {s.delta}
            </p>
          </Card>
        ))}
      </section>

      {/* Chart + donut */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="reveal lg:col-span-8" style={stagger(5)}>
          <CardHeader title="Output this week" description="Scripts written per day" />
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[170px_1fr]">
            <div className="rounded-2xl bg-surface-2 p-4 sm:self-start">
              <p className="text-[34px] font-semibold leading-none tracking-tight">
                <CountUp value={28} /> <span className="text-lg font-medium text-muted">scripts</span>
              </p>
              <p className="mt-1 text-sm text-muted">written this week</p>
              <p className="mt-3 inline-flex rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">+12% vs last week</p>
            </div>
            <WeekChart data={week} />
          </div>
        </Card>
        <Card className="reveal lg:col-span-4" style={stagger(6)}>
          <CardHeader title="Format mix" description="What you made this month" />
          <div className="p-6">
            <Donut parts={formatMix} centerTop="38" centerBottom="creatives" />
          </div>
        </Card>
      </section>

      {/* Projects, usage gauge, AI insight */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="reveal lg:col-span-5" style={stagger(7)}>
          <CardHeader
            title="Recent projects"
            action={
              <Link href="/projects" className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                View all <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />
          <ul className="mt-2 space-y-1 p-3">
            {sampleProjects.slice(0, 4).map((p) => (
              <li key={p.id}>
                <Link
                  href="/projects"
                  className="group flex min-h-[64px] items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-[background-color,transform] duration-200 hover:bg-surface-2 active:scale-[0.985]"
                >
                  <ScoreRing score={p.score} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {p.niche} · {p.updated}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-muted opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="reveal lg:col-span-3" style={stagger(8)}>
          <CardHeader title="AI usage" description="Estimated spend this month" />
          <div className="px-4 pb-6 pt-5">
            <Gauge percent={36}>
              <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                <CountUp value={14.2} decimals={2} prefix="$" />
              </p>
              <p className="mt-1 text-xs text-muted">of $40 sample budget</p>
            </Gauge>
            <p className="mt-5 text-center text-xs text-muted">Sample numbers</p>
          </div>
        </Card>

        <div className="insight reveal relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-card p-6 text-white shadow-[0_20px_50px_-20px_#6a5cf0] lg:col-span-4" style={stagger(9)}>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" /> AI insight
          </span>
          <div className="my-5 max-w-[320px] rounded-[22px] rounded-bl-md bg-white p-4 text-[15px] leading-snug text-[#16161a] shadow-lg">
            <strong>{weakest.name}</strong> has a context score of {weakest.score.toFixed(1)}/10. Adding real customer
            reviews would give you sharper angles.
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/projects"
              className="inline-flex h-11 items-center rounded-full bg-white px-5 text-[15px] font-medium text-[#16161a] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
            >
              Open project
            </Link>
            <Link
              href="/projects"
              className="inline-flex h-11 items-center rounded-full bg-black/25 px-5 text-[15px] font-medium text-white backdrop-blur-md transition-[transform,background-color] duration-200 hover:bg-black/35 active:scale-[0.96]"
            >
              All projects
            </Link>
          </div>
        </div>
      </section>

      {/* Scripts + shortcuts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="reveal lg:col-span-7" style={stagger(10)}>
          <CardHeader title="Recent scripts" />
          <ul className="mt-2 space-y-1 p-3">
            {sampleScripts.map((s) => (
              <li key={s.id} className="flex min-h-[60px] items-center gap-4 rounded-2xl px-3 py-2.5 transition-colors duration-200 hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {s.project} · {s.when}
                  </span>
                </span>
                <Badge>{s.format}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="reveal lg:col-span-5" style={stagger(11)}>
          <CardHeader title="Shortcuts" />
          <div className="grid grid-cols-2 gap-2.5 p-4 pt-5">
            {shortcuts.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group flex min-h-[88px] flex-col justify-between rounded-2xl bg-surface-2 p-3.5 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-surface-3 active:scale-[0.97]"
              >
                <span className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <s.icon className="h-[18px] w-[18px]" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
                <span className="mt-3 text-sm font-medium leading-tight">{s.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <p className="pt-4 text-center text-xs text-muted">
        Previewing screen states:{" "}
        <Link href="/projects?state=empty" className="text-accent hover:underline">empty</Link>
        {" · "}
        <Link href="/projects?state=loading" className="text-accent hover:underline">loading</Link>
        {" · "}all numbers on this page are sample data.
      </p>
    </div>
  );
}
