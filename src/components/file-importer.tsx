"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { importFileAction } from "@/app/(app)/admin/knowledge-base/actions";

type Row = { name: string; state: "wait" | "busy" | "ok" | "bad"; message?: string };

/** Pick many files, they are sent to the server one at a time with a live progress list. */
export function FileImporter({
  kind,
  accept,
  collections = [],
  label,
  hint,
}: {
  kind: "playbook" | "lessons" | "prompts";
  accept: string;
  collections?: { name: string; tier: number }[];
  label: string;
  hint: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [collection, setCollection] = useState("");
  const [tier, setTier] = useState("2");
  const input = useRef<HTMLInputElement>(null);

  async function run(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    setRows(files.map((f) => ({ name: f.name, state: "wait" })));
    for (let i = 0; i < files.length; i++) {
      setRows((r) => r.map((x, j) => (j === i ? { ...x, state: "busy" } : x)));
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", files[i]);
      fd.set("collection", collection);
      fd.set("tier", tier);
      let res: { ok: boolean; message: string };
      try {
        res = await importFileAction(fd);
      } catch {
        res = { ok: false, message: `${files[i].name}: the upload failed, try again` };
      }
      setRows((r) => r.map((x, j) => (j === i ? { ...x, state: res.ok ? "ok" : "bad", message: res.message } : x)));
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const done = rows.filter((r) => r.state === "ok" || r.state === "bad").length;
  const needsCollection = kind === "lessons";

  return (
    <div className="space-y-4 p-5">
      {needsCollection && (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="coll" className="mb-1.5 block text-[13px] font-medium text-muted">
              Collection (the course these lessons belong to)
            </label>
            <input
              id="coll"
              list="collections"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              placeholder="e.g. Ad Creative Program"
              className={cn(inputClass, "h-11")}
              maxLength={80}
            />
            <datalist id="collections">
              {collections.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="tier" className="mb-1.5 block text-[13px] font-medium text-muted">
              Authority
            </label>
            <select id="tier" value={tier} onChange={(e) => setTier(e.target.value)} className={cn(inputClass, "h-11 pr-8")}>
              <option value="1">Tier 1 (main instructor)</option>
              <option value="2">Tier 2 (course lessons)</option>
              <option value="3">Tier 3 (Q&A calls)</option>
            </select>
          </div>
        </div>
      )}

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
          "flex flex-col items-center rounded-2xl border border-dashed px-4 py-9 text-center transition-[border-color,background-color,transform] duration-200",
          drag ? "scale-[1.01] border-accent bg-accent-soft" : "border-border-strong",
        )}
      >
        <FileUp className="mb-2 h-6 w-6 text-muted" />
        <p className="font-medium">{label}</p>
        <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          id={`pick-${kind}`}
          onChange={(e) => void run(Array.from(e.target.files ?? []))}
        />
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={busy || (needsCollection && !collection.trim())}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? `Saving ${done} of ${rows.length}…` : "Choose files"}
        </Button>
        {needsCollection && !collection.trim() && <p className="mt-2 text-xs text-muted">Type a collection name first.</p>}
      </div>

      {rows.length > 0 && (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto" aria-live="polite">
          {rows.map((r) => (
            <li key={r.name} className="pop-in flex items-start gap-2.5 rounded-xl bg-surface-2 px-3 py-2 text-sm">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
