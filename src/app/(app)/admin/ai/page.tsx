import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { ProviderSwitch, RoutingForm, SafetyForm, TestConnection } from "@/components/ai-settings-form";
import { getAiConfig, readiness } from "@/lib/ai/settings";
import { listModels, AiError } from "@/lib/ai/gemini";
import { spentLast24hCents } from "@/lib/ai/guard";
import { aud } from "@/lib/usage-limit";
import { Button } from "@/components/ui/button";

export const metadata = { title: "AI connection" };

const SECTIONS = [
  ["providers", "Providers"],
  ["routing", "Task routing"],
  ["safety", "Safety limits"],
  ["spending", "Spending"],
] as const;

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
  const perPerson = (
    await query<{ name: string; email: string; c: string }>(
      `select u.name, u.email, sum(l.est_cost) * 100 as c from usage_log l join users u on u.id = l.user_id
        where l.created_at > now() - interval '24 hours' group by u.name, u.email order by c desc limit 8`,
    )
  ).rows;
  const perModel = (
    await query<{ provider: string; model: string; c: string }>(
      `select coalesce(provider, 'unknown') as provider, coalesce(model, '-') as model, sum(est_cost) * 100 as c from usage_log
        where created_at > now() - interval '24 hours' group by 1, 2 order by c desc limit 8`,
    )
  ).rows;
  const others = [
    { name: "xAI (Grok)", env: "XAI_API_KEY", note: "Planned for writing angles and scripts. Gets its card when the Script Writer is built." },
    { name: "OpenAI", env: "OPENAI_API_KEY", note: "Planned for writing tests and meaning-based search. Added when needed." },
  ].map((o) => ({ ...o, found: !!process.env[o.env] }));

  return (
    <>
      <PageHeader preview={false} title="AI connection" description="Providers, which model does which job, every safety limit, and what has been spent. Only admins see this page." />
      <nav aria-label="Sections" className="mb-6 flex flex-wrap gap-2 text-sm">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-border px-3 py-1 text-muted hover:text-fg">{label}</a>
        ))}
      </nav>
      <div className="space-y-8">
        <section id="providers" className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge tone={ready.ok ? "success" : "warning"}>{ready.ok ? "Ready to use" : ready.reason}</Badge>
            <span className="text-muted">Last 24 hours: {aud(spent)} of {aud(Number(cfg.daily_cap_aud) * 100)} cap</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Google Gemini"
                description="Reads and sorts files, writes the brief. The key lives in Render (GEMINI_API_KEY) and is never shown or saved here."
                action={<Badge tone={hasKey ? "success" : "danger"}>{hasKey ? "Key found" : "Key missing"}</Badge>}
              />
              <div className="space-y-5 p-6">
                <ProviderSwitch cfg={cfg} />
                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                  <TestConnection />
                  <Link href="/admin/ai?models=1#routing">
                    <Button variant="secondary" size="sm" disabled={!hasKey}>Load Google's model list</Button>
                  </Link>
                </div>
              </div>
            </Card>
            {others.map((o) => (
              <Card key={o.name} className="lg:col-span-1">
                <CardHeader title={o.name} action={<Badge tone={o.found ? "accent" : "neutral"}>{o.found ? "Key found, not used yet" : "Not connected"}</Badge>} />
                <p className="px-6 pb-6 pt-3 text-sm text-muted">{o.note} Key name for Render: {o.env}.</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="routing" className="scroll-mt-24">
          <Card>
            <CardHeader
              title="Task routing"
              description="Which model does which job and what it costs. Model names come from the provider's list, never from the code. More jobs (angles, scripts, chat, video) get a row here as they are built."
            />
            {modelError && <p role="alert" className="px-6 pt-3 text-sm text-danger">{modelError}</p>}
            {models.length > 0 && <p className="px-6 pt-3 text-sm text-muted">{models.length} models loaded. Click in a model box to choose one.</p>}
            <RoutingForm cfg={cfg} models={models} />
          </Card>
        </section>

        <section id="safety" className="scroll-mt-24">
          <Card>
            <CardHeader title="Safety limits" description="The kill switch and every cap. These apply to all providers." />
            <SafetyForm cfg={cfg} />
          </Card>
        </section>

        <section id="spending" className="scroll-mt-24 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="By person (last 24 hours)" />
            {perPerson.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted">No AI spending yet.</p>
            ) : (
              <ul className="divide-y divide-border p-2">
                {perPerson.map((t) => (
                  <li key={t.email} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{t.name} <span className="text-muted">{t.email}</span></span>
                    <span className="font-medium">{aud(Number(t.c))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="By provider and model (last 24 hours)" />
            {perModel.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted">No AI spending yet.</p>
            ) : (
              <ul className="divide-y divide-border p-2">
                {perModel.map((t) => (
                  <li key={t.provider + t.model} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{t.provider} <span className="text-muted">{t.model}</span></span>
                    <span className="font-medium">{aud(Number(t.c))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
