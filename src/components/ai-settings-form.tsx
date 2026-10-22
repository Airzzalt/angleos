"use client";

import { useActionState } from "react";
import { Check, Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { saveAiSettingsAction, testConnectionAction, type AiFormState } from "@/app/(app)/admin/ai/actions";
import type { AiConfig } from "@/lib/ai/settings";

function Field({ name, label, hint, value, text, list }: { name: string; label: string; hint?: string; value: string; text?: boolean; list?: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value} inputMode={text ? "text" : "decimal"} list={list} autoComplete="off" />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function SaveRow({ pending, state, label = "Save" }: { pending: boolean; state: AiFormState; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : state?.ok ? <Check className="h-4 w-4" /> : null}
        {pending ? "Saving…" : label}
      </Button>
      {state?.ok && <span role="status" className="text-sm text-success">{state.message}</span>}
      {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
    </div>
  );
}

function Toggle({ name, title, text, on }: { name: string; title: string; text: string; on: boolean }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="hidden" name={name} value="0" />
      <input type="checkbox" name={name} value="1" defaultChecked={on} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-muted">{text}</span>
      </span>
    </label>
  );
}

/** Small on/off switch inside a provider card. */
export function ProviderSwitch({ cfg, provider }: { cfg: AiConfig; provider: "gemini" | "xai" }) {
  const [state, action, pending] = useActionState<AiFormState, FormData>(saveAiSettingsAction, undefined);
  const name = provider === "xai" ? "xai_enabled" : "gemini_enabled";
  const label = provider === "xai" ? "xAI (Grok)" : "Gemini";
  return (
    <form action={action} className="space-y-3">
      <Toggle name={name} title={`${label} is switched on`} text={`Untick to stop everything that uses ${label}, without touching other providers.`} on={cfg[name] === "1"} />
      <SaveRow pending={pending} state={state} />
    </form>
  );
}

/** Task routing: which model does which job, and what it costs. */
export function RoutingForm({ cfg, models }: { cfg: AiConfig; models: string[] }) {
  const [state, action, pending] = useActionState<AiFormState, FormData>(saveAiSettingsAction, undefined);
  return (
    <form action={action} className="space-y-6 p-6">
      <datalist id="ai-models">
        {models.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Reading and sorting files</p>
              <p className="text-xs text-muted">Cheap and fast. Used for file summaries.</p>
            </div>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">Gemini</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field text list="ai-models" name="reader_model" label="Model" value={cfg.reader_model} />
            <Field name="reader_in_usd" label="Price in (US$ per million)" value={cfg.reader_in_usd} />
            <Field name="reader_out_usd" label="Price out (US$ per million)" value={cfg.reader_out_usd} />
          </div>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Writing the brief</p>
              <p className="text-xs text-muted">Stronger model. Used for the product brief.</p>
            </div>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">Gemini</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field text list="ai-models" name="writer_model" label="Model" value={cfg.writer_model} />
            <Field name="writer_in_usd" label="Price in (US$ per million)" value={cfg.writer_in_usd} />
            <Field name="writer_out_usd" label="Price out (US$ per million)" value={cfg.writer_out_usd} />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Writing angles</p>
            <p className="text-xs text-muted">Used by the Angle Generator. Grok (xAI) is the plan; Gemini works too.</p>
          </div>
          <div className="w-44">
            <Label htmlFor="angle_provider" className="sr-only">Provider for angles</Label>
            <Select id="angle_provider" name="angle_provider" defaultValue={cfg.angle_provider === "gemini" ? "gemini" : "xai"} className="h-9 text-sm">
              <option value="xai">xAI (Grok)</option>
              <option value="gemini">Gemini</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field text list="ai-models" name="angle_model" label="Model" value={cfg.angle_model} />
          <Field name="angle_in_usd" label="Price in (US$ per million)" value={cfg.angle_in_usd} />
          <Field name="angle_out_usd" label="Price out (US$ per million)" value={cfg.angle_out_usd} />
        </div>
      </div>
      <div className="max-w-xs">
        <Field name="usd_aud" label="US$ to A$ rate" value={cfg.usd_aud} />
      </div>
      <SaveRow pending={pending} state={state} label="Save routing and prices" />
    </form>
  );
}

/** Safety limits: the kill switch and every cap. */
export function SafetyForm({ cfg }: { cfg: AiConfig }) {
  const [state, action, pending] = useActionState<AiFormState, FormData>(saveAiSettingsAction, undefined);
  return (
    <form action={action} className="space-y-6 p-6">
      <Toggle name="ai_enabled" title="AI is switched on (kill switch)" text="Untick to stop every AI feature straight away, for everyone." on={cfg.ai_enabled === "1"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="daily_cap_aud" label="Daily cap for the whole app (A$, rolling 24 hours)" value={cfg.daily_cap_aud} />
        <Field name="job_cap_aud" label="Most one run may spend (A$)" value={cfg.job_cap_aud} />
        <Field name="max_running_jobs" label="Runs allowed at the same time" value={cfg.max_running_jobs} />
        <span className="hidden sm:block" />
        <Field name="jobs_per_15min_member" label="Runs per 15 minutes: members" value={cfg.jobs_per_15min_member} />
        <Field name="jobs_per_15min_admin" label="Runs per 15 minutes: admins" value={cfg.jobs_per_15min_admin} />
      </div>
      <SaveRow pending={pending} state={state} label="Save safety limits" />
    </form>
  );
}

export function TestConnection({ provider = "gemini" }: { provider?: "gemini" | "xai" }) {
  const [state, action, pending] = useActionState<AiFormState>(testConnectionAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="provider" value={provider} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
        {pending ? "Testing…" : "Test the connection"}
      </Button>
      {state?.ok && <span role="status" className="text-sm text-success">{state.message}</span>}
      {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
