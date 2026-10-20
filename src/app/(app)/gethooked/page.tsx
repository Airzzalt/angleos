import { Bookmark, Crosshair, Play, ScanSearch, Search } from "lucide-react";
import { sampleHookd } from "@/lib/placeholder";
import { CardGridSkeleton, EmptyState, PageHeader, previewState } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export const metadata = { title: "Get Hooked Search" };

export default async function GetHookedPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState(await searchParams);
  return (
    <>
      <PageHeader title="Get Hooked Search" description="Find competitor ads by niche, brand or keyword, then analyze, save or use them as a reference." />

      <Card className="mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="lg:col-span-2">
            <Label htmlFor="gh-q">Keywords or brand</Label>
            <Input id="gh-q" placeholder="e.g. sleep mask" />
          </div>
          <div>
            <Label htmlFor="gh-niche">Niche</Label>
            <Select id="gh-niche">
              <option>All niches</option>
              <option>Health and wellness</option>
              <option>Beauty</option>
              <option>Home</option>
            </Select>
          </div>
          <Button disabled className="h-12">
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">Search uses Get Hooked credits. The live connection is built in Phase 6. You can always upload an ad by hand instead.</p>
      </Card>

      {state === "loading" ? (
        <CardGridSkeleton count={4} />
      ) : state === "empty" ? (
        <EmptyState icon={Crosshair} title="No ads found" description="Try a broader keyword or a different niche." />
      ) : (
        <div className="animate-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sampleHookd.map((g) => (
            <Card key={g.id} className="overflow-hidden">
              <div className={`relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br ${g.gradient}`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                  <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
                </span>
                <Badge tone="success" className="absolute left-3 top-3">{g.score}</Badge>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold">{g.brand}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted">{g.copy}</p>
                <p className="mt-2 text-xs text-muted">Running {g.days} days</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" disabled>
                    <ScanSearch className="h-4 w-4" /> Analyze
                  </Button>
                  <Button variant="secondary" size="icon-sm" disabled aria-label="Save to swipe file">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
