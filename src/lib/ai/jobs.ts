// Small helpers shared by every background AI run (brief, angles, later scripts and chat).
import { query } from "../db";

export const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

export function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(t);
}

export async function setJob(id: string, patch: { status?: string; message?: string; error?: string | null; done?: number }) {
  await query(
    `update ai_jobs set status = coalesce($2::text, status), message = coalesce($3::text, message), error = coalesce($4::text, error),
            done_steps = coalesce($5::int, done_steps), heartbeat_at = now(),
            finished_at = case when $2::text in ('done','failed','cancelled') then now() else finished_at end
      where id = $1 and status not in ('done','failed','cancelled')`,
    [id, patch.status ?? null, patch.message ?? null, patch.error ?? null, patch.done ?? null],
  );
}

/** Keeps a run's heartbeat fresh during one long AI call, so a slow answer is never mistaken for a dead run. */
export async function withHeartbeat<T>(jobId: string, fn: () => Promise<T>): Promise<T> {
  const t = setInterval(() => void query("update ai_jobs set heartbeat_at = now() where id = $1 and status in ('queued','running')", [jobId]).catch(() => {}), 25_000);
  try {
    return await fn();
  } finally {
    clearInterval(t);
  }
}
