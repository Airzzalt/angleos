import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { FileImporter } from "@/components/file-importer";

export const metadata = { title: "Prompts" };

export default async function PromptsPage() {
  await requireAdmin();
  const { rows } = await query<{ key: string; title: string; version: number; body: string; original_body: string; placeholders: string[] }>(
    "select key, title, version, body, original_body, placeholders from admin_prompts order by key",
  );
  return (
    <>
      <PageHeader
        preview={false}
        title="Prompts"
        description="The Evolve prompts, used exactly as written. Stored privately in the database. Only admins can see them; other users never see prompt text."
      />
      <Card className="mb-6">
        <CardHeader title="Add prompt files" description="The .txt files exported from the Evolve documents. Adding a file again replaces that prompt with the new text." />
        <FileImporter kind="prompts" accept=".txt,.md" label="Choose your prompt .txt files" hint="Each file becomes one prompt. The blanks (like INSERT PRODUCT URL) are found automatically." />
      </Card>
      <Card>
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">No prompts yet. Add your prompt files above.</p>
        ) : (
          <ul className="divide-y divide-border p-2">
            {rows.map((p) => (
              <li key={p.key}>
                <Link href={`/admin/prompts/${p.key}`} className="group flex min-h-[68px] flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-4 py-3 transition-colors hover:bg-surface-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    <Lock className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {p.body.split(/\s+/).length.toLocaleString()} words
                      {p.placeholders.length > 0 && ` · blanks: ${p.placeholders.join(", ")}`}
                    </span>
                  </span>
                  {p.body !== p.original_body && <Badge>edited</Badge>}
                  <Badge className="font-mono">v{p.version}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
