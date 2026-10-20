import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Circle, Sparkles, Wrench } from "lucide-react";
import { sampleStudioSteps, studioStyles } from "@/lib/placeholder";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";

export default async function StudioStylePage({ params }: { params: Promise<{ style: string }> }) {
  const { style } = await params;
  const s = studioStyles.find((x) => x.id === style);
  if (!s) notFound();
  return (
    <>
      <Link href="/studio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> All styles
      </Link>
      <PageHeader title={s.name} description={s.blurb} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-[17px] font-semibold tracking-tight">Steps</h2>
            <p className="text-sm text-muted">Sample outline. The real {s.steps} steps load from the course in Phase 5b.</p>
          </div>
          <ol className="divide-y divide-border">
            {sampleStudioSteps.map((step, i) => (
              <li key={step.title} className="flex min-h-[68px] items-center gap-4 px-5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-muted">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{step.title}</span>
                  <span className="block text-sm text-muted">{step.note}</span>
                </span>
                {step.kind === "ai" ? (
                  <Badge tone="accent"><Sparkles className="h-3 w-3" /> AI writes</Badge>
                ) : (
                  <Badge><Wrench className="h-3 w-3" /> Outside tool</Badge>
                )}
                <Circle className="h-5 w-5 shrink-0 text-border-strong" aria-label="Not done" />
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">How this works</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-muted">
            <li>AngleOS writes scripts, lyrics, storyboards and prompts.</li>
            <li>Images, video, voice and editing happen in other tools. AngleOS never makes media.</li>
            <li>Every prompt has a copy button, and you tick each step when it's done.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
