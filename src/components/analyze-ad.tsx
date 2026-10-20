"use client";

import { useState } from "react";
import { Crosshair, Link2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

const sources = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "link", label: "Link", icon: Link2 },
  { id: "gethooked", label: "Get Hooked", icon: Crosshair },
] as const;

const sections = [
  ["What the ad is", "45-second UGC testimonial, handheld, captions on.", "FORMAT-02"],
  ["Avatar and desire", "Tired shift workers who want deep sleep in daylight.", "RES-05"],
  ["Hook breakdown", "Opens with a pattern interrupt: “I haven't slept properly in 6 years.”", "HOOK-04"],
  ["Why it works", "1. Specific, relatable pain  2. Proof shown not told  3. Low-friction offer", "SCRIPT-11"],
  ["Weaknesses", "Claim at 0:32 has no supporting proof on screen.", "BELIEF-03"],
];

export function AnalyzeAd() {
  const [src, setSrc] = useState<(typeof sources)[number]["id"]>("upload");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card className="space-y-4 p-5 lg:col-span-2">
        <div className="inline-flex gap-1 rounded-full border border-border bg-surface-2 p-1" role="tablist">
          {sources.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={src === s.id}
              onClick={() => setSrc(s.id)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition",
                src === s.id ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
              )}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </div>

        {src === "upload" && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong px-4 py-10 text-center">
            <Upload className="mb-2 h-6 w-6 text-muted" />
            <p className="font-medium">Drop a video or image</p>
            <p className="mt-1 text-sm text-muted">MP4, MOV, PNG, JPG</p>
          </div>
        )}
        {src === "link" && (
          <div>
            <Label htmlFor="an-link">Ad link</Label>
            <Input id="an-link" type="url" placeholder="https://" />
          </div>
        )}
        {src === "gethooked" && (
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
            Search Get Hooked, pick an ad, and it lands here. Connected in Phase 6.
          </p>
        )}

        <div>
          <Label htmlFor="an-niche">Niche</Label>
          <Input id="an-niche" placeholder="e.g. Sleep and wellness" />
        </div>
        <div>
          <Label htmlFor="an-desc">Short description</Label>
          <Textarea id="an-desc" className="min-h-24" placeholder="What is this ad selling, and who is it for?" />
        </div>
        <Button disabled className="h-12 w-full">Analyze ad</Button>
        <p className="text-center text-xs text-muted">Analysis is switched on in Phase 5.</p>
      </Card>

      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[17px] font-semibold tracking-tight">Sample breakdown</h2>
          <Badge tone="accent">Sample</Badge>
        </div>
        <dl className="divide-y divide-border">
          {sections.map(([title, body, rule]) => (
            <div key={title} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm font-semibold">{title}</dt>
                <Badge className="font-mono">{rule}</Badge>
              </div>
              <dd className="mt-1 text-sm text-muted">{body}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" size="sm" disabled>Save to Swipe File</Button>
          <Button variant="secondary" size="sm" disabled>Use as reference</Button>
        </div>
      </Card>
    </div>
  );
}
