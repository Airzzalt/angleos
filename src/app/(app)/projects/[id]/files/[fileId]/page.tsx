import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";

export const metadata = { title: "File" };
const SHOW = 40_000;

export default async function FilePage({ params }: { params: Promise<{ id: string; fileId: string }> }) {
  const me = await requireUser();
  const { id, fileId } = await params;
  const project = await getProject(me, id);
  if (!project || !/^[0-9a-f-]{36}$/i.test(fileId)) notFound();
  const f = (
    await query<{ file_name: string; file_type: string; word_count: number; char_count: number; source_zip: string | null; flags: { note: string }[]; text: string }>(
      `select file_name, file_type, word_count, char_count, source_zip, flags, left(extracted_text, ${SHOW}) as text
         from project_files where id = $1 and project_id = $2`,
      [fileId, project.id],
    )
  ).rows[0];
  if (!f) notFound();
  return (
    <>
      <Link href={`/projects/${project.id}?tab=files`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {project.name} · Files
      </Link>
      <PageHeader
        preview={false}
        title={f.file_name.split("/").pop() ?? f.file_name}
        description={`${f.word_count.toLocaleString()} words${f.source_zip ? ` · from ${f.source_zip}` : ""}. This is the text the AI will read, not the original file.`}
      />
      {f.flags.map((fl, i) => (
        <p key={i} className="mb-3 text-sm text-warning">
          <Badge tone="warning" className="mr-2">Note</Badge>
          {fl.note}
        </p>
      ))}
      <Card className="p-6">
        {/* Plain text only. Never rendered as HTML. */}
        <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed">{f.text}</pre>
        {f.char_count > SHOW && <p className="mt-4 text-sm text-muted">Showing the first {SHOW.toLocaleString()} characters of {f.char_count.toLocaleString()}.</p>}
      </Card>
    </>
  );
}
