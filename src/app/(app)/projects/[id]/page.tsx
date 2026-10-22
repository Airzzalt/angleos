import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, PenLine, ScanSearch, Bookmark, Sparkles, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { LIMITS } from "@/lib/uploads/limits";
import { cn } from "@/lib/cn";
import { EmptyState, PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContextForm, FileUploader } from "@/components/project-forms";
import { BriefSections, BuildPanel, type PlanView } from "@/components/brief-panel";
import { AnglesWorkspace, type AngleView } from "@/components/angles-panel";
import { getAngles, latestAngleJob } from "@/lib/ai/angles";
import { getAiConfig, readiness } from "@/lib/ai/settings";
import { getBrief, type BriefRow, latestJob, planBrief, CATEGORY_LABEL } from "@/lib/ai/brief";
import { usageFor } from "@/lib/usage";
import { aud } from "@/lib/usage-limit";
import { deleteFileAction, deleteProjectAction } from "../actions";
import { makeFullProjectAction } from "../angle-actions";

const TABS = [
  { key: "brief", label: "Brief" },
  { key: "files", label: "Files" },
  { key: "context", label: "Context" },
  { key: "angles", label: "Angles" },
  { key: "scripts", label: "Scripts" },
  { key: "analyses", label: "Analyses" },
  { key: "swipe", label: "Swipe" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type FileRow = {
  id: string;
  file_name: string;
  file_type: string;
  word_count: number;
  char_count: number;
  source_zip: string | null;
  flags: { kind: string; note: string }[];
  created_at: string;
  category: string | null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const p = await getProject(me, (await params).id);
  return { title: p?.name ?? "Project" };
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const project = await getProject(me, id);
  if (!project) notFound();
  const sp = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : project.kind === "quick" ? "angles" : "brief";

  const files = (
    await query<FileRow>(
      `select id, file_name, file_type, word_count, char_count, source_zip, flags, created_at, category
         from project_files where project_id = $1 order by created_at desc, file_name`,
      [project.id],
    )
  ).rows;
  const totalChars = files.reduce((a, f) => a + f.char_count, 0);
  const totalWords = files.reduce((a, f) => a + f.word_count, 0);
  let brief: BriefRow | null = null;
  let planView: PlanView = null;
  let blocked: string | null = null;
  let jobView: { id: string; status: string; done: number; total: number; message: string; error: string | null; spentCents: number } | null = null;
  let creditLine = "";
  if (tab === "brief") {
    brief = await getBrief(project.id);
    const j = await latestJob(project.id);
    jobView = j ? { id: j.id, status: j.status, done: j.done_steps, total: j.total_steps, message: j.message, error: j.error, spentCents: Math.round(Number(j.spent_cents)) } : null;
    const ready = readiness(await getAiConfig());
    if (!ready.ok) blocked = `${ready.reason}${me.role === "admin" ? " Set it up on the AI connection page." : " Ask Ayaan."}`;
    else {
      const plan = await planBrief(project.id, ready);
      if (plan.error) blocked = plan.error;
      else planView = { estCents: plan.estCents, capCents: plan.capCents, files: plan.files, needRead: plan.needRead, willRead: plan.willRead, includeWrite: plan.includeWrite };
      const u = await usageFor(me.id, me.role);
      creditLine = u.unlimited ? "" : `You have ${aud(u.remainingCents ?? 0)} of credit left.`;
    }
  }
  let angleViews: AngleView[] = [];
  let angleJob: { id: string; status: string; done: number; total: number; message: string; error: string | null; spentCents: number } | null = null;
  let angleMissing: string[] = [];
  let angleNote = "";
  if (tab === "angles") {
    angleViews = (await getAngles(project.id)).map((r) => ({ id: r.id, favourite: r.favourite, edited: r.edited, createdAt: r.created_at, data: r.data }));
    const j = await latestAngleJob(project.id);
    if (j) {
      angleJob = { id: j.id, status: j.status, done: j.done_steps, total: j.total_steps, message: j.message, error: j.error, spentCents: Math.round(Number(j.spent_cents)) };
      angleMissing = Array.isArray(j.trace?.missing) ? j.trace.missing : [];
      angleNote = typeof j.trace?.note === "string" ? j.trace.note : "";
    }
  }
  const ctx = tab === "context" ? (await query<{ body: string }>("select body from project_context where project_id = $1", [project.id])).rows[0]?.body ?? "" : "";
  const canDelete = project.owner_id === me.id || me.role === "admin";

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>
      <PageHeader preview={false} title={project.name} description={[project.niche, project.market].filter(Boolean).join(" · ") || undefined} />
      {project.kind === "quick" && (
        <div className="-mt-3 mb-5 flex flex-wrap items-center gap-3 text-sm">
          <Badge tone="accent">Quick project</Badge>
          <span className="text-muted">Made for fast angles. The brief is optional.</span>
          <form action={makeFullProjectAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" className="text-accent hover:underline">Make this a full project</button>
          </form>
        </div>
      )}

      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Project sections">
        <div className="inline-flex gap-1 rounded-full border border-border bg-surface p-1 backdrop-blur-xl">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/projects/${project.id}?tab=${t.key}`}
              role="tab"
              aria-selected={tab === t.key}
              className={cn(
                "inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-200",
                tab === t.key ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
              )}
            >
              {t.label}
              {t.key === "files" && files.length > 0 && <span className="ml-1.5 text-xs text-muted">{files.length}</span>}
            </Link>
          ))}
        </div>
      </div>

      {tab === "brief" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader title="Product brief" description="The AI reads your research and writes the brief: offer, avatars, desires, awareness, mechanisms, proof and objections, each with its source file. You can edit every part, and your edits are never overwritten." />
              <div className="space-y-4 p-6">
                {brief ? (
                  <>
                    {brief.context_score !== null && (
                      <div className="rounded-2xl bg-surface-2 p-4">
                        <p className="text-sm font-medium">Context score: {brief.context_score} out of 100</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label="Context score">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${brief.context_score}%` }} />
                        </div>
                        {brief.missing.length > 0 && (
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
                            {brief.missing.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <BriefSections projectId={project.id} sections={brief.sections} />
                  </>
                ) : (
                  <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <div className="text-sm">
                      <p className="font-medium">No brief yet</p>
                      <p className="mt-1 text-muted">
                        {files.length > 0
                          ? `Your ${files.length} file${files.length === 1 ? " is" : "s are"} ready (${totalWords.toLocaleString()} words). Build the brief from the box on the right.`
                          : "Upload your research on the Files tab first."}
                      </p>
                    </div>
                  </div>
                )}
                {files.length === 0 && (
                  <Link href={`/projects/${project.id}?tab=files`}>
                    <Button variant="secondary" size="sm">Upload research</Button>
                  </Link>
                )}
              </div>
            </Card>
          </div>
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Build the brief" />
              <div className="p-6">
                <BuildPanel projectId={project.id} plan={planView} blocked={blocked} job={jobView} hasBrief={!!brief} creditLine={creditLine} />
              </div>
            </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Details" />
            <dl className="space-y-3 p-6 text-sm">
              {[
                ["Product link", project.product_url],
                ["Niche", project.niche],
                ["Market", project.market],
                ["Description", project.description],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-0.5 break-words">{v || <span className="text-muted">Not set</span>}</dd>
                </div>
              ))}
            </dl>
          </Card>
          </div>
          {canDelete && (
            <details className="rounded-2xl border border-danger/30 px-5 py-4 lg:col-span-5">
              <summary className="cursor-pointer text-sm font-medium text-danger">Delete this project</summary>
              <form action={deleteProjectAction} className="mt-3 flex flex-wrap items-center gap-3">
                <input type="hidden" name="projectId" value={project.id} />
                <p className="min-w-0 flex-1 text-sm text-muted">This permanently removes the project, its files and its context.</p>
                <Button type="submit" variant="danger" size="sm">Yes, delete it</Button>
              </form>
            </details>
          )}
        </div>
      )}

      {tab === "files" && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Upload research" description="Avatar docs, awareness work, Reddit data, the product doc, reviews. Everything is checked before it's read, and nothing is ever run." />
            <div className="p-6">
              <FileUploader projectId={project.id} />
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Files"
              description={`${files.length} of ${LIMITS.maxFilesPerProject} · ${totalWords.toLocaleString()} words`}
            />
            <div className="px-6 pt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label="Project text used">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, (totalChars / LIMITS.maxCharsPerProject) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {Math.round((totalChars / LIMITS.maxCharsPerProject) * 100)}% of this project's text limit used
              </p>
            </div>
            {files.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted">No files yet. Upload your research above.</p>
            ) : (
              <ul className="divide-y divide-border p-2">
                {files.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-muted" />
                    <Link href={`/projects/${project.id}/files/${f.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                      {f.file_name}
                    </Link>
                    {f.category && <Badge tone="accent">{CATEGORY_LABEL[f.category] ?? f.category}</Badge>}
                    <Badge className="uppercase">{f.file_type}</Badge>
                    {f.flags.length > 0 && <Badge tone="warning">trimmed</Badge>}
                    <span className="text-xs text-muted">{f.word_count.toLocaleString()} words</span>
                    <form action={deleteFileAction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="id" value={f.id} />
                      <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Remove ${f.file_name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "context" && (
        <Card className="max-w-3xl">
          <CardHeader title="Project context" description="Standing notes for everything made in this project: rules, tone, things to always or never say. The AI follows these every time." />
          <div className="p-6">
            <ContextForm projectId={project.id} initial={ctx} />
          </div>
        </Card>
      )}

      {tab === "angles" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Research for the angles"
              description={files.length ? `${files.length} file${files.length === 1 ? "" : "s"} · ${totalWords.toLocaleString()} words. Add more any time: loose files or a zip.` : "Drop in your research: loose files or a zip (avatar docs, reviews, Reddit threads, the product page). No research? Write the product and customer notes on the Context tab instead."}
            />
            <div className="space-y-3 p-6">
              <FileUploader projectId={project.id} />
              {files.length > 0 && (
                <Link href={`/projects/${project.id}?tab=files`} className="inline-block text-sm text-accent hover:underline">See and remove files</Link>
              )}
            </div>
          </Card>
          <AnglesWorkspace projectId={project.id} fileCount={files.length} angles={angleViews} job={angleJob} missing={angleMissing} note={angleNote} />
        </div>
      )}
      {tab === "scripts" && <EmptyState icon={PenLine} title="No scripts yet" description="Scripts for this product will be saved here. The Script Writer is built in Phase 4." />}
      {tab === "analyses" && <EmptyState icon={ScanSearch} title="No analyses yet" description="Ad breakdowns linked to this product will appear here. Analyze Ad is built in Phase 5." />}
      {tab === "swipe" && <EmptyState icon={Bookmark} title="Nothing saved yet" description="Ads you link to this product will appear here. The Swipe File is built in Phase 5." />}
    </>
  );
}
