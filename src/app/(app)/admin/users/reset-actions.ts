"use server";

import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateResetCode, hashInviteCode } from "@/lib/invite-code";

export type ResetState = { error?: string; code?: string } | undefined;

/** An admin makes a one-hour, one-use code for someone who forgot their password. */
export async function createResetCodeAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Unknown person." };
  const { rows } = await query<{ email: string; role: string }>("select email, role from users where id = $1", [id]);
  const target = rows[0];
  if (!target) return { error: "Unknown person." };

  const owner = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const iAmOwner = me.email.toLowerCase() === owner;
  if (target.email.toLowerCase() === owner) return { error: "The owner's password can't be reset from here." };
  if (target.role === "admin" && !iAmOwner) return { error: "Only the owner can reset another admin's password." };

  const code = generateResetCode();
  await query("update password_resets set used_at = now() where user_id = $1 and used_at is null", [id]);
  await query(
    "insert into password_resets (user_id, code_hash, created_by, expires_at) values ($1, $2, $3, now() + interval '1 hour')",
    [id, hashInviteCode(code), me.id],
  );
  return { code };
}
