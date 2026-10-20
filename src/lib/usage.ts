// Database side of the usage limit. Every AI feature (built in later phases) calls `assertWithinLimit` first
// and records its cost with `usage_log`, so the limit cannot be skipped.
import { query } from "./db";
import { limitState, aud, type LimitState } from "./usage-limit";

export class UsageLimitError extends Error {
  constructor(public state: LimitState) {
    super(`You've used your ${aud(state.limitCents ?? 0)} of AI credit. Ask Ayaan to top it up.`);
  }
}

export async function usageFor(userId: string, role: string): Promise<LimitState> {
  const { rows } = await query<{ spent: string | null; limit_cents: number | null }>(
    `select (select coalesce(sum(est_cost), 0) * 100 from usage_log where user_id = u.id) as spent,
            u.usage_limit_cents as limit_cents
       from users u where u.id = $1`,
    [userId],
  );
  const r = rows[0];
  return limitState(role, Number(r?.spent ?? 0), r?.limit_cents ?? null);
}

export async function assertWithinLimit(userId: string, role: string) {
  const state = await usageFor(userId, role);
  if (state.blocked) throw new UsageLimitError(state);
  return state;
}
