"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { DEFAULT_LIMIT_CENTS, parseLimitInput } from "@/lib/usage-limit";

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** The owner is whoever the ADMIN_EMAIL setting names. That account can never be demoted or switched off. */
async function isOwner(userId: string) {
  const owner = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!owner) return false;
  const { rows } = await query<{ email: string }>("select email from users where id = $1", [userId]);
  return rows[0]?.email.toLowerCase() === owner;
}

export async function setRoleAction(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "member";
  if (!isId(id) || id === me.id || (role === "member" && (await isOwner(id)))) return;
  if (role === "admin") {
    // Admins are unlimited.
    await query("update users set role = 'admin', usage_limit_cents = null where id = $1", [id]);
  } else {
    await query("update users set role = 'member', usage_limit_cents = coalesce(usage_limit_cents, $2) where id = $1", [
      id,
      DEFAULT_LIMIT_CENTS,
    ]);
    // Sign them out of admin pages right away by ending their sessions.
    await query("delete from sessions where user_id = $1", [id]);
  }
  revalidatePath("/admin/users");
}

export async function setDisabledAction(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const disabled = formData.get("disabled") === "true";
  if (!isId(id) || id === me.id || (disabled && (await isOwner(id)))) return;
  await query("update users set disabled = $2 where id = $1", [id, disabled]);
  if (disabled) await query("delete from sessions where user_id = $1", [id]);
  revalidatePath("/admin/users");
}

export type LimitState = { error?: string; ok?: boolean } | undefined;

export async function setLimitAction(_prev: LimitState, formData: FormData): Promise<LimitState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return { error: "Unknown person." };
  const cents = parseLimitInput(String(formData.get("limit") ?? ""));
  if (cents === undefined) return { error: "Type an amount like 10 or 7.50, or the word unlimited." };
  await query("update users set usage_limit_cents = $2 where id = $1 and role = 'member'", [id, cents]);
  revalidatePath("/admin/users");
  return { ok: true };
}
