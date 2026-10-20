"use server";

import { revalidatePath } from "next/cache";
import { clientIp, endOtherSessions, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { clearFailures, isLimited, recordFailure } from "@/lib/rate-limit";

export type SettingsState = { error?: string; ok?: string } | undefined;

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Perth" });

export async function changeNameAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { error: "Your name needs to be between 2 and 80 characters." };
  if (name === user.name) return { error: "That is already your name." };

  // One atomic step: only changes if 30 days have passed since the last change.
  const changed = await query<{ id: string }>(
    `update users set name = $2, name_changed_at = now()
      where id = $1 and (name_changed_at is null or name_changed_at < now() - interval '30 days')
      returning id`,
    [user.id, name],
  );
  if (!changed.rows[0]) {
    const { rows } = await query<{ next: string }>(
      "select (name_changed_at + interval '30 days') as next from users where id = $1",
      [user.id],
    );
    return { error: `You can change your name once every 30 days. Next change: ${rows[0] ? fmtDate(rows[0].next) : "later"}.` };
  }
  revalidatePath("/", "layout");
  return { ok: "Name updated." };
}

export async function changePasswordAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const again = String(formData.get("again") ?? "");

  if (!current || !next) return { error: "Fill in all the boxes." };
  if (next !== again) return { error: "The two new passwords don't match." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next === current) return { error: "Choose a password that is different from your current one." };

  const ip = await clientIp();
  const key = `user:${user.id}`;
  if (await isLimited("pwchange", [{ key, max: 5 }])) {
    return { error: "Too many wrong attempts. Wait 15 minutes and try again." };
  }
  const { rows } = await query<{ password_hash: string }>("select password_hash from users where id = $1", [user.id]);
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
    await recordFailure("pwchange", [key, `ip:${ip}`]);
    return { error: "Your current password isn't right." };
  }

  await query("update users set password_hash = $2 where id = $1", [user.id, await hashPassword(next)]);
  await clearFailures("pwchange", key);
  await endOtherSessions(user.id); // any other device or browser has to sign in again
  return { ok: "Password changed. Other devices have been signed out." };
}
