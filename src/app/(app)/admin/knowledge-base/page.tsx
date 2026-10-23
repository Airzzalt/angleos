import Link from "next/link";
import { ChevronRight, FlaskConical, Search, TriangleAlert } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { TIER_LABEL, kbStats, searchBrain } from "@/lib/kb/store";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { setCollectionMentorAction } from "./actions";
import { FileImporter } from "@/components/file-importer";
import { Snippet } from "@/components/snippet";

export const metadata = { title: "Knowledge Base" };

type Mod = { code: string; title: string; kind: string; active: boolean; rules: string; off: string };

export default async function KnowledgeBasePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const [stats, mods, colls, found] = await Promise.all([
    kbStats(),
    query<Mod>(
      `select m.code, m.title, m.kind, m.active,
              (select count(*) from playbook_rules r where r.module_id = m.id) as rules,
              (select count(*) from playbook_rules r where r.module_id = m.id and r.status = 'off') as off
         from playbook_modules m order by m.code`,
    ),
    query<{ name: string; authority_tier: number; mentor: string; docs: string }>(
      `select c.name, c.authority_tier, c.mentor, (select count(*) from kb_documents d where d.collection_id = c.id) as docs
         from kb_collections c order by c.authority_tier, c.name`,
    ),
    q.trim() ? searchBrain(q) : null,
  ]);

  const tiles = [
    { label: "Playbook modules", value: stats.modules, note: "Decision rules by topic" },
    { label: "Active rules", value: stats.rules, note: stats.rules_off ? `${stats.rules_off} switched off` : "All switched on" },
    { label: "Lessons", value: stats.lessons, note: stats.flagged ? `${stats.flagged} with warnings` : "Searchable library" },
    { label: "Passages", value: stats.passages, note: "Lesson pieces the AI can quote" },
  ];

  return (
    <>
      <PageHeader
        preview={false}
        title="Knowledge Base"
        description="Your course material: the playbook rules and the searchable lesson library. Stored privately in the database. Only admins can see it."
        actions={
          <Link href="/admin/prompts">
            <Button variant="secondary" size="sm">Prompts</Button>
          </Link>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((s, i) => (
          <Card key={s.label} className="reveal p-5" style={{ "--i": i } as React.CSSProperties}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight">{s.value}</p>
            <p className="mt-2 text-xs text-muted">{s.note}</p>
          </Card>
        ))}
      </section>

      <Card className="mb-6">
        <CardHeader title="Test the brain" description="Ask a question and see which rules and lesson passages would be used (rules first, then supporting passages)." />
        <form className="space-y-3 p-5" action="/admin/knowledge-base" method="get">
          <Textarea name="q" defaultValue={q} className="min-h-20" maxLength={300} aria-label="Question" placeholder="e.g. What hook type works for a problem-aware audience?" />
          <Button type="submit">
            <FlaskConical className="h-4 w-4" /> Run test
          </Button>
        </form>
        {found && (
          <div className="space-y-5 border-t border-border p-5">
            {found.rules.length === 0 && found.passages.length === 0 && found.workflows.length === 0 && (
              <p className="text-sm text-muted">Nothing matched. Try different words, or add the material that covers this.</p>
            )}
            {found.rules.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Rules it would follow</h3>
                <ul className="space-y-2">
                  {found.rules.map((r) => (
                    <li key={r.code} className="rounded-2xl bg-surface-2 p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent" className="font-mono">{r.code}</Badge>
                        <Link className="font-medium hover:underline" href={`/admin/knowledge-base/modules/${r.module}#${r.code}`}>{r.title}</Link>
                      </div>
                      <p className="mt-1.5 text-sm text-muted"><Snippet text={r.snippet} /></p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {found.workflows.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Workflow guides</h3>
                <ul className="space-y-2">
                  {found.workflows.map((w) => (
                    <li key={w.code} className="rounded-2xl bg-surface-2 p-3.5">
                      <Link className="font-medium hover:underline" href={`/admin/knowledge-base/modules/${w.code}`}>{w.title}</Link>
                      <p className="mt-1.5 text-sm text-muted"><Snippet text={w.snippet} /></p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {found.passages.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Lesson passages (examples and wording)</h3>
                <ul className="space-y-2">
                  {found.passages.map((p, i) => (
                    <li key={i} className="rounded-2xl bg-surface-2 p-3.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{p.docTitle}</span>
                        <Badge>{p.collection}</Badge>
                        <Badge tone={p.tier === 1 ? "success" : "neutral"}>Tier {p.tier}</Badge>
                      </div>
                      <p className="mt-1.5 text-sm text-muted"><Snippet text={p.snippet} /></p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted">The playbook rules decide; lesson passages only add detail and examples. Search is by keyword for now; meaning-based search is added when the OpenAI key is connected.</p>
          </div>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Add playbook files" description="The numbered-rule .md files (00_CORE.md, 06_HOOK.md and so on). Adding a file again refreshes it and keeps rules you edited." />
          <FileImporter kind="playbook" accept=".md" label="Choose your playbook .md files" hint="Select many at once. Each rule keeps its ID so the AI can cite it." />
        </Card>
        <Card>
          <CardHeader title="Add course lessons" description="Transcripts (.txt, .vtt, .srt, .md). They are cleaned, split into passages and indexed." />
          <FileImporter
            kind="lessons"
            accept=".txt,.vtt,.srt,.md"
            collections={colls.rows.map((c) => ({ name: c.name, tier: c.authority_tier, mentor: c.mentor }))}
            label="Choose lesson files"
            hint="Pick the course name first. Lessons with garbled audio get a warning you can review."
          />
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Collections" description="Each collection feeds one mentor. Kalorip answers use the Kalorip collections first and fall back to the Brand material when Kalorip has nothing on the question. Brand answers use the Brand collections and the playbook." />
        <ul className="divide-y divide-border p-3 sm:p-4">
          {colls.rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No collections yet. Add lessons above.</li>}
          {colls.rows.map((c) => (
            <li key={c.name} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
              <span className="text-xs text-muted">{c.docs} lessons</span>
              <Badge tone={c.mentor === "kalorip" ? "accent" : "neutral"}>{c.mentor === "kalorip" ? "Kalorip mentor" : "Brand mentor"}</Badge>
              <form action={setCollectionMentorAction}>
                <input type="hidden" name="name" value={c.name} />
                <input type="hidden" name="mentor" value={c.mentor === "kalorip" ? "brand" : "kalorip"} />
                <Button type="submit" variant="ghost" size="sm">Switch to {c.mentor === "kalorip" ? "Brand" : "Kalorip"}</Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Playbook modules" description="Open a module to read, switch off or edit its rules. A switched-off rule is never used." />
        <div className="p-3 sm:p-4">
          {mods.rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No playbook yet. Add your playbook .md files above.</p>
          ) : (
            <ul className="divide-y divide-border">
              {mods.rows.map((m) => (
                <li key={m.code}>
                  <Link href={`/admin/knowledge-base/modules/${m.code}`} className="group flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface-2">
                    <Badge className="font-mono">{m.code.split("_")[0]}</Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.title.replace(/^\d+\s+/, "")}</span>
                      <span className="block text-xs text-muted">
                        {m.kind === "workflow" && Number(m.rules) === 0 ? "Workflow guide" : `${m.rules} rules`}
                        {Number(m.off) > 0 && ` · ${m.off} off`}
                        {!m.active && " · module off"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Lesson library"
          description="Cleaned lessons by course. Tier decides which source wins when two disagree."
          action={
            <Link href="/admin/knowledge-base/lessons">
              <Button variant="secondary" size="sm"><Search className="h-4 w-4" /> Browse</Button>
            </Link>
          }
        />
        <div className="p-5">
          {colls.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No lessons yet.</p>
          ) : (
            <ul className="space-y-2">
              {colls.rows.map((c) => (
                <li key={c.name} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
                  <span className="min-w-0 flex-1 font-medium">{c.name}</span>
                  <Badge>{TIER_LABEL[c.authority_tier]?.split(" · ")[0]}</Badge>
                  <span className="text-sm text-muted">{c.docs} lessons</span>
                </li>
              ))}
            </ul>
          )}
          {stats.flagged > 0 && (
            <p className="mt-4 flex items-center gap-2 text-sm text-warning">
              <TriangleAlert className="h-4 w-4" /> {stats.flagged} lesson{stats.flagged > 1 ? "s have" : " has"} warnings (possible garbled text). Open Browse to review.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
