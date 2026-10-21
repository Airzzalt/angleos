"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, FileArchive, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { createProjectAction, saveContextAction, uploadBatchAction, type FormState } from "@/app/(app)/projects/actions";
import { MARKETS } from "@/lib/markets";
import { LIMITS } from "@/lib/uploads/limits";
import { unpackZipInBrowser } from "@/lib/uploads/browser-unzip";

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

type Row = { name: string; state: "busy" | "ok" | "bad"; message: string; skipped?: { name: string; reason: string }[] };
type Item = { file: File; label: string };

export function FileUploader({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function run(picked: File[]) {
    if (!picked.length || busy) return;
    setBusy(true);
    setProgress(null);
    const rowsNow: Row[] = [];
    const push = (r: Row) => {
      rowsNow.push(r);
      setRows([...rowsNow]);
    };
    const items: Item[] = [];
    const skipped: { name: string; reason: string }[] = [];

    // 1. Open zips here in the browser; take loose files as they are.
    for (const f of picked) {
      if (f.name.toLowerCase().endsWith(".zip")) {
        push({ name: f.name, state: "busy", message: `Opening ${f.name}…` });
        const idx = rowsNow.length - 1;
        try {
          const u = await unpackZipInBrowser(f);
          items.push(...u.files.map((file) => ({ file, label: `${f.name}/${file.name}` })));
          skipped.push(...u.skipped);
          rowsNow[idx] = { name: f.name, state: "ok", message: `${f.name}: found ${u.files.length} readable file${u.files.length === 1 ? "" : "s"}` };
        } catch (e) {
          rowsNow[idx] = { name: f.name, state: "bad", message: e instanceof Error ? e.message : `${f.name}: this zip couldn't be opened. It may be damaged.` };
        }
        setRows([...rowsNow]);
      } else if (f.size > LIMITS.maxFileBytes) {
        skipped.push({ name: f.name, reason: "file too large" });
      } else {
        items.push({ file: f, label: f.name });
      }
    }

    // 2. Send them in small batches. The server checks every file again.
    let added = 0;
    let dupes = 0;
    const serverSkipped: { name: string; reason: string }[] = [];
    let failure = "";
    if (items.length) {
      push({ name: "upload", state: "busy", message: `Sending ${items.length} files…` });
      const idx = rowsNow.length - 1;
      setProgress({ done: 0, total: items.length });
      let i = 0;
      while (i < items.length && !failure) {
        const batch: Item[] = [];
        let bytes = 0;
        while (i < items.length && batch.length < LIMITS.batchMaxFiles && bytes + items[i].file.size <= LIMITS.batchMaxBytes) {
          bytes += items[i].file.size;
          batch.push(items[i++]);
        }
        if (!batch.length) {
          serverSkipped.push({ name: items[i].label, reason: "file too large" });
          i++;
          continue;
        }
        const fd = new FormData();
        fd.set("projectId", projectId);
        for (const it of batch) fd.append("file", it.file, it.file.name);
        try {
          const res = await uploadBatchAction(fd);
          added += res.added;
          dupes += res.duplicates;
          serverSkipped.push(...res.skipped);
          if (!res.ok) failure = res.message;
        } catch {
          failure = "The upload failed. Check your connection and try again.";
        }
        setProgress({ done: i, total: items.length });
      }
      const parts = [`${added} file${added === 1 ? "" : "s"} added`];
      if (dupes) parts.push(`${dupes} already there`);
      const allSkipped = [...skipped, ...serverSkipped];
      if (allSkipped.length) parts.push(`${allSkipped.length} skipped`);
      rowsNow[idx] = {
        name: "upload",
        state: failure ? "bad" : "ok",
        message: failure ? `${parts.join(", ")}. Stopped: ${failure}` : parts.join(", "),
        skipped: allSkipped,
      };
    } else if (skipped.length) {
      push({ name: "skipped", state: "bad", message: `Nothing readable. ${skipped.length} skipped`, skipped });
    }
    setRows([...rowsNow]);
    setProgress(null);
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
          A .zip (opened right here on your computer, so big ones are fine) or loose PDF, DOCX, TXT, MD and CSV files. Only the text is kept; the original files are not stored.
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
          {busy ? (progress ? `Saving ${progress.done} of ${progress.total}…` : "Reading files…") : "Choose files"}
        </Button>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {rows.map((r, n) => (
            <li key={n} className="pop-in rounded-xl bg-surface-2 px-3 py-2 text-sm">
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
