import { Crown, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { aud, limitState } from "@/lib/usage-limit";
import { stagger } from "@/lib/fx";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LimitForm } from "@/components/limit-form";
import { ResetCodeButton } from "@/components/reset-code-button";
import { AutoRefresh } from "@/components/presence";
import { setDisabledAction, setRoleAction } from "./actions";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  disabled: boolean;
  created_at: string;
  last_seen_at: string | null;
  seconds_ago: number | null;
  limit_cents: number | null;
  spent_cents: string | null;
};

const LIVE_SECONDS = 150; // seen in the last 2.5 minutes counts as "live"

function ago(sec: number | null) {
  if (sec === null) return "Never opened";
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

export default async function UsersPage() {
  const me = await requireAdmin();
  const owner = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const { rows } = await query<Row>(
    `select u.id, u.name, u.email, u.role, u.disabled, u.created_at, u.last_seen_at,
            extract(epoch from (now() - u.last_seen_at))::int as seconds_ago,
            u.usage_limit_cents as limit_cents,
            (select coalesce(sum(est_cost), 0) * 100 from usage_log where user_id = u.id) as spent_cents
       from users u
      order by (u.role = 'admin') desc, u.last_seen_at desc nulls last, u.created_at`,
  );
  const live = rows.filter((r) => !r.disabled && r.seconds_ago !== null && r.seconds_ago < LIVE_SECONDS);

  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader
        preview={false}
        title="Users"
        description="Everyone with an account. Promote people to admin, switch accounts off, and set each person's AI limit."
      />

      <div className="space-y-5">
        <Card className="reveal" style={stagger(1)}>
          <CardHeader
            title="Live now"
            description="People with AngleOS open right now. Updates by itself."
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

        <div className="space-y-3">
          {rows.map((u, i) => {
            const isLive = !u.disabled && u.seconds_ago !== null && u.seconds_ago < LIVE_SECONDS;
            const isOwner = u.email.toLowerCase() === owner;
            const isMe = u.id === me.id;
            const state = limitState(u.role, Number(u.spent_cents ?? 0), u.limit_cents);
            return (
              <Card key={u.id} className={cn("reveal p-5 sm:p-6", u.disabled && "opacity-60")} style={stagger(i + 2)}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] font-semibold text-white">
                    {initials(u.name)}
                    {isLive && <span className="live-dot absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg bg-success" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{u.name}</span>
                      {isOwner ? (
                        <Badge tone="warning">
                          <Crown className="h-3 w-3" /> Owner
                        </Badge>
                      ) : u.role === "admin" ? (
                        <Badge tone="accent">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge>Member</Badge>
                      )}
                      {u.disabled && <Badge tone="danger">Switched off</Badge>}
                      {isMe && <span className="text-xs font-normal text-muted">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{u.email}</p>
                    <p className="text-xs text-muted">{isLive ? "Online now" : `Last seen: ${ago(u.seconds_ago)}`}</p>
                  </div>

                  <div className="w-full sm:w-56">
                    {state.unlimited ? (
                      <p className="text-sm">
                        <span className="font-medium">{aud(state.spentCents)}</span> used · <span className="text-muted">unlimited</span>
                      </p>
                    ) : (
                      <>
                        <p className="flex justify-between text-sm">
                          <span>
                            <span className="font-medium">{aud(state.spentCents)}</span> used
                          </span>
                          <span className="text-muted">of {aud(state.limitCents ?? 0)}</span>
                        </p>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={state.percent} aria-valuemin={0} aria-valuemax={100} aria-label="AI credit used">
                          <div
                            className={cn("h-full origin-left rounded-full transition-[width] duration-700", state.blocked ? "bg-danger" : state.percent > 80 ? "bg-warning" : "bg-accent")}
                            style={{ width: `${Math.max(state.percent, 2)}%` }}
                          />
                        </div>
                        {state.blocked && <p className="mt-1 text-xs text-danger">Limit reached. Their AI features are paused.</p>}
                      </>
                    )}
                  </div>
                </div>

                {!isMe && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    {u.role === "member" && <LimitForm id={u.id} current={u.limit_cents === null ? "unlimited" : (u.limit_cents / 100).toString()} />}
                    <div className="ml-auto flex flex-wrap items-start gap-2">
                      {!isOwner && (u.role === "member" || me.email.toLowerCase() === owner) && (
                        <ResetCodeButton id={u.id} name={u.name} />
                      )}
                      {!isOwner && (
                        <form action={setRoleAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === "admin" ? "member" : "admin"} />
                          <Button type="submit" variant="secondary" size="sm">
                            <ShieldCheck className="h-4 w-4" />
                            {u.role === "admin" ? "Make member" : "Promote to admin"}
                          </Button>
                        </form>
                      )}
                      {!isOwner && (
                        <form action={setDisabledAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="disabled" value={u.disabled ? "false" : "true"} />
                          <Button type="submit" variant={u.disabled ? "secondary" : "danger"} size="sm">
                            {u.disabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                            {u.disabled ? "Switch back on" : "Switch off"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
