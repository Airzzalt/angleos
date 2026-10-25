import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { getScript, getVersions } from "@/lib/ai/scripts";
import { FORMATS } from "@/lib/ai/script-shape";
import { Badge, Card } from "@/components/ui/card";
import { ScriptEditor } from "@/components/script-editor";
import { FeedbackButtons } from "@/components/feedback-buttons";
import { Collapse } from "@/components/collapse";

export const metadata = { title: "Script" };

export default async function ScriptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = (await query<{ project_id: string }>("select project_id from scripts where id = $1", [id])).rows[0];
  if (!row) notFound();
  const project = await getProject(me, row.project_id);
  if (!project) notFound();
  const script = await getScript(project.id, id);
  if (!script) notFound();
  const versions = await getVersions(script.id);
  const want = Number(sp.v);
  const shown = versions.find((v) => v.version_no === want) ?? versions[0];
  if (!shown) notFound();
  const isLatest = shown.version_no === versions[0].version_no;
  const ruleNames = me.role === "admin" && shown.trace?.rules?.length
    ? (await query<{ rule_code: string; title: string }>("select rule_code, title from playbook_rules where rule_code = any($1::text[])", [shown.trace.rules])).rows
    : [];
  const fmt = FORMATS.find((f) => f.id === script.format)?.label ?? script.format;
  const c = shown.checks;
  const fb = (await query<{ rating: number }>("select rating from feedback where owner_id = $1 and kind = 'script' and target_id = $2", [me.id, script.id])).rows[0]?.rating ?? 0;

  return (
    <div className="space-y-6">
      <Link href={`/scripts?project=${project.id}${script.angle_id ? `&angle=${script.angle_id}` : ""}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to Script Writer
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-gradient break-words text-[26px] font-semibold leading-tight tracking-tight">{script.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone="accent">{fmt}</Badge>
            <span>{script.length_label === "vsl" ? "VSL" : `${script.length_label} seconds`}</span>
            <span>·</span>
            <Link className="underline" href={`/projects/${project.id}`}>{project.name}</Link>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted">Is this a good script?</p>
          <FeedbackButtons kind="script" targetId={script.id} initial={fb} />
        </div>
      </div>

      {c?.pass ? (
        <p id="script-checks" className="flex items-start gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Passed the checks. Reading level grade {c.grade}, {c.words} words.
        </p>
      ) : (
        <div id="script-checks" className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          <p className="flex items-start gap-2 font-medium"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Needs a look. Reading level grade {c?.grade ?? "?"}, {c?.words ?? 0} words.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-9">
            {(c?.issues ?? []).map((i, n) => <li key={n}>{i.message}{i.detail ? ` (${i.detail})` : ""}</li>)}
          </ul>
          <p className="mt-1 pl-6 text-xs opacity-80">You can fix it by hand below, or ask for a change in the box under the script.</p>
        </div>
      )}

      {versions.length > 1 && (
        <nav aria-label="Versions" className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Versions:</span>
          {versions.map((v) => (
            <Link key={v.version_no} href={`/scripts/${script.id}?v=${v.version_no}`} aria-current={v.version_no === shown.version_no ? "true" : undefined}
              className={`rounded-full border px-3 py-1 ${v.version_no === shown.version_no ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-border-strong"}`}>
              v{v.version_no} {v.source === "ai" ? "(AI)" : v.source === "refine" ? "(changed)" : "(edited)"}
            </Link>
          ))}
        </nav>
      )}
      {!isLatest && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">You are looking at an older version. <Link className="text-accent underline" href={`/scripts/${script.id}`}>Go to the newest</Link>. You can restore this one below.</p>}

      <ScriptEditor scriptId={script.id} versionNo={shown.version_no} isLatest={isLatest} data={shown.data} />

      {shown.data.claims.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold tracking-tight">Claims in this script</h2>
          <p className="mt-1 text-xs text-muted">Check each one before you run the ad.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs text-muted"><th className="pb-2 pr-4 font-medium">Claim</th><th className="pb-2 font-medium">Where it comes from</th></tr></thead>
              <tbody>
                {shown.data.claims.map((cl, i) => (
                  <tr key={i} className="border-t border-border align-top"><td className="py-2 pr-4">{cl.claim}</td><td className="py-2 text-muted">{cl.support || "needs proof"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {me.role === "admin" && (
        <Card className="px-5 py-2"><Collapse title="How this was made (admin only)">
          <div className="space-y-2 p-4 text-sm text-muted">
            <p>Steps: {(shown.trace?.steps ?? []).join(" → ") || "n/a"}. Automatic fixes: {shown.trace?.fixes ?? 0}.</p>
            {ruleNames.length ? (
              <ul className="list-disc pl-5">{ruleNames.map((r) => <li key={r.rule_code}>{r.rule_code}: {r.title}</li>)}</ul>
            ) : (
              <p>No course rules were listed by the AI for this version.</p>
            )}
          </div>
        </Collapse></Card>
      )}
    </div>
  );
}
