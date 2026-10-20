import { Lock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { promptFiles } from "@/lib/placeholder";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";

export const metadata = { title: "Prompts" };

export default async function PromptsPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Prompts"
        description="The Evolve prompts, used exactly as written. Only admins can see them. Other users never see prompt text."
      />
      <Card>
        <ul className="divide-y divide-border">
          {promptFiles.map((p) => (
            <li key={p.file} className="flex min-h-[68px] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                <Lock className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.name}</span>
                <span className="block truncate text-sm text-muted">{p.use}</span>
              </span>
              <Badge className="font-mono">{p.file}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
