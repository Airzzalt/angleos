"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { loginAction, registerAction, resetPasswordAction, type FormState } from "@/app/(auth)/actions";

// React clears a <form action> after every submit, which would wipe what the person typed after an
// error. Submitting by hand keeps the fields as they are.
function submitter(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
}

function ErrorNote({ message }: { message?: string }) {
  return (
    <div aria-live="polite">
      {message && (
        <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-danger" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}

function PasswordField({ id, autoComplete, hint, label = "Password" }: { id: string; autoComplete: string; hint?: string; label?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name="password"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:text-fg"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="h-12 w-full text-base">
      {pending ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : null}
      {children}
      {!pending && <ArrowRight className="h-[18px] w-[18px]" />}
    </Button>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, undefined);
  return (
    <div className="glass rounded-[30px] p-7 sm:p-9">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-[15px] text-muted">Sign in to your workspace.</p>
      <form onSubmit={submitter(action)} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state?.values?.email} />
        </div>
        <PasswordField id="password" autoComplete="current-password" />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <ErrorNote message={state?.error} />
        <Submit pending={pending}>Sign in</Submit>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Have an invite code?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create your account
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, undefined);
  return (
    <div className="glass rounded-[30px] p-7 sm:p-9">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
        <Lock className="h-3.5 w-3.5" /> Invite only
      </div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-[15px] text-muted">Enter the invite code you were given.</p>
      <form onSubmit={submitter(action)} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="code">Invite code</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <Input
              id="code"
              name="code"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ANGL-XXXX-XXXX-XXXX"
              className="pl-11 font-mono tracking-wider"
              defaultValue={state?.values?.code}
              autoFocus
            />
          </div>
        </div>
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" required maxLength={80} defaultValue={state?.values?.name} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
        </div>
        <PasswordField id="password" autoComplete="new-password" hint="At least 10 characters." />
        <ErrorNote message={state?.error} />
        <Submit pending={pending}>Create account</Submit>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}


export function ResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, undefined);
  return (
    <div className="glass rounded-[30px] p-7 sm:p-9">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Set a new password</h1>
      <p className="mt-1.5 text-[15px] text-muted">Enter your email and the reset code you were given.</p>
      <form onSubmit={submitter(action)} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state?.values?.email} />
        </div>
        <div>
          <Label htmlFor="code">Reset code</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <Input
              id="code"
              name="code"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="RSET-XXXX-XXXX"
              className="pl-11 font-mono tracking-wider"
              defaultValue={state?.values?.code}
            />
          </div>
        </div>
        <PasswordField id="password" label="New password" autoComplete="new-password" hint="At least 10 characters." />
        <ErrorNote message={state?.error} />
        <Submit pending={pending}>Set password and sign in</Submit>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
