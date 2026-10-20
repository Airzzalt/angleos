import { Bookmark, Play, Search } from "lucide-react";
import { sampleSwipe } from "@/lib/placeholder";
import { CardGridSkeleton, EmptyState, PageHeader, previewState } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export const metadata = { title: "Swipe File" };

export default async function SwipePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState(await searchParams);
  return (
    <>
      <PageHeader title="Swipe File" description="Ads worth learning from, with their analysis, tags and notes." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input className={cn(inputClass, "h-12 pl-11")} placeholder="Search by brand, hook, tag…" aria-label="Search swipe file" />
        </div>
        <Select className="sm:w-48" aria-label="Format">
          <option>All formats</option>
          <option>UGC</option>
          <option>VSL</option>
          <option>Skeleton</option>
          <option>Static ad</option>
        </Select>
      </div>

      {state === "loading" ? (
        <CardGridSkeleton />
      ) : state === "empty" ? (
        <EmptyState
          icon={Bookmark}
          title="Your swipe file is empty"
          description="Analyze an ad or save one from Get Hooked and it will appear here."
        />
      ) : (
        <div className="animate-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sampleSwipe.map((s) => (
            <Card key={s.id} className="overflow-hidden transition hover:border-border-strong">
              <div className={`relative flex aspect-video items-center justify-center bg-gradient-to-br ${s.gradient}`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                  <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
                </span>
                <Badge className="absolute left-3 top-3 bg-black/40 text-white backdrop-blur">{s.format}</Badge>
              </div>
              <div className="p-4">
                <h2 className="line-clamp-2 font-semibold leading-snug">{s.title}</h2>
                <p className="mt-0.5 text-sm text-muted">{s.brand}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <Button variant="secondary" size="sm" className="mt-4 w-full" disabled>
                  Use as reference
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
