import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor } from "@/components/text-editor";
import { deleteModuleAction, resetRuleAction, saveRuleAction, setModuleActiveAction, setRuleStatusAction } from "../../actions";

type Rule = { id: string; rule_code: string; title: string; body_md: string; original_body_md: string; flags: string[]; status: string };

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  return { title: (await params).code };
}

export default async function ModulePage({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin();
  const { code } = await params;
  const mod = (
    await query<{ id: string; code: string; title: string; used_by: string; intro_md: string; body_md: string; kind: string; active: boolean }>(
      "select id, code, title, used_by, intro_md, body_md, kind, active from playbook_modules where code = $1",
      [code],
    )
  ).rows[0];
  if (!mod) notFound();
  const rules = (
    await query<Rule>(
      "select id, rule_code, title, body_md, original_body_md, flags, status from playbook_rules where module_id = $1 order by position",
      [mod.id],
    )
  ).rows;

  return (
    <>
      <Link href="/admin/knowledge-base" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Knowledge Base
      </Link>
      <PageHeader
        preview={false}
        title={mod.title.replace(/^\d+\s+/, "")}
        description={mod.used_by ? `Used by: ${mod.used_by}` : undefined}
        actions={
          <form action={setModuleActiveAction}>
            <input type="hidden" name="id" value={mod.id} />
            <input type="hidden" name="active" value={String(!mod.active)} />
            <Button type="submit" variant="secondary" size="sm">{mod.active ? "Switch module off" : "Switch module on"}</Button>
          </form>
        }
      />

      {mod.intro_md && (
        <Card className="mb-6 p-5">
          <p className="mb-2 text-sm font-semibold">How the AI uses this module</p>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-muted">{mod.intro_md.replace(/^#.*\n/, "")}</pre>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card className="p-5">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-muted">{mod.body_md}</pre>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rules.map((r) => {
            const edited = r.body_md !== r.original_body_md;
            return (
              <li key={r.id} id={r.rule_code} className="scroll-mt-24">
                <Card className={r.status === "off" ? "opacity-60" : undefined}>
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-2.5 px-5 py-3 [&::-webkit-details-marker]:hidden">
                      <Badge tone="accent" className="font-mono">{r.rule_code}</Badge>
                      <span className="min-w-0 flex-1 font-medium">{r.title}</span>
                      {r.flags.map((f) => (
                        <Badge key={f} tone="warning">{f.toLowerCase()}</Badge>
                      ))}
                      {edited && <Badge tone="neutral">edited</Badge>}
                      {r.status === "off" && <Badge tone="danger">off</Badge>}
                    </summary>
                    <div className="space-y-4 border-t border-border px-5 py-5">
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{r.body_md}</pre>
                      <div className="flex flex-wrap gap-2">
                        <form action={setRuleStatusAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={r.status === "off" ? "active" : "off"} />
                          <Button type="submit" variant="secondary" size="sm">{r.status === "off" ? "Switch on" : "Switch off"}</Button>
                        </form>
                        {edited && (
                          <form action={resetRuleAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <Button type="submit" variant="ghost" size="sm">Restore original</Button>
                          </form>
                        )}
                      </div>
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-accent">Edit this rule</summary>
                        <div className="mt-3">
                          <TextEditor id={r.id} initial={r.body_md} action={saveRuleAction} label={`Edit ${r.rule_code}`} rows={12} />
                        </div>
                      </details>
                    </div>
                  </details>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-10 rounded-2xl border border-danger/30 px-5 py-4">
        <summary className="cursor-pointer text-sm font-medium text-danger">Delete this module</summary>
        <form action={deleteModuleAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={mod.id} />
          <p className="min-w-0 flex-1 text-sm text-muted">
            This permanently removes the module and all {rules.length} of its rules. To get it back you would add the file again.
          </p>
          <Button type="submit" variant="danger" size="sm">Yes, delete it</Button>
        </form>
      </details>
    </>
  );
}
