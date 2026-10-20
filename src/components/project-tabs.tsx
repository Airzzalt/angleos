"use client";

import { useState } from "react";
import { AlertTriangle, Check, FileText, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { contextChecklist } from "@/lib/placeholder";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";

const tabs = ["Brief", "Files", "Context", "Angles", "Scripts", "Analyses", "Swipe"] as const;

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90" role="img" aria-label={`Context score ${score} out of 10`}>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-surface-3" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        className="stroke-accent"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 10)}
      />
    </svg>
  );
}

const statusIcon = {
  ok: <Check className="h-4 w-4 text-success" />,
  thin: <Minus className="h-4 w-4 text-warning" />,
  missing: <AlertTriangle className="h-4 w-4 text-danger" />,
} as const;

export function ProjectTabs({ score }: { score: number }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Brief");
  return (
    <div>
      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Project sections">
        <div className="inline-flex gap-1 rounded-full border border-border bg-surface p-1">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "h-9 whitespace-nowrap rounded-full px-4 text-sm font-medium transition",
                tab === t ? "bg-surface-3 text-fg" : "text-muted hover:text-fg",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Brief" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Product brief" description="Every line shows the file it came from. Your edits always win." />
            <dl className="mt-4 divide-y divide-border px-5 pb-3">
              {[
                ["Offer", "Aurora Sleep Mask, $59 AUD, 30-day guarantee", "offer-doc.pdf"],
                ["Core desire", "Fall asleep fast and stay asleep without medication", "avatar-research.docx"],
                ["Awareness level", "Problem aware", "market-notes.md"],
                ["Sophistication stage", "Stage 3 (mechanism-led claims)", "competitor-ads.csv"],
                ["Mechanism", "Contoured blackout shell with zero eye pressure", "product-doc.pdf"],
              ].map(([k, v, f]) => (
                <div key={k} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[170px_1fr]">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd>
                    <p className="font-medium">{v}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <FileText className="h-3 w-3" /> {f}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
          <ScoreCard score={score} />
        </div>
      )}

      {tab === "Context" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="space-y-3 p-5 lg:col-span-2">
            <h2 className="text-[17px] font-semibold tracking-tight">Project context</h2>
            <p className="text-sm text-muted">Extra notes on this product. Used on every generation, after your account context.</p>
            <Textarea defaultValue="Skews female, 28 to 45. Never call it a cure. Lead with the daylight-sleeping angle for shift workers." className="min-h-40" />
          </Card>
          <ScoreCard score={score} />
        </div>
      )}

      {!["Brief", "Context"].includes(tab) && (
        <Card className="px-6 py-16 text-center">
          <p className="font-medium">{tab} for this project</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">This tab fills with real content as each feature is built. The layout is final.</p>
        </Card>
      )}
    </div>
  );
}

function ScoreCard({ score }: { score: number }) {
  return (
    <Card>
      <CardHeader title="Context score" description="How complete this project's context is" />
      <div className="flex items-center gap-5 px-5 py-5">
        <div className="relative shrink-0">
          <ScoreRing score={score} />
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">{score.toFixed(1)}</span>
        </div>
        <p className="text-sm text-muted">Almost there. Add customer quotes to lift the score.</p>
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {contextChecklist.map((c) => (
          <li key={c.item} className="flex min-h-11 items-center gap-3 px-5 py-2.5 text-sm">
            {statusIcon[c.status]}
            <span className="flex-1">{c.item}</span>
            {c.status !== "ok" && <Badge tone={c.status === "thin" ? "warning" : "danger"}>{c.status === "thin" ? "Thin" : "Missing"}</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
