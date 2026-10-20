"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateInviteCode, hashInviteCode, inviteHint } from "@/lib/invite-code";

export type InviteState = { error?: string; code?: string; note?: string; expires?: string } | undefined;

export async function createInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim().slice(0, 120) || null;
  const lockedEmail = String(formData.get("lockedEmail") ?? "").trim().toLowerCase() || null;
  const role = formData.get("role") === "admin" ? "admin" : "member";
  const days = Number(formData.get("days") ?? 7);

  if (lockedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lockedEmail)) return { error: "That email address doesn't look right." };
  if (!Number.isFinite(days) || days < 0 || days > 365) return { error: "Choose how long the code lasts." };

  const code = generateInviteCode();
  const res = await query<{ expires_at: string | null }>(
    `insert into invites (code_hash, code_hint, role, note, locked_email, created_by, expires_at)
     values ($1, $2, $3, $4, $5, $6, case when $7::int = 0 then null else now() + ($7::int || ' days')::interval end)
     returning expires_at`,
    [hashInviteCode(code), inviteHint(code), role, note, lockedEmail, admin.id, Math.round(days)],
  );
  revalidatePath("/admin/invites");
  return { code, note: note ?? undefined, expires: res.rows[0]?.expires_at ? String(res.rows[0].expires_at) : undefined };
}

export async function revokeInviteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await query("update invites set revoked_at = now() where id = $1 and used_at is null and revoked_at is null", [id]);
  revalidatePath("/admin/invites");
}
