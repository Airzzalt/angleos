"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { aud } from "@/lib/usage-limit";
import { FORMATS, LENGTHS, MAX_FORMATS } from "@/lib/ai/script-shape";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { cancelJobAction } from "@/app/(app)/projects/brief-actions";
import { estimateScriptsAction, scriptJobStatusAction, startScriptsAction } from "@/app/(app)/scripts/actions";

type Live = { id: string; status: string; done: number; total: number; message: string; error: string | null; spentCents: number; seconds: number };

export function ScriptStudio({ projectId, angleId, angleLine, creatives, initialCreative }: { projectId: string; angleId: string; angleLine: string; creatives: { format: string; hook: string }[]; initialCreative: number | null }) {
  const router = useRouter();
  const [formats, setFormats] = useState<string[]>(["ugc"]);
  const [length, setLength] = useState("45");
  const [note, setNote] = useState("");
  const [creative, setCreative] = useState<number | null>(initialCreative);
  const [est, setEst] = useState<{ estCents: number; scripts: number } | null>(null);
  const [blocked, setBlocked] = useState("");
  const [creditLine, setCreditLine] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState<Live | null>(null);
  const [pending, start] = useTransition();
  const running = live && (live.status === "queued" || live.status === "running");
  const was = useRef(false);
  const stamp = useRef(0);

  const raw = { formats, length, note, creativeIndex: creative };

  useEffect(() => {
    scriptJobStatusAction(projectId).then((j) => j && setLive(j));
  }, [projectId]);

  useEffect(() => {
    if (running) return;
    const my = ++stamp.current;
    estimateScriptsAction(projectId, angleId, { formats, length, note: "", creativeIndex: creative }).then((r) => {
      if (my !== stamp.current) return;
      setEst(r.estCents != null ? { estCents: r.estCents, scripts: r.scripts ?? 1 } : null);
      setBlocked(r.blocked ?? "");
      setCreditLine(r.creditLine ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, angleId, formats.join(","), length, creative, running]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const j = await scriptJobStatusAction(projectId);
      if (j) setLive(j);
    }, 2500);
    return () => clearInterval(t);
  }, [running, projectId]);

  useEffect(() => {
    if (was.current && !running) router.refresh();
    was.current = !!running;
  }, [running, router]);

  const toggle = (id: string) => setFormats((f) => (f.includes(id) ? (f.length > 1 ? f.filter((x) => x !== id) : f) : f.length >= MAX_FORMATS ? f : [...f, id]));

  function go() {
    if (!est) return;
    setError("");
    start(async () => {
      const res = await startScriptsAction(projectId, angleId, est.estCents, raw);
      setConfirming(false);
      if (res?.error) return setError(res.error);
      const j = await scriptJobStatusAction(projectId);
      if (j) setLive(j);
      if (j && j.status !== "queued" && j.status !== "running") router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <h2 className="text-[17px] font-semibold tracking-tight">3. Choose the script</h2>
      <p className="mb-4 mt-1 break-words text-sm text-muted">Writing for: <b className="font-medium text-fg">{angleLine}</b></p>

      {running && live ? (
        <div className="space-y-3" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-accent" /> Working on it</div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(8, live.total ? Math.round((live.done / live.total) * 100) : 8)}%` }} />
          </div>
          <p className="text-sm text-muted">{live.message}</p>
          <p className="text-xs text-muted">Running for {live.seconds}s · spent so far {aud(live.spentCents)}. You can leave this page; it keeps going.</p>
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => { await cancelJobAction(projectId); const j = await scriptJobStatusAction(projectId); if (j) setLive(j); })}>
            <X className="h-4 w-4" /> Stop
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {live?.status === "failed" && live.error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {live.error}</p>
          )}
          {live?.status === "done" && live.message && (
            <p role="status" className="flex items-start gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {live.message} They are listed below. Cost {aud(live.spentCents)}.</p>
          )}
          {live?.status === "cancelled" && <p role="status" className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">The last run was stopped.</p>}

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-muted">Format (pick up to {MAX_FORMATS}, one script each)</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FORMATS.map((f) => (
                <label key={f.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm", formats.includes(f.id) ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-border-strong")}>
                  <input type="checkbox" className="mt-1" name="format" value={f.id} checked={formats.includes(f.id)} onChange={() => toggle(f.id)} />
                  <span><span className="block font-medium">{f.label}</span><span className="block text-xs text-muted">{f.help}</span></span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Static and animated formats come in a later update.</p>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-muted">Length</legend>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <label key={l.id} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm", length === l.id ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-border-strong")}>
                  <input type="radio" className="sr-only" name="length" value={l.id} checked={length === l.id} onChange={() => setLength(l.id)} />
                  {l.label}
                </label>
              ))}
            </div>
          </fieldset>

          {creatives.length > 0 && (
            <div>
              <Label htmlFor="script-creative">Use one of this angle's test creatives (optional)</Label>
              <select id="script-creative" className="h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-[15px]" value={creative ?? ""} onChange={(e) => setCreative(e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">No, write it from the angle</option>
                {creatives.map((c, i) => <option key={i} value={i}>{c.format}: {c.hook.slice(0, 70)}</option>)}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="script-note">Anything to add? (optional)</Label>
            <Textarea id="script-note" maxLength={600} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: open on a mum in the kitchen, keep it gentle." />
          </div>

          {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}
          {blocked ? (
            <p role="status" className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">{blocked}</p>
          ) : est ? (
            <div className="space-y-3">
              <p id="script-estimate" className="text-sm text-muted">Estimated cost: <b className="font-medium text-fg">about {aud(est.estCents)}</b> for {est.scripts} script{est.scripts === 1 ? "" : "s"}. {creditLine}</p>
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button id="script-confirm" disabled={pending} onClick={go}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Yes, write it</Button>
                  <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
                </div>
              ) : (
                <Button id="script-start" onClick={() => setConfirming(true)}><Sparkles className="h-4 w-4" /> Write {est.scripts === 1 ? "the script" : `${est.scripts} scripts`}</Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Working out the cost…</p>
          )}
        </div>
      )}
    </Card>
  );
}
