import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor } from "@/components/text-editor";
import { restorePromptAction, savePromptAction } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  return { title: (await params).key };
}

export default async function PromptPage({ params }: { params: Promise<{ key: string }> }) {
  await requireAdmin();
  const { key } = await params;
  const p = (
    await query<{ id: string; title: string; body: string; original_body: string; placeholders: string[]; version: number }>(
      "select id, title, body, original_body, placeholders, version from admin_prompts where key = $1",
      [key],
    )
  ).rows[0];
  if (!p) notFound();
  const versions = (
    await query<{ version_no: number; note: string; created_at: string }>(
      "select version_no, note, created_at from admin_prompt_versions where prompt_id = $1 order by version_no desc",
      [p.id],
    )
  ).rows;
  const edited = p.body !== p.original_body;
  return (
    <>
      <Link href="/admin/prompts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Prompts
      </Link>
      <PageHeader
        preview={false}
        title={p.title}
        description="Used exactly as written; the app only fills in the blanks. If you change it, say why: every version is kept."
        actions={
          edited ? (
            <form action={restorePromptAction}>
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" variant="secondary" size="sm">Restore the original</Button>
            </form>
          ) : undefined
        }
      />
      {p.placeholders.length > 0 && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          Blanks the app fills in: {p.placeholders.map((b) => <Badge key={b} className="font-mono">{b}</Badge>)}
        </p>
      )}
      <Card className="mb-6">
        <CardHeader title={`Prompt text (version ${p.version})`} />
        <div className="p-5">
          <TextEditor id={p.id} initial={p.body} action={savePromptAction} askNote rows={22} label="Prompt text" />
        </div>
      </Card>
      <Card>
        <CardHeader title="History" />
        <ul className="divide-y divide-border p-3">
          {versions.map((v) => (
            <li key={v.version_no} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <Badge className="font-mono">v{v.version_no}</Badge>
              <span className="min-w-0 flex-1">{v.note || "Edited"}</span>
              <span className="text-xs text-muted">{new Date(v.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
