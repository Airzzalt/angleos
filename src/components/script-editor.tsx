"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Pencil, RotateCcw, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { refineScriptAction, restoreVersionAction, saveScriptEditAction } from "@/app/(app)/scripts/actions";

type Data = { hooks: string[]; scenes: { say: string; show: string }[]; cta: string; claims: { claim: string; support: string }[]; note: string };

export function ScriptEditor({ scriptId, versionNo, isLatest, data }: { scriptId: string; versionNo: number; isLatest: boolean; data: Data }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [scenes, setScenes] = useState(data.scenes);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [ask, setAsk] = useState("");
  const [conflict, setConflict] = useState("");
  const [pending, start] = useTransition();

  const spoken = data.scenes.map((s) => s.say).join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(spoken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr("Could not copy. Select the text and copy it by hand.");
    }
  }

  function save() {
    setErr(""); setMsg("");
    start(async () => {
      const r = await saveScriptEditAction(scriptId, { ...data, scenes: scenes.filter((s) => s.say.trim()) });
      if (r.error) return setErr(r.error);
      setEditing(false); setMsg("Saved as a new version.");
      router.replace(`/scripts/${scriptId}`); router.refresh();
    });
  }

  function refine(confirmed: boolean) {
    setErr(""); setMsg("");
    start(async () => {
      const r = await refineScriptAction(scriptId, ask, confirmed);
      if (r.conflict) return setConflict(r.conflict);
      if (r.error) return setErr(r.error);
      setConflict(""); setAsk(""); setMsg("Done. The change is saved as a new version.");
      router.replace(`/scripts/${scriptId}`); router.refresh();
    });
  }

  function restore() {
    start(async () => {
      const r = await restoreVersionAction(scriptId, versionNo);
      if (r.error) return setErr(r.error);
      router.replace(`/scripts/${scriptId}`); router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {data.hooks.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold tracking-tight">Other ways to open</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">{data.hooks.map((h, i) => <li key={i} className="break-words">{h}</li>)}</ol>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-tight">The script</h2>
          <div className="flex flex-wrap gap-2">
            <Button id="script-copy" variant="secondary" size="sm" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy the words"}</Button>
            {isLatest && !editing && <Button id="script-edit" variant="secondary" size="sm" onClick={() => { setScenes(data.scenes); setEditing(true); }}><Pencil className="h-4 w-4" /> Edit by hand</Button>}
            {!isLatest && <Button id="script-restore" variant="secondary" size="sm" disabled={pending} onClick={restore}><RotateCcw className="h-4 w-4" /> Restore this version</Button>}
          </div>
        </div>

        <div className="hidden grid-cols-2 gap-4 border-b border-border pb-2 text-xs font-medium text-muted sm:grid"><span>What is said</span><span>What is on screen</span></div>
        <ol className="divide-y divide-border">
          {(editing ? scenes : data.scenes).map((s, i) => (
            <li key={i} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2 sm:gap-4">
              {editing ? (
                <>
                  <div><Label htmlFor={`say-${i}`}>Line {i + 1}, said</Label><Textarea id={`say-${i}`} rows={2} className="min-h-0" value={s.say} onChange={(e) => setScenes((a) => a.map((x, k) => (k === i ? { ...x, say: e.target.value } : x)))} /></div>
                  <div><Label htmlFor={`show-${i}`}>Line {i + 1}, on screen</Label><Textarea id={`show-${i}`} rows={2} className="min-h-0" value={s.show} onChange={(e) => setScenes((a) => a.map((x, k) => (k === i ? { ...x, show: e.target.value } : x)))} /></div>
                </>
              ) : (
                <>
                  <p className="break-words text-[15px]" data-say>{s.say}</p>
                  <p className="break-words text-sm text-muted">{s.show}</p>
                </>
              )}
            </li>
          ))}
        </ol>
        {editing && (
          <div className="mt-3 flex gap-2">
            <Button id="script-save" disabled={pending} onClick={save}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save as new version</Button>
            <Button variant="secondary" disabled={pending} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        )}
        {data.note && <p className="mt-3 break-words rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">Note: {data.note}</p>}
      </Card>

      {isLatest && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold tracking-tight">Ask for a change</h2>
          <p className="mb-2 mt-1 text-xs text-muted">For example: "make the hook shorter", "add a line about the gift", "sound more like a mum". Each change is saved as a new version.</p>
          <Label htmlFor="script-refine">What should change?</Label>
          <Textarea id="script-refine" rows={2} maxLength={800} value={ask} onChange={(e) => { setAsk(e.target.value); setConflict(""); }} />
          {conflict && (
            <div role="alert" className="mt-3 space-y-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
              <p>{conflict}</p>
              <div className="flex gap-2">
                <Button id="script-refine-anyway" size="sm" disabled={pending} onClick={() => refine(true)}>Do it anyway</Button>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => setConflict("")}>Keep the script as it is</Button>
              </div>
            </div>
          )}
          <div className="mt-3"><Button id="script-refine-send" disabled={pending || ask.trim().length < 3} onClick={() => refine(false)}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Make the change</Button></div>
        </Card>
      )}
      {err && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
      {msg && <p role="status" className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">{msg}</p>}
    </div>
  );
}
