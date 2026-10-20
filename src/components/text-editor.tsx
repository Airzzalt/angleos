"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import type { SaveState } from "@/app/(app)/admin/knowledge-base/actions";

/** A text box with Save. Used for editing a rule or a prompt. `askNote` adds a "why did you change it" line. */
export function TextEditor({
  id,
  initial,
  action,
  askNote,
  rows = 10,
  label,
}: {
  id: string;
  initial: string;
  action: (p: SaveState, f: FormData) => Promise<SaveState>;
  askNote?: boolean;
  rows?: number;
  label: string;
}) {
  const [state, run, pending] = useActionState<SaveState, FormData>(action, undefined);
  // Controlled so a failed save never wipes what was typed (React resets uncontrolled fields after a form action).
  const [body, setBody] = useState(initial);
  const [note, setNote] = useState("");
  return (
    <form action={run} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`t-${id}`}>
        {label}
      </label>
      <Textarea id={`t-${id}`} name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={rows} className="font-mono text-[13px] leading-relaxed" />
      {askNote && (
        <input
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why are you changing it? (kept in the history)"
          className="h-11 w-full rounded-2xl border border-border bg-surface-2 px-4 text-[15px] focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
          maxLength={300}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
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
