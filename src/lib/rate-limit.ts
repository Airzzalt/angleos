// Simple brute-force protection: count recent failed attempts per IP and per email.
import { query } from "./db";

const WINDOW = "15 minutes";

export type Limit = { key: string; max: number };

export async function isLimited(kind: string, limits: Limit[]): Promise<boolean> {
  for (const { key, max } of limits) {
    const { rows } = await query<{ n: number }>(
      `select count(*)::int as n from login_attempts
        where kind = $1 and key = $2 and created_at > now() - interval '${WINDOW}'`,
      [kind, key],
    );
    if ((rows[0]?.n ?? 0) >= max) return true;
  }
  return false;
}

export async function recordFailure(kind: string, keys: string[]) {
  for (const key of keys) {
    await query("insert into login_attempts (kind, key) values ($1, $2)", [kind, key]);
  }
  // Tidy up old rows now and then.
  if (Math.random() < 0.05) await query("delete from login_attempts where created_at < now() - interval '1 day'");
}

export async function clearFailures(kind: string, key: string) {
  await query("delete from login_attempts where kind = $1 and key = $2", [kind, key]);
}
