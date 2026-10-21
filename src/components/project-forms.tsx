"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, FileArchive, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { createProjectAction, saveContextAction, uploadFileAction, type FormState } from "@/app/(app)/projects/actions";
import { MARKETS } from "@/lib/markets";

export function NewProjectForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createProjectAction, undefined);
  return (
    <form action={action} className="max-w-2xl space-y-5">
      <div>
        <Label htmlFor="name">Product name</Label>
        <Input id="name" name="name" required minLength={2} maxLength={120} placeholder="e.g. Aurora Sleep Mask" autoFocus />
      </div>
      <div>
        <Label htmlFor="url">Product link (optional)</Label>
        <Input id="url" name="url" type="url" maxLength={300} placeholder="https://" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="niche">Niche</Label>
          <Input id="niche" name="niche" maxLength={80} placeholder="e.g. Sleep and wellness" />
        </div>
        <div>
          <Label htmlFor="market">Market</Label>
          <Select id="market" name="market" defaultValue="Australia">
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="description">Short description</Label>
        <Textarea id="description" name="description" maxLength={2000} placeholder="What it is, who it's for, and what makes it different." />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
        <p className="text-sm text-muted">Next you'll upload your research files.</p>
      </div>
    </form>
  );
}

export function ContextForm({ projectId, initial }: { projectId: string; initial: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContextAction, undefined);
  // Controlled, so a failed save never wipes what was typed.
  const [body, setBody] = useState(initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor="ctx" className="sr-only">
        Project context
      </label>
      <Textarea
        id="ctx"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        maxLength={8000}
        placeholder="e.g. Always talk about the 30-day guarantee. Never mention medical claims. The customer is a busy mum who sleeps badly."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save context"}
        </Button>
        <span className="text-xs text-muted">{body.length.toLocaleString()} / 8,000</span>
        {state?.ok && !pending && (
          <span className="pop-in inline-flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

type Row = { name: string; state: "wait" | "busy" | "ok" | "bad"; message?: string; skipped?: { name: string; reason: string }[] };
const MAX_MB = 25;

export function FileUploader({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function run(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    setRows(files.map((f) => ({ name: f.name, state: "wait" })));
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const set = (patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
      if (f.size > MAX_MB * 1024 * 1024) {
        set({ state: "bad", message: `${f.name}: too large (over ${MAX_MB} MB). Split it into smaller zips.` });
        continue;
      }
      set({ state: "busy" });
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("file", f);
      try {
        const res = await uploadFileAction(fd);
        set({ state: res.ok ? "ok" : "bad", message: res.message, skipped: res.skipped });
      } catch {
        set({ state: "bad", message: `${f.name}: the upload failed, try again` });
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void run(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center rounded-2xl border border-dashed px-4 py-10 text-center transition-[border-color,background-color,transform] duration-200",
          drag ? "scale-[1.01] border-accent bg-accent-soft" : "border-border-strong",
        )}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <FileArchive className="h-6 w-6" />
        </span>
        <p className="font-medium">Drop your research here</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          A .zip, or loose PDF, DOCX, TXT, MD and CSV files. Up to {MAX_MB} MB at a time. Only the text is kept; the original files are not stored.
        </p>
        <input
          ref={input}
          id="project-files"
          type="file"
          multiple
          accept=".zip,.pdf,.docx,.txt,.md,.markdown,.csv"
          className="sr-only"
          onChange={(e) => void run(Array.from(e.target.files ?? []))}
        />
        <Button variant="secondary" size="sm" className="mt-4" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Reading files…" : "Choose files"}
        </Button>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {rows.map((r) => (
            <li key={r.name} className="pop-in rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <div className="flex items-start gap-2.5">
                {r.state === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : r.state === "bad" ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                ) : r.state === "busy" ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" />
                ) : (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted/50" />
                )}
                <span className="min-w-0 break-words">{r.message ?? r.name}</span>
              </div>
              {r.skipped && r.skipped.length > 0 && (
                <details className="mt-1.5 pl-6 text-xs text-muted">
                  <summary className="cursor-pointer">Why {r.skipped.length} were skipped</summary>
                  <ul className="mt-1 space-y-0.5">
                    {r.skipped.slice(0, 15).map((s, i) => (
                      <li key={i} className="break-words">
                        {s.name}: {s.reason}
                      </li>
                    ))}
                    {r.skipped.length > 15 && <li>…and {r.skipped.length - 15} more</li>}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
