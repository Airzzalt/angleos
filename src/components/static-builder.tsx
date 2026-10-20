"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { sampleProjects } from "@/lib/placeholder";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

const headlines = [
  "Night shift? Sleep like it's midnight.",
  "Blackout curtains weren't dark enough.",
  "Finally, daytime sleep that works.",
  "Your brain thinks it's a shift. Fix that.",
  "Zero pressure. Total darkness.",
  "The sleep mask shift workers swear by.",
  "Stop losing sleep to sunlight.",
  "Sleep through the school run.",
  "Eight hours, even at 8am.",
];

const steps = ["Inputs", "Nine headlines", "Concept"] as const;

export function StaticBuilder() {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<number[]>([0, 4, 6]);
  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => setStep(i)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                step === i ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-fg",
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-xs">{i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="max-w-2xl space-y-4 p-6">
          <div>
            <Label htmlFor="st-project">Project</Label>
            <Select id="st-project">
              {sampleProjects.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="st-avatar">Avatar or sub-avatar</Label>
            <Input id="st-avatar" defaultValue="Night-shift nurses" />
          </div>
          <div>
            <Label htmlFor="st-product">Product name and short description</Label>
            <Input id="st-product" defaultValue="Aurora Sleep Mask: a contoured blackout sleep mask" />
          </div>
          <Button onClick={() => setStep(1)}>Continue to headlines</Button>
        </Card>
      )}

      {step === 1 && (
        <div>
          <p className="mb-4 text-sm text-muted">Pick your favourites. The top three go forward by default.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {headlines.map((h, i) => {
              const on = picked.includes(i);
              return (
                <button
                  key={h}
                  onClick={() => toggle(i)}
                  aria-pressed={on}
                  className={cn(
                    "relative min-h-[96px] rounded-card border p-4 pr-10 text-left transition",
                    on ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span className="text-xs text-muted">Headline {i + 1}</span>
                  <span className="mt-1 block text-[16px] font-semibold leading-snug">{h}</span>
                  {on && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={() => setStep(2)} disabled={picked.length === 0}>
              Build {picked.length} concept{picked.length === 1 ? "" : "s"}
            </Button>
            <span className="text-sm text-muted">Sample headlines only</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="overflow-hidden lg:col-span-2">
            <div className="flex aspect-[4/5] flex-col justify-between bg-gradient-to-br from-blue-500/30 to-violet-500/30 p-6">
              <p className="text-2xl font-bold leading-tight">{headlines[picked[0] ?? 0]}</p>
              <ul className="space-y-1.5 text-sm font-medium">
                {["Total darkness, zero pressure", "Soft on skin, stays put all night", "30-day guarantee"].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" strokeWidth={3} /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <Card className="space-y-4 p-5 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-tight">Concept</h2>
              <Badge tone="accent">Sample</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Image description</p>
              <p className="mt-1 text-sm">A nurse in scrubs asleep in a bright bedroom at 2pm, wearing the mask, sunlight blazing through the window.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Call-outs</p>
              <p className="mt-1 text-sm">“2pm” arrow to the window · “Still asleep” arrow to the mask</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Primary text</p>
              <p className="mt-1 text-sm">Night shifts are hard enough. Sleeping through the day shouldn't be. Meet the mask built for daytime sleepers…</p>
            </div>
            <Button variant="secondary" disabled>
              <Sparkles className="h-4 w-4" /> Regenerate with AI
            </Button>
            <p className="text-xs text-muted">The Static Ad Builder is switched on in Phase 5b.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
