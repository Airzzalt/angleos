// Sessions: a random token lives in an httpOnly cookie; only its hash is stored in the database.
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "./db";

export const SESSION_COOKIE = "angleos_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  workspaceId: string | null;
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function secureCookie() {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production";
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await query(
    `insert into sessions (user_id, token_hash, expires_at, user_agent)
     values ($1, $2, now() + ($3 || ' days')::interval, $4)`,
    [userId, sha256(token), String(SESSION_DAYS), (h.get("user-agent") ?? "").slice(0, 300)],
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query<{
    id: string;
    email: string;
    name: string;
    role: "admin" | "member";
    workspace_id: string | null;
  }>(
    `select u.id, u.email, u.name, u.role, wm.workspace_id
       from sessions s
       join users u on u.id = s.user_id
       left join workspace_members wm on wm.user_id = u.id
      where s.token_hash = $1 and s.expires_at > now() and not u.disabled
      limit 1`,
    [sha256(token)],
  );
  const r = rows[0];
  return r ? { id: r.id, email: r.email, name: r.name, role: r.role, workspaceId: r.workspace_id } : null;
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
