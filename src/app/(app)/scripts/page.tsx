import Link from "next/link";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { getAngles } from "@/lib/ai/angles";
import { getScripts, scriptCountsByAngle } from "@/lib/ai/scripts";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ScriptStudio } from "@/components/script-studio";
import { FORMATS } from "@/lib/ai/script-shape";

export const metadata = { title: "Script Writer" };

type P = { id: string; name: string; kind: string };

export default async function ScriptsPage({ searchParams }: { searchParams: Promise<{ project?: string; angle?: string; creative?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const projects = (
    await query<P>(
      `select id, name, kind from projects where owner_id = $1 or ($2::uuid is not null and workspace_id = $2::uuid) order by updated_at desc`,
      [me.id, me.workspaceId],
    )
  ).rows;
  const project = sp.project ? await getProject(me, sp.project) : null;
  const angles = project ? await getAngles(project.id) : [];
  const counts = project ? await scriptCountsByAngle(project.id) : {};
  const angle = angles.find((a) => a.id === sp.angle) ?? null;
  const scripts = project ? await getScripts(project.id) : [];
  const fmtLabel = (id: string) => FORMATS.find((f) => f.id === id)?.label ?? id;
  const creative = Number(sp.creative);

  return (
    <>
      <PageHeader preview={false} title="Script Writer" description="Pick a project or a quick start, pick an angle, and get finished scripts that follow the playbook." />
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="text-[17px] font-semibold tracking-tight">1. Choose where to start</h2>
          <p className="mb-4 mt-1 text-sm text-muted">A full project, or a quick start made from a pile of research files (for example Reddit threads).</p>
          {projects.length === 0 ? (
            <p className="text-sm text-muted">You have no projects yet. <Link className="text-accent underline" href="/projects/new">Make one</Link> or use a quick start from the Angle Generator.</p>
          ) : (
            <form className="flex flex-wrap items-end gap-3" action="/scripts">
              <div className="min-w-[240px] flex-1">
                <Label htmlFor="script-project">Project or quick start</Label>
                <Select id="script-project" name="project" defaultValue={project?.id ?? ""}>
                  <option value="" disabled>Choose one…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.kind === "quick" ? " (quick start)" : ""}</option>
                  ))}
                </Select>
              </div>
              <Button type="submit" variant="secondary">Use this</Button>
            </form>
          )}
        </Card>

        {project && (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-semibold tracking-tight">2. Pick an angle</h2>
              <Badge>{project.kind === "quick" ? "Quick start" : "Project"}: {project.name}</Badge>
            </div>
            {angles.length === 0 ? (
              <p id="no-angles" className="mt-3 text-sm text-muted">
                This one has no angles yet. <Link className="text-accent underline" href={`/projects/${project.id}`}>Make angles first</Link>, then come back and pick one.
              </p>
            ) : (
              <ul className="mt-3 space-y-2" aria-label="Angles">
                {angles.slice(0, 60).map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/scripts?project=${project.id}&angle=${a.id}`}
                      aria-current={a.id === angle?.id ? "true" : undefined}
                      className={`block rounded-2xl border px-4 py-3 text-sm transition-colors ${a.id === angle?.id ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-border-strong"}`}
                    >
                      <span className="block font-medium">{a.data.angle}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {a.data.sub_avatar}
                        {counts[a.id] ? ` · ${counts[a.id]} script${counts[a.id] === 1 ? "" : "s"} made` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {project && angle && (
          <ScriptStudio
            projectId={project.id}
            angleId={angle.id}
            angleLine={angle.data.angle}
            creatives={(angle.data.test_plan?.creatives ?? []).map((c) => ({ format: c.format, hook: c.hook }))}
            initialCreative={Number.isInteger(creative) && creative >= 0 && creative < 3 ? creative : null}
          />
        )}

        {project && scripts.length > 0 && (
          <Card className="p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">Scripts in {project.name}</h2>
            <ul className="mt-3 divide-y divide-border" aria-label="Scripts">
              {scripts.map((s) => (
                <li key={s.id}>
                  <Link href={`/scripts/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-accent">
                    <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 break-words">{s.title}</span></span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <Badge>{fmtLabel(s.format)}</Badge>
                      {s.length_label === "vsl" ? "VSL" : `${s.length_label}s`} · v{s.current_version}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
