"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Heart, Image as ImageIcon, PenLine, Pencil, Sparkles, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { deleteAngleBackAction, favouriteAngleAction, saveAngleAction, type AngleState } from "@/app/(app)/projects/angle-actions";

/** The action buttons on the full angle page: favourite, more like this, go deep, edit, copy, make a script / static ad, delete. */
export function AngleActionsBar({ projectId, id, favourite, angle, hooks, hasDeep, copyText }: { projectId: string; id: string; favourite: boolean; angle: string; hooks: string[]; hasDeep: boolean; copyText: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [state, action, saving] = useActionState<AngleState, FormData>(saveAngleAction, undefined);
  const [a, setA] = useState(angle);
  const [h, setH] = useState(hooks.join("\n"));
  useEffect(() => setA(angle), [angle]);
  useEffect(() => setH(hooks.join("\n")), [hooks]);
  useEffect(() => {
    if (state?.ok) {
      setEditing(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/projects/${projectId}?tab=angles&like=${id}`}>
          <Button variant="secondary" size="sm" type="button"><Sparkles className="h-4 w-4" /> More like this</Button>
        </Link>
        {!hasDeep && (
          <Link href={`/projects/${projectId}?tab=angles&like=${id}&deep=1`}>
            <Button variant="ghost" size="sm" type="button"><Target className="h-4 w-4" /> Go deep (Sniper)</Button>
          </Link>
        )}
        <Button variant="ghost" size="sm" type="button" onClick={() => setEditing((e) => !e)}><Pencil className="h-4 w-4" /> Edit</Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => { void navigator.clipboard?.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>
          <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy all"}
        </Button>
        <Button variant="ghost" size="sm" type="button" disabled title="Coming with the Script Writer" aria-label="Turn this into a script (coming soon)"><PenLine className="h-4 w-4" /> Make a script</Button>
        <Button variant="ghost" size="sm" type="button" disabled title="Coming with the Static Ad Builder" aria-label="Turn this into a static ad (coming soon)"><ImageIcon className="h-4 w-4" /> Make a static ad</Button>
        <Button variant="ghost" size="sm" type="button" disabled={pending} onClick={() => start(async () => { await favouriteAngleAction(projectId, id); router.refresh(); })} aria-pressed={favourite} aria-label={favourite ? "Remove from favourites" : "Add to favourites"}>
          <Heart className={favourite ? "h-4 w-4 fill-current text-danger" : "h-4 w-4"} /> {favourite ? "Favourite" : "Favourite it"}
        </Button>
        <form
          action={deleteAngleBackAction}
          className="ml-auto"
          onSubmit={(e) => {
            if (!window.confirm("Delete this angle? This can't be undone.")) e.preventDefault();
          }}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="id" value={id} />
          <Button variant="ghost" size="sm" type="submit" aria-label="Delete this angle"><Trash2 className="h-4 w-4" /> Delete</Button>
        </form>
      </div>
      {editing && (
        <form action={action} className="space-y-3 rounded-2xl bg-surface-2/60 p-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="id" value={id} />
          <div>
            <Label htmlFor="edit-angle">Angle</Label>
            <Textarea id="edit-angle" name="angle" value={a} onChange={(e) => setA(e.target.value)} rows={3} maxLength={400} />
          </div>
          <div>
            <Label htmlFor="edit-hooks">Hooks (one per line)</Label>
            <Textarea id="edit-hooks" name="hooks" value={h} onChange={(e) => setH(e.target.value)} rows={Math.min(12, Math.max(4, hooks.length + 1))} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            {state?.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
