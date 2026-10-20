"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { setLimitAction, type LimitState } from "@/app/(app)/admin/users/actions";

/** A small "change this person's AI limit" box. */
export function LimitForm({ id, current }: { id: string; current: string }) {
  const [state, action, pending] = useActionState<LimitState, FormData>(setLimitAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`limit-${id}`}>
        AI limit in Australian dollars
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">A$</span>
        <input
          id={`limit-${id}`}
          name="limit"
          defaultValue={current}
          inputMode="decimal"
          className={`${inputClass} h-9 w-28 pl-8 text-sm`}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {state?.ok && !pending ? <Check className="h-4 w-4 text-success" /> : null}
        {pending ? "Saving…" : "Set limit"}
      </Button>
      {state?.error && (
        <span role="alert" className="w-full text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}
