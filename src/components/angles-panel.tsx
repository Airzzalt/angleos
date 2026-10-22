"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Check, CheckCircle2, Heart, Loader2, Pencil, Sparkles, Trash2, X, Copy, Target, PenLine, Image as ImageIcon, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import type { Angle } from "@/lib/ai/angles-shape";
import { cancelJobAction } from "@/app/(app)/projects/brief-actions";
import { anglesJobStatusAction, deleteAngleAction, deleteRunAction, estimateAnglesAction, saveProductLineAction, saveClaimLevelAction, suggestProductLineAction, favouriteAngleAction, saveAngleAction, startAnglesAction, type AngleState, type PlanDto } from "@/app/(app)/projects/angle-actions";

type Job = { id: string; status: string; done: number; total: number; message: string; error: string | null; spentCents: number; seconds?: number } | null;
export type AngleView = {
  id: string;
  favourite: boolean;
  edited: boolean;
  runId: string;
  runAt: string;
  data: Angle;
};

const aud = (c: number) => `A$${(c / 100).toFixed(2)}`;

function groupByRun(list: AngleView[]) {
  const groups: { runId: string; runAt: string; items: AngleView[] }[] = [];
  for (const a of list) {
    const g = groups[groups.length - 1];
    if (g && g.runId === a.runId) g.items.push(a);
    else groups.push({ runId: a.runId, runAt: a.runAt, items: [a] });
  }
  return groups;
}

const dur = (sec = 0) => (sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s` : `${sec} s`);

type Coverage = { theme: string; files: number; status: string; note: string };

function ProductLine({ projectId, initial, onSaved }: { projectId: string; initial: string; onSaved: () => void }) {
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <label htmlFor="product-line" className="text-sm font-medium">What are you selling, and who is it for?</label>
      <textarea
        id="product-line"
        value={text}
        onChange={(e) => { setText(e.target.value); setMsg(null); }}
        rows={2}
        maxLength={600}
        placeholder="One line on what you sell and who buys it. Or press Write it for me and the AI reads your files and suggests one."
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await saveProductLineAction(projectId, text); setMsg(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error ?? "Could not save." }); if (r.ok) onSaved(); })}>
          {pending ? "Saving…" : "Save product line"}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { setMsg(null); const r = await suggestProductLineAction(projectId); if (r.text) { setText(r.text); setMsg({ ok: true, text: "Suggested from your files. Check it, change anything, then press Save." }); } else setMsg({ ok: false, text: r.error ?? "Could not write one." }); })}>
          <Wand2 className="h-4 w-4" /> Write it for me
        </Button>
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</span>}
      </div>
      <p className="text-xs text-muted">The product decides what is sold. Your research decides who buys and why.</p>
    </div>
  );
}

export function AnglesWorkspace({ projectId, fileCount, angles, job, missing, note, coverage = [], productLine = "", showProductLine = false, claimLevel = "standard", initialLikeId = null, initialMode = "broad" }: { projectId: string; fileCount: number; angles: AngleView[]; job: Job; missing: string[]; note: string; coverage?: Coverage[]; productLine?: string; showProductLine?: boolean; claimLevel?: string; initialLikeId?: string | null; initialMode?: "broad" | "deep" }) {
  const router = useRouter();
  const [lineTick, setLineTick] = useState(0);
  const [live, setLive] = useState<Job>(job);
  const [count, setCount] = useState(10);
  const [countText, setCountText] = useState("10");
  const [level, setLevel] = useState(claimLevel);
  const [mode, setMode] = useState<"broad" | "deep">(initialMode);
  const [focus, setFocus] = useState("");
  const [like, setLike] = useState<AngleView | null>(() => angles.find((x) => x.id === initialLikeId) ?? null);
  const [plan, setPlan] = useState<PlanDto | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [creditLine, setCreditLine] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [pending, start] = useTransition();
  const running = live && (live.status === "queued" || live.status === "running");
  const wasRunning = useRef(!!running);
  const stamp = useRef(0);
  const top = useRef<HTMLDivElement>(null);

  // The cost depends on how many angles are asked for, so ask the server again when that changes.
  useEffect(() => {
    if (running) return;
    const my = ++stamp.current;
    estimateAnglesAction(projectId, { count, mode, focus: "" }).then((r) => {
      if (my !== stamp.current) return;
      setPlan(r.plan ?? null);
      setBlocked(r.blocked ?? null);
      setCreditLine(r.creditLine ?? "");
    });
  }, [projectId, count, mode, running, angles.length, fileCount, lineTick]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const j = await anglesJobStatusAction(projectId);
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
      const res = await startAnglesAction(projectId, plan.estCents, { count, mode, focus, likeId: like?.id ?? null });
      setConfirming(false);
      if (res?.error) return setError(res.error);
      setLike(null);
      const j = await anglesJobStatusAction(projectId);
      if (j) setLive(j);
      // A very quick run can already be finished by now; then the "was running" change below never happens.
      if (j && j.status !== "queued" && j.status !== "running") router.refresh();
    });
  }

  const shown = favOnly ? angles.filter((a) => a.favourite) : angles;

  return (
    <div className="space-y-6">
      <div ref={top} />
      <Card>
        <div className="space-y-5 p-6">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">Generate angles</h2>
            <p className="mt-0.5 text-sm text-muted">Uses your research files and notes (a brief helps but is not needed) together with our built-in knowledge base.</p>
          </div>
          {showProductLine && <ProductLine projectId={projectId} initial={productLine} onSaved={() => { setLineTick((t) => t + 1); router.refresh(); }} />}

          {running && live ? (
            <div className="space-y-3" aria-live="polite">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-accent" /> Working on it
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(5, live.total ? Math.round((live.done / live.total) * 100) : 5)}%` }} />
              </div>
              <p className="text-sm text-muted">{live.message}</p>
              <p className="text-xs text-muted">Running for {dur(live.seconds)} · spent so far {aud(live.spentCents)}. A big set of research can take several minutes. You can leave this page; it keeps going.</p>
              {angles.length > 0 && <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">The angles listed further down are from earlier runs. The new set appears at the top when this finishes.</p>}
              <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => { await cancelJobAction(projectId); const j = await anglesJobStatusAction(projectId); if (j) setLive(j); })}>
                <X className="h-4 w-4" /> Stop
              </Button>
            </div>
          ) : (
            <>
              {live?.status === "failed" && live.error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {live.error}
                </p>
              )}
              {live?.status === "done" && live.message && (
                <div role="status" className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
                  <p className="flex items-start gap-2 font-medium"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Completed</p>
                  <p className="mt-1 break-words pl-6">{live.message}</p>
                  <p className="mt-1 pl-6 text-xs opacity-80">Took {dur(live.seconds)} · cost {aud(live.spentCents)}. Your new set is at the top of the list below.</p>
                </div>
              )}
              {live?.status === "cancelled" && (
                <p role="status" className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">The last run was stopped{live.spentCents ? ` (cost ${aud(live.spentCents)})` : ""}. Any angles it had already saved are in the list below.</p>
              )}
              {like && (
                <div className="flex items-start justify-between gap-3 rounded-xl bg-accent-soft px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">Making more like: <b className="font-medium">{like.data.angle}</b></span>
                  <button type="button" onClick={() => setLike(null)} className="shrink-0 text-xs text-accent hover:underline">Clear</button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {mode === "deep" ? (
                  <div>
                    <Label htmlFor="angle-count">How many angles</Label>
                    <p id="angle-count" className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">Sniper makes one full angle brief.</p>
                  </div>
                ) : (
                  <div>
                  <Label htmlFor="angle-count">How many angles</Label>
                  <Input
                    id="angle-count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={25}
                    value={countText}
                    onChange={(e) => { setCountText(e.target.value); const n = Math.round(Number(e.target.value)); if (Number.isFinite(n) && n >= 1) setCount(Math.min(25, n)); }}
                    onBlur={() => setCountText(String(count))}
                  />
                  <p className="mt-1 text-xs text-muted">Any number from 1 to 25.</p>
                </div>
                )}
                <div className="sm:col-span-2">
                  <Label htmlFor="angle-mode">Approach</Label>
                  <Select id="angle-mode" value={mode} onChange={(e) => setMode(e.target.value === "deep" ? "deep" : "broad")}>
                    <option value="broad">Marksman: broad across sub-avatars</option>
                    <option value="deep">Sniper: deep on one angle</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="claim-level">How bold can the ads be?</Label>
                <Select
                  id="claim-level"
                  value={level}
                  onChange={(e) => { const v = e.target.value; setLevel(v); void saveClaimLevelAction(projectId, v); }}
                >
                  <option value="strict">Strict: comfort, fit and support only</option>
                  <option value="standard">Standard: can describe the night and next day, results as hope</option>
                  <option value="bold">Bold: more direct, for experienced advertisers</option>
                </Select>
                <p className="mt-1 text-xs text-muted">Saved for this project. No setting ever allows medical, face or airway claims, or claiming to treat or cure.</p>
              </div>
              <div>
                <Label htmlFor="angle-focus">Anything to focus on? (optional)</Label>
                <Input id="angle-focus" value={focus} maxLength={600} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. busy mums who sleep badly. No medical claims." />
              </div>

              {blocked ? (
                <div className="space-y-3 rounded-2xl bg-surface-2 p-4 text-sm">
                  <p className="text-muted">{blocked}</p>
                  {blocked.startsWith("There is nothing") && (
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/projects/${projectId}?tab=files`}><Button variant="secondary" size="sm">Upload research</Button></Link>
                      <Link href={`/projects/${projectId}?tab=context`}><Button variant="secondary" size="sm">Write the context</Button></Link>
                    </div>
                  )}
                </div>
              ) : plan ? (
                <>
                  <div className="rounded-2xl bg-surface-2 p-4 text-sm">
                    {plan.thin && <p className="mb-2 rounded-xl bg-warning/10 px-3 py-2 text-warning">There is very little to work from, so these angles will be more generic. Adding research files makes them much sharper.</p>}
                    <p>
                      {plan.files === 0
                        ? "No research files, so this will use the product notes only."
                        : plan.needRead > 0
                          ? `${plan.needRead} of ${plan.files} files still need reading first.`
                          : `All ${plan.files} files are already read.`}{" "}
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
                      <Sparkles className="h-4 w-4" /> {plan.includeWrite ? "Generate angles" : "Start reading files"}
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">Working out the cost…</p>
              )}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            </>
          )}
        </div>
      </Card>

      {coverage.length > 0 && angles.length > 0 && (
        <Card className="p-5">
          <p className="text-sm font-medium">What the research is about (latest run)</p>
          <p className="mt-1 text-xs text-muted">The main themes in your files, how many files mention each, and whether an angle covers it.</p>
          <ul className="mt-3 divide-y divide-border text-sm">
            {coverage.map((c, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <span className="min-w-0 flex-1 break-words font-medium">{c.theme}</span>
                <span className="text-xs text-muted">{c.files} of {fileCount} files</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status === "skipped" ? "bg-surface-3 text-muted" : "bg-accent-soft text-accent"}`}>{c.status === "skipped" ? "Skipped" : "Covered"}</span>
                <button
                  type="button"
                  className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs text-accent transition hover:bg-accent-soft"
                  aria-label={`Go deep on ${c.theme}`}
                  onClick={() => { setMode("deep"); setLike(null); setFocus(`Go deep on this audience and theme: ${c.theme}`); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                >
                  <Target className="h-3.5 w-3.5" /> Go deep
                </button>
                {c.note && <span className="basis-full break-words text-xs text-muted">{c.note}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(missing.length > 0 || note) && angles.length > 0 && (
        <Card className="p-5">
          <p className="text-sm font-medium">What would make the next run stronger</p>
          {note && <p className="mt-1 text-sm text-muted">{note}</p>}
          {missing.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {missing.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {angles.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="min-w-0 flex-1 basis-60 text-sm text-muted">{angles.length} saved angle{angles.length === 1 ? "" : "s"}. You don't have to test each one on its own: one concept can test several angles with the best hook.</p>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" /> Favourites only
          </label>
        </div>
      )}
      {groupByRun(shown).map((g, gi, all) => (
        <section key={g.runId} className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-medium" suppressHydrationWarning>
              Set {all.length - gi}
              <span className="font-normal text-muted">
                {" · "}
                {new Date(g.runAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}
                {g.items.length} angle{g.items.length === 1 ? "" : "s"} · strongest first
              </span>
            </h2>
            <button
              type="button"
              className="ml-auto inline-flex min-h-10 items-center gap-1 px-2 text-xs text-muted hover:text-danger"
              aria-label={`Delete all angles in set ${all.length - gi}`}
              onClick={() => {
                if (window.confirm(`Delete all ${g.items.length} angles in this set? This can't be undone.`)) void deleteRunAction(projectId, g.runId).then(() => router.refresh());
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete this set
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {g.items.map((a, i) => (
              <AngleCard key={a.id} projectId={projectId} a={a} rank={i + 1} onMore={() => { setMode("broad"); setLike(a); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} onDeep={() => { setMode("deep"); setLike(a); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
            ))}
          </div>
        </section>
      ))}
      {angles.length > 0 && shown.length === 0 && <p className="text-center text-sm text-muted">No favourites yet. Tap the heart on an angle you like.</p>}
    </div>
  );
}

function AngleCard({ projectId, a, rank, onMore, onDeep }: { projectId: string; a: AngleView; rank: number; onMore: () => void; onDeep: () => void }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [state, action, saving] = useActionState<AngleState, FormData>(saveAngleAction, undefined);
  const [angle, setAngle] = useState(a.data.angle);
  const [hooks, setHooks] = useState(a.data.hooks.join("\n"));
  const [copied, setCopied] = useState(false);
  useEffect(() => setAngle(a.data.angle), [a.data.angle]);
  useEffect(() => setHooks(a.data.hooks.join("\n")), [a.data.hooks]);
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);
  const d = a.data;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-3 px-1.5 text-xs font-semibold" aria-label={`Rank ${rank}`}>{rank}</span>
          {d.awareness && <Badge tone="accent">{d.awareness}</Badge>}
          {a.edited && <Badge tone="neutral">edited by you</Badge>}
        </div>
        <button type="button" disabled={pending} onClick={() => start(() => favouriteAngleAction(projectId, a.id))} aria-label={a.favourite ? "Remove from favourites" : "Add to favourites"} aria-pressed={a.favourite} className="shrink-0 text-muted transition hover:text-danger">
          <Heart className={a.favourite ? "h-5 w-5 fill-current text-danger" : "h-5 w-5"} />
        </button>
      </div>
      {d.sub_avatar && <p className="mt-2 break-words text-xs leading-relaxed text-muted"><span className="font-medium text-fg">Who:</span> {d.sub_avatar}</p>}

      {editing ? (
        <form action={action} className="mt-3 space-y-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="id" value={a.id} />
          <div>
            <Label htmlFor={`angle-${a.id}`}>Angle</Label>
            <Textarea id={`angle-${a.id}`} name="angle" value={angle} onChange={(e) => setAngle(e.target.value)} rows={3} maxLength={400} />
          </div>
          <div>
            <Label htmlFor={`hooks-${a.id}`}>Hooks (one per line)</Label>
            <Textarea id={`hooks-${a.id}`} name="hooks" value={hooks} onChange={(e) => setHooks(e.target.value)} rows={4} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            {state?.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
          </div>
        </form>
      ) : (
        <>
          <h3 className="mt-3 break-words text-[17px] font-semibold leading-snug tracking-tight">{d.angle}</h3>
          {d.ladder?.emotional ? (
            <p className="mt-2 break-words text-sm text-muted"><span className="font-medium text-fg">Feels:</span> {d.ladder.emotional}</p>
          ) : (
            d.desire && <p className="mt-2 break-words text-sm text-muted"><span className="font-medium text-fg">Desire:</span> {d.desire}</p>
          )}
          {d.hooks.length > 0 && (
            <ol className="mt-3 space-y-1.5 text-sm">
              {d.hooks.slice(0, 3).map((h, i) => (
                <li key={i} className="rounded-xl bg-surface-2 px-3 py-2 break-words">{h}</li>
              ))}
              {d.hooks.length > 3 && <li className="px-1 text-xs text-muted">+ {d.hooks.length - 3} more hooks on the full page</li>}
            </ol>
          )}
          {d.deep && <p className="mt-3 text-xs text-accent">Includes a full angle brief.</p>}
          <Link href={`/projects/${projectId}/angles/${a.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Show more information <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button variant="secondary" size="sm" onClick={onMore}><Sparkles className="h-4 w-4" /> More like this</Button>
        {!d.deep && <Button variant="ghost" size="sm" onClick={onDeep}><Target className="h-4 w-4" /> Go deep (Sniper)</Button>}
        <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}><Pencil className="h-4 w-4" /> Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => { void navigator.clipboard?.writeText([d.angle, ...d.hooks.map((h, i) => `${i + 1}. ${h}`)].join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>
          <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="ghost" size="sm" disabled title="Coming with the Script Writer" aria-label="Turn this into a script (coming soon)"><PenLine className="h-4 w-4" /> Make a script</Button>
        <Button variant="ghost" size="sm" disabled title="Coming with the Static Ad Builder" aria-label="Turn this into a static ad (coming soon)"><ImageIcon className="h-4 w-4" /> Make a static ad</Button>
        <Button variant="ghost" size="sm" disabled={pending} className="ml-auto" aria-label="Delete this angle" onClick={() => start(() => deleteAngleAction(projectId, a.id))}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
