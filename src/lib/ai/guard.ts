// The safety rules around every AI run. Nothing calls the AI without passing through here.
import { query } from "../db";
import type { SessionUser } from "../auth";
import { isLimited, recordFailure } from "../rate-limit";
import { assertWithinLimit, usageFor, UsageLimitError } from "../usage";
import { aud } from "../usage-limit";
import { numSetting, type AiConfig } from "./settings";
import { CENTS } from "./cost";

export class StopJob extends Error {}

export async function spentLast24hCents(): Promise<number> {
  const { rows } = await query<{ c: string | null }>("select coalesce(sum(est_cost), 0) * 100 as c from usage_log where created_at > now() - interval '24 hours'");
  return Number(rows[0]?.c ?? 0);
}

export async function runningJobs(): Promise<number> {
  const { rows } = await query<{ n: number }>("select count(*)::int as n from ai_jobs where status in ('queued','running') and heartbeat_at > now() - interval '3 minutes'");
  return rows[0]?.n ?? 0;
}

/** Everything that must be true before a run is allowed to start. Returns a plain-words reason if not. */
export async function checkStart(me: SessionUser, cfg: AiConfig, projectId: string | null, estCents: number): Promise<{ ok: true } | { ok: false; message: string }> {
  // 1. Their own credit.
  const state = await usageFor(me.id, me.role);
  if (state.blocked) return { ok: false, message: `You've used your ${aud(state.limitCents ?? 0)} of AI credit. Ask Ayaan to top it up.` };
  if (!state.unlimited && state.remainingCents! < estCents) {
    return { ok: false, message: `This needs about ${aud(estCents)} but you only have ${aud(state.remainingCents!)} of credit left.` };
  }
  // 2. The whole app's daily spending cap (protects the owner's card from everyone together).
  const capCents = CENTS(numSetting(cfg.daily_cap_aud, 20));
  if ((await spentLast24hCents()) + estCents > capCents) {
    return { ok: false, message: "AI has reached its daily spending limit for today. Try again tomorrow, or ask the admin to raise it." };
  }
  // 3. One run at a time per person and per project, and a cap on runs across the whole app.
  const mine = await query<{ n: number }>(
    `select count(*)::int as n from ai_jobs where status in ('queued','running') and heartbeat_at > now() - interval '3 minutes' and (owner_id = $1 or ($2::uuid is not null and project_id = $2::uuid))`,
    [me.id, projectId],
  );
  if ((mine.rows[0]?.n ?? 0) > 0) return { ok: false, message: "An AI run is already going. Wait for it to finish first." };
  if ((await runningJobs()) >= Math.max(1, numSetting(cfg.max_running_jobs, 2))) return { ok: false, message: "The AI is busy with other runs right now. Try again in a minute or two." };
  // 4. Speed limit per person.
  const max = me.role === "admin" ? numSetting(cfg.jobs_per_15min_admin, 12) : numSetting(cfg.jobs_per_15min_member, 3);
  if (await isLimited("ai", [{ key: me.id, max }])) return { ok: false, message: "You're starting AI runs too quickly. Wait a few minutes and try again." };
  await recordFailure("ai", [me.id]);
  return { ok: true };
}

/** Called before EVERY AI call inside a run. Throws StopJob (stop quietly) or UsageLimitError. */
export async function beforeCall(job: { id: string; owner_id: string; cap_cents: number }, who: { id: string; role: string }, cfg: AiConfig) {
  const { rows } = await query<{ status: string; spent: string }>("select status, spent_cents as spent from ai_jobs where id = $1", [job.id]);
  const r = rows[0];
  if (!r || r.status === "cancelled") throw new StopJob("Cancelled.");
  if (Number(r.spent) >= job.cap_cents) throw new StopJob("This run reached its spending cap, so it stopped.");
  await assertWithinLimit(who.id, who.role); // throws UsageLimitError
  if ((await spentLast24hCents()) >= CENTS(numSetting(cfg.daily_cap_aud, 20))) throw new StopJob("AI reached its daily spending limit, so this run stopped.");
  await query("update ai_jobs set heartbeat_at = now() where id = $1", [job.id]);
}

export async function recordUsage(p: { userId: string; workspaceId: string | null; jobId: string | null; task: string; provider: string; model: string; inputTokens: number; outputTokens: number; costAud: number }) {
  await query(
    `insert into usage_log (user_id, workspace_id, task, provider, model, input_tokens, output_tokens, est_cost) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [p.userId, p.workspaceId, p.task, p.provider, p.model, p.inputTokens, p.outputTokens, p.costAud],
  );
  if (p.jobId) await query("update ai_jobs set spent_cents = spent_cents + $2 where id = $1", [p.jobId, p.costAud * 100]);
}

export { UsageLimitError };
