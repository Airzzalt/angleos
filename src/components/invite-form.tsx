"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Copy, Loader2, Plus } from "lucide-react";
import { createInviteAction, type InviteState } from "@/app/(app)/admin/invites/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: the code is still selectable */
        }
      }}
    >
      {done ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : "Copy"}
    </Button>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInviteAction, undefined);
  return (
    <Card>
      <CardHeader title="Create an invite code" description="Send the code to the person. They use it on the Register page." />
      <form action={action} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="note">Who is it for? (just for you)</Label>
          <Input id="note" name="note" maxLength={120} placeholder="e.g. Sam, video editor" />
        </div>
        <div>
          <Label htmlFor="lockedEmail">Lock to an email (optional)</Label>
          <Input id="lockedEmail" name="lockedEmail" type="email" placeholder="They must register with this email" />
        </div>
        <div>
          <Label htmlFor="days">Expires after</Label>
          <Select id="days" name="days" defaultValue="7">
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="0">Never</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="role">Access</Label>
          <Select id="role" name="role" defaultValue="member">
            <option value="member">Member (can generate, cannot see course data)</option>
            <option value="admin">Admin (full access)</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create code
          </Button>
        </div>
        <div className="sm:col-span-2" aria-live="polite">
          {state?.error && (
            <p className="flex items-center gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-danger" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </p>
          )}
          {state?.code && (
            <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4">
              <p className="text-sm font-medium">New invite code. Copy it now: it is shown only once.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="select-all rounded-xl bg-surface px-4 py-2.5 font-mono text-lg font-semibold tracking-wider">
                  {state.code}
                </code>
                <CopyButton text={state.code} />
              </div>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}
