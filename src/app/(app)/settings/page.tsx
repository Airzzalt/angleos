import { CircleDashed } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { usageDays } from "@/lib/placeholder";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Settings" };

const connections = [
  { name: "OpenAI", use: "Script writing" },
  { name: "Gemini", use: "Video understanding and research" },
  { name: "Get Hooked", use: "Competitor ad search" },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const total = usageDays.reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader title="Settings" description="Your account, standing instructions, usage and connections." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" />
          <dl className="space-y-3 px-5 pb-5 pt-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Name</dt><dd className="font-medium">{user.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd className="font-medium">{user.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Role</dt><dd><Badge tone={user.role === "admin" ? "accent" : "neutral"}>{user.role === "admin" ? "Admin" : "Member"}</Badge></dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted">Appearance</dt><dd><ThemeToggle /></dd></div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Usage" description="Estimated AI spend, sample numbers" />
          <div className="px-5 pb-5 pt-4">
            <p className="text-[32px] font-semibold leading-none tracking-tight">${total.toFixed(2)} <span className="text-base font-normal text-muted">last 14 days</span></p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full w-[28%] rounded-full bg-accent" />
            </div>
            <p className="mt-2 text-xs text-muted">28% of a $50 monthly cap (set your own cap in Phase 7)</p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Account context" description="Standing rules for everything you generate: voice, style and things to avoid." />
          <div className="space-y-3 px-5 pb-5 pt-4">
            <Label htmlFor="acct-ctx" className="sr-only">Account context</Label>
            <Textarea id="acct-ctx" className="min-h-32" defaultValue="Australian English. Direct, no hype words. Never promise medical results. Avoid the phrase “game changer”." />
            <Button disabled>Save</Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Connections" description="Keys live on the server only. This screen shows status, never the keys." />
          <ul className="mt-3 divide-y divide-border pb-1">
            {connections.map((c) => (
              <li key={c.name} className="flex min-h-[60px] items-center gap-4 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-sm text-muted">{c.use}</span>
                </span>
                <Badge><CircleDashed className="h-3 w-3" /> Not connected yet</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
