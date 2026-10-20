import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";

export const metadata = { title: "Lessons" };

type Doc = { id: string; title: string; lesson_ref: string; collection: string; word_count: number; quality_flags: { kind: string; note: string }[] };

export default async function LessonsPage() {
  await requireAdmin();
  const { rows } = await query<Doc>(
    `select d.id, d.title, d.lesson_ref, c.name as collection, d.word_count, d.quality_flags
       from kb_documents d join kb_collections c on c.id = d.collection_id
      order by c.authority_tier, c.name, d.source_file_name`,
  );
  const groups = new Map<string, Doc[]>();
  for (const d of rows) groups.set(d.collection, [...(groups.get(d.collection) ?? []), d]);

  return (
    <>
      <Link href="/admin/knowledge-base" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Knowledge Base
      </Link>
      <PageHeader preview={false} title="Lesson library" description="Every lesson as cleaned text. Lessons with a warning may have garbled audio." />
      {rows.length === 0 && <Card className="p-6 text-center text-sm text-muted">No lessons yet. Add them on the Knowledge Base page.</Card>}
      <div className="space-y-6">
        {[...groups.entries()].map(([name, docs]) => (
          <Card key={name}>
            <div className="px-6 pt-5">
              <h2 className="text-[17px] font-semibold">{name}</h2>
              <p className="text-sm text-muted">{docs.length} lessons</p>
            </div>
            <ul className="divide-y divide-border p-2">
              {docs.map((d) => (
                <li key={d.id}>
                  <Link href={`/admin/knowledge-base/lessons/${d.id}`} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-2.5 transition-colors hover:bg-surface-2">
                    <span className="min-w-0 flex-1 truncate">
                      {d.lesson_ref && <span className="mr-2 text-xs text-muted">{d.lesson_ref}</span>}
                      <span className="font-medium">{d.title}</span>
                    </span>
                    {d.quality_flags.length > 0 && (
                      <Badge tone="warning"><TriangleAlert className="h-3 w-3" /> {d.quality_flags.length}</Badge>
                    )}
                    <span className="text-xs text-muted">{d.word_count} words</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
