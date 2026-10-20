import Link from "next/link";
import { ArrowUpRight, Clapperboard } from "lucide-react";
import { studioStyles } from "@/lib/placeholder";
import { PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";

export const metadata = { title: "Animated Ad Studio" };

export default function StudioPage() {
  return (
    <>
      <PageHeader
        title="Animated Ad Studio"
        description="Guided workflows for seven animated styles. AngleOS writes the scripts and prompts; you make the images and video in other tools."
      />
      <div className="animate-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {studioStyles.map((s) => (
          <Link key={s.id} href={`/studio/${s.id}`}>
            <Card className="group h-full p-5 transition hover:border-border-strong hover:bg-surface-2/50">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Clapperboard className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-5 w-5 text-muted transition group-hover:text-fg" />
              </div>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight">{s.name}</h2>
              <p className="mt-1 text-sm text-muted">{s.blurb}</p>
              <div className="mt-4">
                <Badge>{s.steps} steps</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
