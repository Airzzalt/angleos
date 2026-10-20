import { Crown, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { stagger } from "@/lib/fx";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { AutoRefresh } from "@/components/presence";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

type Row = { id: string; name: string; role: "admin" | "member"; email: string; seconds_ago: number | null };

const LIVE_SECONDS = 150;

function ago(sec: number | null) {
  if (sec === null) return "Hasn't opened it yet";
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}
const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

// Everyone can see this page. It shows names and online status only: no emails, no spending.
export default async function TeamPage() {
  const me = await requireUser();
  const owner = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const { rows } = await query<Row>(
    `select id, name, role, email, extract(epoch from (now() - last_seen_at))::int as seconds_ago
       from users where not disabled
      order by last_seen_at desc nulls last, created_at`,
  );
  const isLive = (r: Row) => r.seconds_ago !== null && r.seconds_ago < LIVE_SECONDS;
  const live = rows.filter(isLive);

  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader preview={false} title="Team" description="Who is on AngleOS right now. This updates by itself." />

      <div className="space-y-5">
        <Card className="reveal" style={stagger(1)}>
          <CardHeader
            title="Live now"
            action={
              <Badge tone={live.length ? "success" : "neutral"}>
                {live.length ? <span className="live-dot h-2 w-2 rounded-full bg-success" /> : null}
                {live.length} online
              </Badge>
            }
          />
          <div className="flex flex-wrap gap-2.5 p-6 pt-5">
            {live.length === 0 ? (
              <p className="text-sm text-muted">Nobody is online at the moment.</p>
            ) : (
              live.map((u) => (
                <span key={u.id} className="pop-in inline-flex items-center gap-2.5 rounded-full bg-surface-2 py-1.5 pl-1.5 pr-4 text-sm">
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-xs font-semibold text-white">
                    {initials(u.name)}
                    <span className="live-dot absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg bg-success" />
                  </span>
                  {u.name}
                  {u.id === me.id && <span className="text-muted">(you)</span>}
                </span>
              ))
            )}
          </div>
        </Card>

        <Card className="reveal" style={stagger(2)}>
          <CardHeader title="Everyone" description={`${rows.length} ${rows.length === 1 ? "person" : "people"} on the team`} />
          <ul className="space-y-1 p-3 pt-4">
            {rows.map((u) => {
              const on = isLive(u);
              return (
                <li key={u.id} className="flex min-h-[64px] items-center gap-4 rounded-2xl px-3 py-2.5 transition-colors duration-200 hover:bg-surface-2">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-sm font-semibold text-white">
                    {initials(u.name)}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg",
                        on ? "live-dot bg-success" : "bg-surface-3",
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{u.name}</span>
                      {u.email.toLowerCase() === owner ? (
                        <Badge tone="warning">
                          <Crown className="h-3 w-3" /> Owner
                        </Badge>
                      ) : u.role === "admin" ? (
                        <Badge tone="accent">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      ) : null}
                      {u.id === me.id && <span className="text-xs font-normal text-muted">(you)</span>}
                    </span>
                    <span className="block text-sm text-muted">{on ? "Online now" : `Last seen: ${ago(u.seconds_ago)}`}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
