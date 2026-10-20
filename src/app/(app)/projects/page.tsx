import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { sampleProjects } from "@/lib/placeholder";
import { CardGridSkeleton, EmptyState, PageHeader, previewState } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Projects" };

const newButton = (
  <Link href="/projects/new">
    <Button>
      <Plus className="h-4 w-4" /> New project
    </Button>
  </Link>
);

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState(await searchParams);
  return (
    <>
      <PageHeader title="Projects" description="One project per product. Everything you make lives inside it." actions={newButton} />
      {state === "loading" ? (
        <CardGridSkeleton />
      ) : state === "empty" ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create a project and upload your research zip. AngleOS builds a product brief you can review and edit."
          action={newButton}
        />
      ) : (
        <div className="animate-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sampleProjects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full p-5 transition hover:border-border-strong hover:bg-surface-2/50">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[17px] font-semibold leading-snug tracking-tight">{p.name}</h2>
                  <Badge tone={p.score >= 7 ? "success" : p.score >= 5 ? "warning" : "danger"}>{p.score.toFixed(1)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {p.niche} · {p.market}
                </p>
                <div className="mt-5 flex items-center gap-4 text-sm text-muted">
                  <span><b className="font-semibold text-fg">{p.scripts}</b> scripts</span>
                  <span><b className="font-semibold text-fg">{p.angles}</b> angles</span>
                  <span className="ml-auto text-xs">{p.updated}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
