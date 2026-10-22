import Link from "next/link";
import { Compass, Heart, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { QuickStartForm } from "@/components/project-forms";

export const metadata = { title: "Angle Generator" };

type ProjectRow = { id: string; name: string; kind: string; files: string; angles: string };
type AngleRow = { id: string; project_id: string; project_name: string; favourite: boolean; data: { angle: string; sub_avatar: string; awareness: string } };

export default async function AnglesPage() {
  const me = await requireUser();
  const projects = (
    await query<ProjectRow>(
      `select p.id, p.name, p.kind,
              (select count(*) from project_files f where f.project_id = p.id) as files,
              (select count(*) from project_angles a where a.project_id = p.id) as angles
         from projects p
        where p.owner_id = $1 or ($2::uuid is not null and p.workspace_id = $2::uuid)
        order by p.updated_at desc limit 30`,
      [me.id, me.workspaceId],
    )
  ).rows;
  const recent = (
    await query<AngleRow>(
      `select a.id, a.project_id, p.name as project_name, a.favourite, a.data
         from project_angles a join projects p on p.id = a.project_id
        where p.owner_id = $1 or ($2::uuid is not null and p.workspace_id = $2::uuid)
        order by a.favourite desc, a.created_at desc, a.position limit 6`,
      [me.id, me.workspaceId],
    )
  ).rows;
  return (
    <>
      <PageHeader preview={false} title="Angle Generator" description="Turn research into testable angles, each with hooks and the reasons behind it. Upload loose files or a zip. A product brief is optional." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Use one of your projects" description="Opens the Angles tab of the project, where you can add research and generate." />
            {projects.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted">No projects yet. Use quick start on the right, or create a full project.</p>
            ) : (
              <ul className="divide-y divide-border p-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}?tab=angles`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 transition hover:bg-surface-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      {p.kind === "quick" && <Badge tone="accent">Quick</Badge>}
                      <span className="text-xs text-muted">{p.files} files</span>
                      <span className="text-xs text-muted">{p.angles} angles</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div>
            <h2 className="mb-3 text-[17px] font-semibold tracking-tight">Favourites and latest</h2>
            {recent.length === 0 ? (
              <EmptyState icon={Compass} title="No angles yet" description="Pick a project or use quick start, add your research, and generate your first set of angles." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {recent.map((a) => (
                  <Link key={a.id} href={`/projects/${a.project_id}?tab=angles`}>
                    <Card interactive className="h-full p-5">
                      <div className="flex items-center justify-between gap-2">
                        {a.data.awareness ? <Badge tone="accent">{a.data.awareness}</Badge> : <span />}
                        {a.favourite && <Heart className="h-4 w-4 fill-current text-danger" aria-label="Favourite" />}
                      </div>
                      <p className="mt-3 break-words font-semibold leading-snug">{a.data.angle}</p>
                      <p className="mt-2 truncate text-xs text-muted">{a.project_name}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Quick start" description="For a fast test store. Just a name, then drop in whatever research you have." action={<Zap className="h-5 w-5 text-accent" />} />
            <div className="p-6">
              <QuickStartForm />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
