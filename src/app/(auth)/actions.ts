"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { clientIp, createSession, destroySession } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { hashInviteCode } from "@/lib/invite-code";
import { clearFailures, isLimited, recordFailure } from "@/lib/rate-limit";

// On a rejected form we hand back what was typed (never the password) so the page can refill it.
export type FormState = { error?: string; values?: { code?: string; name?: string; email?: string } } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let dummyHash: Promise<string> | null = null; // so a wrong email takes as long as a wrong password

function sameSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };

  const ip = await clientIp();
  if (await isLimited("login", [{ key: `ip:${ip}`, max: 30 }, { key: `email:${email}`, max: 6 }])) {
    return { error: "Too many attempts. Wait 15 minutes and try again.", values: { email } };
  }

  const { rows } = await query<{ id: string; password_hash: string; disabled: boolean }>(
    "select id, password_hash, disabled from users where lower(email) = $1",
    [email],
  );
  const user = rows[0];
  dummyHash ??= hashPassword("not-a-real-password");
  const ok = await verifyPassword(password, user?.password_hash ?? (await dummyHash));
  if (!user || !ok || user.disabled) {
    await recordFailure("login", [`ip:${ip}`, `email:${email}`]);
    return { error: "That email and password don't match.", values: { email } };
  }

  await clearFailures("login", `email:${email}`);
  await createSession(user.id);
  redirect("/");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const values = { code, name, email };
  if (!code) return { error: "Enter your invite code.", values };
  if (!name || name.length > 80) return { error: "Enter your name.", values };
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: "Enter a valid email address.", values };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, values };

  const ip = await clientIp();
  if (await isLimited("register", [{ key: `ip:${ip}`, max: 10 }])) {
    return { error: "Too many attempts. Wait 15 minutes and try again.", values };
  }
  const badCode = "That invite code isn't valid, has expired, or was already used.";

  const { rows: count } = await query<{ n: number }>("select count(*)::int as n from users");
  const firstAccount = (count[0]?.n ?? 0) === 0;

  let role: "admin" | "member" = "member";
  let inviteId: string | null = null;

  if (firstAccount) {
    // Very first account only: the one-time setup code from the server settings creates the admin.
    const setup = process.env.SETUP_CODE ?? "";
    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    if (!setup || !adminEmail || !sameSecret(code, setup) || email !== adminEmail) {
      await recordFailure("register", [`ip:${ip}`]);
      return { error: badCode, values };
    }
    role = "admin";
  } else {
    // Claim the invite in one atomic step so a code can only ever be used once.
    const claimed = await query<{ id: string; role: "admin" | "member" }>(
      `update invites set used_at = now()
        where code_hash = $1 and used_at is null and revoked_at is null
          and (expires_at is null or expires_at > now())
          and (locked_email is null or lower(locked_email) = $2)
        returning id, role`,
      [hashInviteCode(code), email],
    );
    if (!claimed.rows[0]) {
      await recordFailure("register", [`ip:${ip}`]);
      return { error: badCode, values };
    }
    inviteId = claimed.rows[0].id;
    role = claimed.rows[0].role;
  }

  const releaseInvite = async () => {
    if (inviteId) await query("update invites set used_at = null where id = $1", [inviteId]);
  };

  try {
    const passwordHash = await hashPassword(password);
    const created = await query<{ id: string }>(
      "insert into users (email, name, password_hash, role) values ($1, $2, $3, $4) returning id",
      [email, name, passwordHash, role],
    );
    const userId = created.rows[0].id;
    const ws = await query<{ id: string }>("insert into workspaces (name) values ($1) returning id", [
      `${name.split(" ")[0]}'s workspace`,
    ]);
    await query("insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner')", [
      ws.rows[0].id,
      userId,
    ]);
    if (inviteId) await query("update invites set used_by = $1 where id = $2", [userId, inviteId]);
    await createSession(userId);
  } catch (err) {
    await releaseInvite();
    if ((err as { code?: string }).code === "23505" || /unique/i.test(String((err as Error).message))) {
      return { error: "An account with that email already exists. Try signing in instead.", values };
    }
    console.error("[angleos] register failed:", err);
    return { error: "Something went wrong creating your account. Please try again.", values };
  }
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { email, code };
  if (!email || !code) return { error: "Enter your email and your reset code.", values };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, values };

  const ip = await clientIp();
  if (await isLimited("reset", [{ key: `ip:${ip}`, max: 10 }, { key: `email:${email}`, max: 6 }])) {
    return { error: "Too many attempts. Wait 15 minutes and try again.", values };
  }
  const bad = "That reset code isn't valid, has expired, or was already used.";

  const { rows } = await query<{ id: string; disabled: boolean }>(
    "select id, disabled from users where lower(email) = $1",
    [email],
  );
  const user = rows[0];
  let ok = false;
  if (user && !user.disabled) {
    const owner = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const setup = process.env.SETUP_CODE ?? "";
    if (email === owner && setup && sameSecret(code, setup)) {
      // Owner recovery: nobody above the owner can make a code, so the owner uses the SETUP_CODE saved on Render.
      ok = true;
    } else {
      const claimed = await query(
        `update password_resets set used_at = now()
          where code_hash = $1 and user_id = $2 and used_at is null and expires_at > now()
          returning id`,
        [hashInviteCode(code), user.id],
      );
      ok = claimed.rows.length > 0;
    }
  }
  if (!user || !ok) {
    await recordFailure("reset", [`ip:${ip}`, `email:${email}`]);
    return { error: bad, values };
  }

  await query("update users set password_hash = $2 where id = $1", [user.id, await hashPassword(password)]);
  await query("delete from sessions where user_id = $1", [user.id]); // signs out every old device
  await clearFailures("reset", `email:${email}`);
  await createSession(user.id);
  redirect("/");
}
