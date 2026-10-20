import { CircleDashed } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { usageFor } from "@/lib/usage";
import { aud } from "@/lib/usage-limit";
import { stagger } from "@/lib/fx";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { NameForm, PasswordForm } from "@/components/settings-forms";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const connections = [
  { name: "OpenAI", use: "Script writing" },
  { name: "Gemini", use: "Video understanding and research" },
  { name: "Get Hooked", use: "Competitor ad search" },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Perth" });

export default async function SettingsPage() {
  const user = await requireUser();
  const [{ rows }, usage] = await Promise.all([
    query<{ next: string | null }>(
      `select case when name_changed_at > now() - interval '30 days' then name_changed_at + interval '30 days' end as next
         from users where id = $1`,
      [user.id],
    ),
    usageFor(user.id, user.role),
  ]);
  const nextChange = rows[0]?.next ? fmtDate(rows[0].next) : null;

  return (
    <>
      <PageHeader preview={false} title="Settings" description="Your account, password, usage and connections." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="reveal" style={stagger(1)}>
          <CardHeader title="Account" />
          <div className="space-y-5 p-6 pt-5">
            <NameForm name={user.name} nextChange={nextChange} />
            <dl className="space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd className="min-w-0 truncate font-medium">{user.email}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Role</dt><dd><Badge tone={user.role === "admin" ? "accent" : "neutral"}>{user.role === "admin" ? "Admin" : "Member"}</Badge></dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-muted">Appearance</dt><dd><ThemeToggle /></dd></div>
            </dl>
          </div>
        </Card>

        <Card className="reveal" style={stagger(2)}>
          <CardHeader title="Password" description="Changing it signs you out of your other devices." />
          <div className="p-6 pt-5">
            <PasswordForm />
          </div>
        </Card>

        <Card className="reveal" style={stagger(3)}>
          <CardHeader title="AI usage" description={usage.unlimited ? "You have no limit." : "Your AI credit, in total."} />
          <div className="p-6 pt-5">
            <p className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
              {aud(usage.spentCents)}{" "}
              <span className="text-base font-normal text-muted">{usage.unlimited ? "used" : `of ${aud(usage.limitCents ?? 0)}`}</span>
            </p>
            {!usage.unlimited && (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={usage.percent} aria-valuemin={0} aria-valuemax={100} aria-label="AI credit used">
                  <div className={cn("h-full rounded-full", usage.blocked ? "bg-danger" : usage.percent > 80 ? "bg-warning" : "bg-accent")} style={{ width: `${Math.max(usage.percent, 2)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {usage.blocked ? "You've used all your credit. Ask Ayaan to top it up." : `${aud(usage.remainingCents ?? 0)} left.`}
                </p>
              </>
            )}
          </div>
        </Card>

        <Card className="reveal lg:col-span-2" style={stagger(4)}>
          <CardHeader title="Account context" description="Standing rules for everything you generate: voice, style and things to avoid. (Saved in a later phase.)" />
          <div className="space-y-3 p-6 pt-5">
            <Label htmlFor="acct-ctx" className="sr-only">Account context</Label>
            <Textarea id="acct-ctx" className="min-h-32" defaultValue="Australian English. Direct, no hype words. Never promise medical results. Avoid the phrase “game changer”." />
            <Button disabled>Save</Button>
          </div>
        </Card>

        {user.role === "admin" && (
          <Card className="reveal lg:col-span-2" style={stagger(5)}>
            <CardHeader title="Connections" description="Keys live on the server only. This screen shows status, never the keys." />
            <ul className="mt-3 divide-y divide-border pb-1">
              {connections.map((c) => (
                <li key={c.name} className="flex min-h-[60px] items-center gap-4 px-6 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.name}</span>
                    <span className="block text-sm text-muted">{c.use}</span>
                  </span>
                  <Badge><CircleDashed className="h-3 w-3" /> Not connected yet</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
