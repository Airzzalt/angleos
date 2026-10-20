import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteLessonAction } from "../../actions";

export const metadata = { title: "Lesson" };

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = (
    await query<{ id: string; title: string; lesson_ref: string; clean_text: string; collection: string; authority_tier: number; quality_flags: { kind: string; note: string }[] }>(
      `select d.id, d.title, d.lesson_ref, d.clean_text, c.name as collection, d.authority_tier, d.quality_flags
         from kb_documents d join kb_collections c on c.id = d.collection_id where d.id = $1`,
      [id],
    )
  ).rows[0];
  if (!d) notFound();
  return (
    <>
      <Link href="/admin/knowledge-base/lessons" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Lesson library
      </Link>
      <PageHeader
        preview={false}
        title={d.title}
        description={`${d.collection}${d.lesson_ref ? ` · ${d.lesson_ref}` : ""} · Tier ${d.authority_tier}`}
        actions={
          <form action={deleteLessonAction}>
            <input type="hidden" name="id" value={d.id} />
            <Button type="submit" variant="danger" size="sm">Delete lesson</Button>
          </form>
        }
      />
      {d.quality_flags.length > 0 && (
        <Card className="mb-6 space-y-1.5 p-5">
          {d.quality_flags.map((f) => (
            <p key={f.kind} className="flex items-start gap-2 text-sm text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {f.note}
            </p>
          ))}
          <div className="pt-1"><Badge tone="warning">Don't rely on garbled parts</Badge></div>
        </Card>
      )}
      <Card className="p-6">
        <div className="space-y-4 text-[15px] leading-relaxed">
          {d.clean_text.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Card>
    </>
  );
}
