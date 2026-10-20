"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createResetCodeAction, type ResetState } from "@/app/(app)/admin/users/reset-actions";

/** "Reset password" for one person: shows a one-time code to pass on. */
export function ResetCodeButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(createResetCodeAction, undefined);
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col items-end gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          <KeyRound className="h-4 w-4" />
          {pending ? "Making code…" : "Reset password"}
        </Button>
      </form>
      {state?.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
      {state?.code && (
        <div className="pop-in rounded-2xl bg-accent-soft p-3 text-sm">
          <p className="text-xs text-muted">
            Give this to {name}. It works once and expires in 1 hour. You won&rsquo;t see it again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="select-all rounded-xl bg-surface px-3 py-1.5 font-mono text-base font-semibold tracking-wider">{state.code}</code>
            <Button
              size="icon-sm"
              variant="secondary"
              aria-label="Copy code"
              onClick={() => {
                navigator.clipboard?.writeText(state.code ?? "").then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
