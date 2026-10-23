import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteProjectButton } from "@/components/delete-project-button";

export const metadata = { title: "Projects" };

const newButton = (
  <Link href="/projects/new">
    <Button>
      <Plus className="h-4 w-4" /> New project
    </Button>
  </Link>
);

type Row = { id: string; owner_id: string; name: string; kind: string; niche: string; market: string; updated_at: string; files: string; words: string };

export default async function ProjectsPage() {
  const me = await requireUser();
  const { rows } = await query<Row>(
    `select p.id, p.owner_id, p.name, p.kind, p.niche, p.market, p.updated_at,
            (select count(*) from project_files f where f.project_id = p.id) as files,
            (select coalesce(sum(word_count),0) from project_files f where f.project_id = p.id) as words
       from projects p
      where p.owner_id = $1 or ($2::uuid is not null and p.workspace_id = $2::uuid)
      order by p.updated_at desc`,
    [me.id, me.workspaceId],
  );
  return (
    <>
      <PageHeader preview={false} title="Projects" description="One project per product. Everything you make lives inside it." actions={newButton} />
      {rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create a project, then upload your research. AngleOS keeps the text so it can build a product brief you can review and edit."
          action={newButton}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p, i) => (
            <div key={p.id} className="reveal relative" style={{ "--i": i } as React.CSSProperties}>
            <Link href={`/projects/${p.id}`} className="block h-full">
              <Card interactive className="h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[17px] font-semibold leading-snug tracking-tight">{p.name}</h2>
                  <span className="flex shrink-0 gap-1.5">
                    {p.kind === "quick" && <Badge tone="accent">Quick</Badge>}
                    {Number(p.files) === 0 && <Badge tone="warning">No files yet</Badge>}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{[p.niche, p.market].filter(Boolean).join(" · ") || "No niche set"}</p>
                <div className="mt-5 flex items-center gap-4 text-sm text-muted">
                  <span>
                    <b className="font-semibold text-fg">{p.files}</b> files
                  </span>
                  <span>
                    <b className="font-semibold text-fg">{Number(p.words).toLocaleString()}</b> words
                  </span>
                  <span className={`ml-auto text-xs ${p.owner_id === me.id || me.role === "admin" ? "pr-9" : ""}`}>
                    {new Date(p.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </Card>
            </Link>
            {(p.owner_id === me.id || me.role === "admin") && <DeleteProjectButton projectId={p.id} name={p.name} className="absolute bottom-2 right-2" />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
