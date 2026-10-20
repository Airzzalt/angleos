import { Compass, Heart, PenLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { sampleAngles, sampleProjects } from "@/lib/placeholder";
import { CardGridSkeleton, EmptyState, PageHeader, previewState } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";

export const metadata = { title: "Angle Generator" };

export default async function AnglesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState(await searchParams);
  return (
    <>
      <PageHeader title="Angle Generator" description="Turn a project's research into testable angles, each with evidence and sample hooks." />

      <Card className="mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div>
            <Label htmlFor="project">Project</Label>
            <Select id="project">
              {sampleProjects.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="count">How many angles</Label>
            <Select id="count" defaultValue="6">
              <option>3</option>
              <option>6</option>
              <option>9</option>
              <option>12</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="mode">Approach</Label>
            <Select id="mode">
              <option>Marksman: broad across sub-avatars</option>
              <option>Sniper: deep on one angle</option>
            </Select>
          </div>
          <Button disabled className="h-12">
            <Sparkles className="h-4 w-4" /> Generate angles
          </Button>
        </div>
      </Card>

      {state === "loading" ? (
        <CardGridSkeleton count={3} />
      ) : state === "empty" ? (
        <EmptyState icon={Compass} title="No angles yet" description="Choose a project above and generate your first set of angles." />
      ) : (
        <div className="animate-fade-up grid grid-cols-1 gap-4 lg:grid-cols-3">
          {sampleAngles.map((a) => (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="accent">{a.awareness}</Badge>
                <button className="text-muted transition hover:text-danger" aria-label="Favourite this angle">
                  <Heart className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">{a.subAvatar}</p>
              <h2 className="mt-1 text-[17px] font-semibold leading-snug tracking-tight">{a.angle}</h2>
              <p className="mt-2 text-sm text-muted">Desire: {a.desire}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {a.hooks.map((h) => (
                  <li key={h} className="rounded-lg bg-surface-2 px-3 py-2">{h}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-warning">Risk: {a.risk}</p>
              <Link href="/scripts" className="mt-auto pt-5">
                <Button variant="secondary" size="sm" className="w-full">
                  <PenLine className="h-4 w-4" /> Send to Script Writer
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
