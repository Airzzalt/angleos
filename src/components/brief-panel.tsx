"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { cancelJobAction, jobStatusAction, saveBriefSectionAction, startBriefAction, type BriefState } from "@/app/(app)/projects/brief-actions";

type Job = { id: string; status: string; done: number; total: number; message: string; error: string | null; spentCents: number } | null;
export type PlanView = { estCents: number; capCents: number; files: number; needRead: number; willRead: number; includeWrite: boolean } | null;

const aud = (c: number) => `A$${(c / 100).toFixed(2)}`;

export function BuildPanel({ projectId, plan, blocked, job, hasBrief, creditLine }: { projectId: string; plan: PlanView; blocked: string | null; job: Job; hasBrief: boolean; creditLine: string }) {
  const router = useRouter();
  const [live, setLive] = useState<Job>(job);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const running = live && (live.status === "queued" || live.status === "running");
  const wasRunning = useRef(!!running);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const j = await jobStatusAction(projectId);
      if (j) setLive(j);
    }, 2500);
    return () => clearInterval(t);
  }, [running, projectId]);

  useEffect(() => {
    if (wasRunning.current && !running) router.refresh();
    wasRunning.current = !!running;
  }, [running, router]);

  function go() {
    if (!plan) return;
    setError("");
    start(async () => {
      const res = await startBriefAction(projectId, plan.estCents);
      if (res?.error) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      setConfirming(false);
      const j = await jobStatusAction(projectId);
      if (j) setLive(j);
    });
  }

  if (running && live) {
    const pct = live.total ? Math.round((live.done / live.total) * 100) : 5;
    return (
      <div className="space-y-3" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-accent" /> Working on it
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(5, pct)}%` }} />
        </div>
        <p className="text-sm text-muted">{live.message}</p>
        <p className="text-xs text-muted">Spent so far: {aud(live.spentCents)}. You can leave this page; it keeps going.</p>
        <Button variant="secondary" size="sm" onClick={() => start(async () => { await cancelJobAction(projectId); const j = await jobStatusAction(projectId); if (j) setLive(j); })} disabled={pending}>
          <X className="h-4 w-4" /> Stop
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {live?.status === "failed" && live.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {live.error}
        </p>
      )}
      {live?.status === "done" && live.message && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {live.message} (cost {aud(live.spentCents)})
        </p>
      )}
      {blocked ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">{blocked}</p>
      ) : plan ? (
        <>
          <div className="rounded-2xl bg-surface-2 p-4 text-sm">
            <p>
              {plan.needRead > 0 ? `${plan.needRead} of ${plan.files} files still need reading.` : `All ${plan.files} files are already read.`}{" "}
              {!plan.includeWrite && `This run reads ${plan.willRead} of them; run it again for the rest.`}
            </p>
            <p className="mt-2 text-lg font-semibold">About {aud(plan.estCents)}</p>
            <p className="text-xs text-muted">It will never spend more than {aud(plan.capCents)} on this run. {creditLine}</p>
          </div>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={go} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Yes, run it for about {aud(plan.estCents)}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>Not now</Button>
            </div>
          ) : (
            <Button onClick={() => setConfirming(true)}>
              <Sparkles className="h-4 w-4" /> {hasBrief ? (plan.includeWrite ? "Rebuild the brief" : "Read more files") : plan.includeWrite ? "Build the brief" : "Start reading files"}
            </Button>
          )}
        </>
      ) : null}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export type SectionView = { key: string; title: string; body: string; sources: string[]; edited: boolean };

function SectionEditor({ projectId, s }: { projectId: string; s: SectionView }) {
  const [state, action, pending] = useActionState<BriefState, FormData>(saveBriefSectionAction, undefined);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(s.body);
  useEffect(() => setBody(s.body), [s.body]);
  return (
    <div className="rounded-2xl bg-surface-2/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {s.title} {s.edited && <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">edited by you</span>}
        </h3>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-accent hover:underline">
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {open ? (
        <form action={action} className="mt-2 space-y-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="key" value={s.key} />
          <Textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} aria-label={`Edit ${s.title}`} />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            {state?.ok && !pending && <span role="status" className="text-xs text-success">Saved</span>}
            {state?.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
          </div>
        </form>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{s.body}</p>
      )}
      {s.sources.length > 0 && <p className="mt-2 break-words text-xs text-muted">From: {s.sources.join(", ")}</p>}
    </div>
  );
}

export function BriefSections({ projectId, sections }: { projectId: string; sections: SectionView[] }) {
  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <SectionEditor key={s.key} projectId={projectId} s={s} />
      ))}
    </div>
  );
}
