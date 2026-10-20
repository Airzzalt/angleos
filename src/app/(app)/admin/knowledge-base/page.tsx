import { FileUp, FlaskConical, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminStats } from "@/lib/placeholder";
import { PageHeader } from "@/components/page";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export const metadata = { title: "Knowledge Base" };

export default async function KnowledgeBasePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Knowledge Base" description="Your course material: the playbook rules and the searchable lesson library. Visible to admins only." />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {adminStats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight">{s.value}</p>
            <p className="mt-2 text-xs text-muted">{s.note}</p>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Add course files" description="Upload transcripts (.txt, .vtt, .md, .pdf), many at once." />
          <div className="p-5">
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong px-4 py-10 text-center">
              <FileUp className="mb-2 h-6 w-6 text-muted" />
              <p className="font-medium">Drop files here</p>
              <p className="mt-1 text-sm text-muted">Cleaned, split and indexed in Phase 1</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Test the brain" description="Ask a question and see which rules and passages would be used." />
          <div className="space-y-3 p-5">
            <Textarea className="min-h-24" placeholder="e.g. What hook type works for a problem-aware audience?" />
            <Button disabled>
              <FlaskConical className="h-4 w-4" /> Run test
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Playbook rules" description="Each rule has an ID, a reason and its source. Switch one off and it stops being used." />
          <div className="p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                disabled
                aria-label="Search rules"
                placeholder="Search rules (available in Phase 1)"
                className="h-12 w-full rounded-xl border border-border bg-surface-2 pl-11 pr-4 text-[15px] opacity-60"
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
