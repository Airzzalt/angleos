"use client";

import { startTransition, useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { changeNameAction, changePasswordAction, type SettingsState } from "@/app/(app)/settings/actions";

function Note({ state }: { state: SettingsState }) {
  return (
    <div aria-live="polite">
      {state?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </p>
      )}
      {state?.ok && (
        <p role="status" className="pop-in flex items-start gap-2 rounded-xl bg-success/10 px-3.5 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.ok}</span>
        </p>
      )}
    </div>
  );
}

// Submitting by hand keeps what was typed when there is an error (React would otherwise clear the form).
function submitter(action: (fd: FormData) => void, after?: (form: HTMLFormElement) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    startTransition(() => action(new FormData(form)));
    after?.(form);
  };
}

export function NameForm({ name, nextChange }: { name: string; nextChange: string | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changeNameAction, undefined);
  const locked = !!nextChange;
  return (
    <form onSubmit={submitter(action)} className="space-y-3">
      <div>
        <Label htmlFor="display-name">Your name</Label>
        <Input id="display-name" name="name" defaultValue={name} maxLength={80} required disabled={locked} />
        <p className="mt-1.5 text-xs text-muted">
          {locked ? `You can change your name again on ${nextChange}.` : "You can change this once every 30 days."}
        </p>
      </div>
      <Note state={state} />
      <Button type="submit" disabled={pending || locked}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save name
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePasswordAction, undefined);
  return (
    <form
      onSubmit={submitter(action)}
      className="space-y-3"
    >
      <div>
        <Label htmlFor="pw-current">Current password</Label>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="pw-next">New password</Label>
        <Input id="pw-next" name="next" type="password" autoComplete="new-password" required />
        <p className="mt-1.5 text-xs text-muted">At least 10 characters.</p>
      </div>
      <div>
        <Label htmlFor="pw-again">New password again</Label>
        <Input id="pw-again" name="again" type="password" autoComplete="new-password" required />
      </div>
      <Note state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Change password
      </Button>
    </form>
  );
}
