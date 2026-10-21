"use client";

import { useActionState } from "react";
import { Check, Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { saveAiSettingsAction, testConnectionAction, type AiFormState } from "@/app/(app)/admin/ai/actions";
import type { AiConfig } from "@/lib/ai/settings";

function Field({ name, label, hint, value, wide }: { name: string; label: string; hint?: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value} inputMode={wide ? "text" : "decimal"} list={wide ? "ai-models" : undefined} autoComplete="off" />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function AiSettingsForm({ cfg, models }: { cfg: AiConfig; models: string[] }) {
  const [state, action, pending] = useActionState<AiFormState, FormData>(saveAiSettingsAction, undefined);
  return (
    <form action={action} className="space-y-6 p-6">
      <datalist id="ai-models">
        {models.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <label className="flex items-center gap-3 text-sm">
        <input type="hidden" name="ai_enabled" value="0" />
        <input type="checkbox" name="ai_enabled" value="1" defaultChecked={cfg.ai_enabled === "1"} className="h-5 w-5 accent-[var(--accent)]" />
        <span>
          <span className="font-medium">AI is switched on</span>
          <span className="block text-muted">Untick to stop every AI feature straight away (a kill switch).</span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field wide name="reader_model" label="Reader model (reads and sorts files, cheap)" value={cfg.reader_model} hint="Pick from the list. Click 'Load model list' above first." />
        <Field wide name="writer_model" label="Writer model (writes the brief)" value={cfg.writer_model} />
        <Field name="reader_in_usd" label="Reader price in (US$ per million tokens)" value={cfg.reader_in_usd} />
        <Field name="reader_out_usd" label="Reader price out (US$ per million tokens)" value={cfg.reader_out_usd} />
        <Field name="writer_in_usd" label="Writer price in (US$ per million tokens)" value={cfg.writer_in_usd} />
        <Field name="writer_out_usd" label="Writer price out (US$ per million tokens)" value={cfg.writer_out_usd} />
        <Field name="usd_aud" label="US$ to A$ rate" value={cfg.usd_aud} />
        <Field name="daily_cap_aud" label="Daily spending cap for the whole app (A$, rolling 24 hours)" value={cfg.daily_cap_aud} />
        <Field name="job_cap_aud" label="Most one run may spend (A$)" value={cfg.job_cap_aud} />
        <Field name="max_running_jobs" label="Runs allowed at the same time" value={cfg.max_running_jobs} />
        <Field name="jobs_per_15min_member" label="Runs per 15 minutes: members" value={cfg.jobs_per_15min_member} />
        <Field name="jobs_per_15min_admin" label="Runs per 15 minutes: admins" value={cfg.jobs_per_15min_admin} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : state?.ok ? <Check className="h-4 w-4" /> : null}
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {state?.ok && <span role="status" className="text-sm text-success">{state.message}</span>}
        {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

export function TestConnection() {
  const [state, action, pending] = useActionState<AiFormState>(testConnectionAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 p-6">
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
        {pending ? "Testing…" : "Test the connection"}
      </Button>
      {state?.ok && <span role="status" className="text-sm text-success">{state.message}</span>}
      {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
