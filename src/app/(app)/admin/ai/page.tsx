import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { AiSettingsForm, TestConnection } from "@/components/ai-settings-form";
import { getAiConfig, readiness } from "@/lib/ai/settings";
import { listModels, AiError } from "@/lib/ai/gemini";
import { spentLast24hCents } from "@/lib/ai/guard";
import { aud } from "@/lib/usage-limit";
import { Button } from "@/components/ui/button";

export const metadata = { title: "AI connection" };

export default async function AiPage({ searchParams }: { searchParams: Promise<{ models?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const cfg = await getAiConfig();
  const ready = readiness(cfg);
  const hasKey = !!process.env.GEMINI_API_KEY;
  let models: string[] = [];
  let modelError = "";
  if (sp.models === "1" && hasKey) {
    try {
      models = await listModels();
    } catch (e) {
      modelError = e instanceof AiError ? e.message : "Could not load the list.";
    }
  }
  const spent = await spentLast24hCents();
  const top = (
    await query<{ name: string; email: string; c: string }>(
      `select u.name, u.email, sum(l.est_cost) * 100 as c from usage_log l join users u on u.id = l.user_id
        where l.created_at > now() - interval '24 hours' group by u.name, u.email order by c desc limit 8`,
    )
  ).rows;
  return (
    <>
      <PageHeader preview={false} title="AI connection" description="The key, the models, the prices and every safety limit. Only admins see this page." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Status" />
          <div className="flex flex-wrap items-center gap-3 px-6 pb-6 pt-4 text-sm">
            <Badge tone={hasKey ? "success" : "danger"}>{hasKey ? "Gemini key found" : "Gemini key missing"}</Badge>
            <Badge tone={ready.ok ? "success" : "warning"}>{ready.ok ? "Ready to use" : ready.reason}</Badge>
            <span className="text-muted">Spent in the last 24 hours: {aud(spent)} of {aud(Number(cfg.daily_cap_aud) * 100)} cap</span>
          </div>
          <p className="px-6 pb-6 text-xs text-muted">The key is set in Render (Environment, GEMINI_API_KEY). It is never shown here or saved in the database.</p>
        </Card>
        <Card>
          <CardHeader
            title="Models, prices and limits"
            description="Model names come from Google's list so nothing is hard-coded. Prices are on Google's pricing page; type them in so cost estimates are right."
            action={
              <Link href="/admin/ai?models=1">
                <Button variant="secondary" size="sm" disabled={!hasKey}>Load model list</Button>
              </Link>
            }
          />
          {modelError && <p role="alert" className="px-6 pt-3 text-sm text-danger">{modelError}</p>}
          {models.length > 0 && <p className="px-6 pt-3 text-sm text-muted">{models.length} models loaded. Click in a model box to choose one.</p>}
          <AiSettingsForm cfg={cfg} models={models} />
        </Card>
        <Card>
          <CardHeader title="Test" description="Sends one tiny request to check the key and the reader model work. Costs a fraction of a cent." />
          <TestConnection />
        </Card>
        <Card>
          <CardHeader title="Who spent what (last 24 hours)" />
          {top.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted">No AI spending yet.</p>
          ) : (
            <ul className="divide-y divide-border p-2">
              {top.map((t) => (
                <li key={t.email} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate">{t.name} <span className="text-muted">{t.email}</span></span>
                  <span className="font-medium">{aud(Number(t.c))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
