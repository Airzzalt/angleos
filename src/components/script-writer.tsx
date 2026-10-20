"use client";

import { useState } from "react";
import { Check, Sparkles, Video, ImageIcon, Clapperboard } from "lucide-react";
import { cn } from "@/lib/cn";
import { sampleAngles, sampleProjects, scriptFormats } from "@/lib/placeholder";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";

const groupIcon = { Video, Static: ImageIcon, Animated: Clapperboard } as const;

export function ScriptWriter() {
  const [picked, setPicked] = useState<string[]>(["ugc"]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="p-5">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">1. Choose formats</h2>
            <Badge tone="accent">{picked.length} selected</Badge>
          </div>
          <p className="mb-5 text-sm text-muted">Pick one or several. Each format gets its own saved script under the same project and angle.</p>
          <div className="space-y-6">
            {(Object.keys(scriptFormats) as (keyof typeof scriptFormats)[]).map((group) => {
              const Icon = groupIcon[group];
              return (
                <fieldset key={group}>
                  <legend className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    <Icon className="h-4 w-4" /> {group}
                  </legend>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {scriptFormats[group].map((f) => {
                      const on = picked.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          className={cn(
                            "flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                            on ? "border-accent bg-accent-soft" : "border-border bg-surface-2/50 hover:border-border-strong",
                          )}
                        >
                          <input type="checkbox" checked={on} onChange={() => toggle(f.id)} className="sr-only" />
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                              on ? "border-accent bg-accent text-white" : "border-border-strong",
                            )}
                            aria-hidden
                          >
                            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-medium leading-tight">{f.name}</span>
                            <span className="block text-xs text-muted">{f.note}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-4 p-5">
          <h2 className="text-[17px] font-semibold tracking-tight">2. Set it up</h2>
          <div>
            <Label htmlFor="sw-project">Project</Label>
            <Select id="sw-project">
              {sampleProjects.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sw-angle">Angle (optional)</Label>
            <Select id="sw-angle">
              <option>Let AngleOS choose</option>
              {sampleAngles.map((a) => (
                <option key={a.id}>{a.subAvatar}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sw-ref">Reference ad (optional)</Label>
            <Input id="sw-ref" placeholder="Pick from Swipe File, search Get Hooked or paste a link" />
          </div>
          <div>
            <Label htmlFor="sw-ctx">Request context</Label>
            <Textarea id="sw-ctx" placeholder="One-off notes, e.g. “make this for Black Friday”" className="min-h-24" />
          </div>
          <Button disabled className="h-12 w-full">
            <Sparkles className="h-4 w-4" />
            Generate {picked.length > 1 ? `${picked.length} scripts` : "script"}
          </Button>
          <p className="text-center text-xs text-muted">Script generation is switched on in Phase 4.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">What you'll get</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Decision summary with the playbook rule behind each choice</li>
            <li>Script table: words and visual direction</li>
            <li>Alternate hooks</li>
            <li>Proof table: every claim and its backing</li>
            <li>Self-check results, then chat to refine</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
