// Picks up AI runs that were cut off by a restart, a deploy or the free server sleeping.
// Files already read are cached, so resuming costs only what was left. A run is tried at most 3 times.
import { query } from "../db";
import type { SessionUser } from "../auth";
import { getAiConfig, readiness } from "./settings";
import { planBrief, runBriefJob } from "./brief";

const STALE = "150 seconds";
const g = globalThis as unknown as { __angleosResumer?: boolean };

export function startResumer() {
  if (g.__angleosResumer) return;
  g.__angleosResumer = true;
  const tick = () => void resumeStaleJobs().catch((e) => console.error("resume check failed", e instanceof Error ? e.message : "unknown"));
  setTimeout(tick, 15_000);
  setInterval(tick, 30_000).unref?.();
}

export async function resumeStaleJobs() {
  // Give up on runs that keep getting cut off.
  await query("update ai_jobs set status = 'failed', error = 'This run was cut off several times. Please run it again.', finished_at = now() where status in ('queued','running') and resumes >= 3 and heartbeat_at < now() - interval '" + STALE + "'");
  // Runs that can't be picked up (angles are one single AI call) are simply marked as cut off.
  await query("update ai_jobs set status = 'failed', error = 'This run was cut off by a restart. Please run it again; files already read are not charged twice.', finished_at = now() where status in ('queued','running') and kind <> 'brief' and heartbeat_at < now() - interval '" + STALE + "'");
  // Claim one stale run atomically, so two servers can never run the same job.
  const { rows } = await query<{ id: string; owner_id: string; project_id: string; cap_cents: number }>(
    `update ai_jobs set heartbeat_at = now(), resumes = resumes + 1, message = 'Picking up where it left off…'
      where id = (select id from ai_jobs where status in ('queued','running') and kind = 'brief' and heartbeat_at < now() - interval '${STALE}' and resumes < 3 order by created_at limit 1 for update skip locked)
      returning id, owner_id, project_id, cap_cents`,
  );
  const job = rows[0];
  if (!job) return;
  try {
    const u = (await query<{ id: string; email: string; name: string; role: "admin" | "member"; workspace_id: string | null }>(
      `select u.id, u.email, u.name, u.role, wm.workspace_id from users u left join workspace_members wm on wm.user_id = u.id where u.id = $1 and not u.disabled limit 1`,
      [job.owner_id],
    )).rows[0];
    const p = (await query<{ id: string; name: string }>("select id, name from projects where id = $1", [job.project_id])).rows[0];
    const cfg = await getAiConfig();
    const ready = readiness(cfg);
    if (!u || !p || !ready.ok) {
      await query("update ai_jobs set status = 'failed', error = 'This run could not be picked up again. Please run it again.', finished_at = now() where id = $1", [job.id]);
      return;
    }
    const me: SessionUser = { id: u.id, email: u.email, name: u.name, role: u.role, workspaceId: u.workspace_id };
    const plan = await planBrief(p.id, ready);
    if (plan.error) {
      await query("update ai_jobs set status = 'failed', error = $2, finished_at = now() where id = $1", [job.id, plan.error]);
      return;
    }
    await query("update ai_jobs set total_steps = done_steps + $2 where id = $1", [job.id, plan.batches.length + (plan.includeWrite ? 1 : 0)]);
    // Keep the original spending cap; money already spent counts against it.
    await runBriefJob(job.id, me, p, cfg, ready, { ...plan, capCents: job.cap_cents });
  } catch (e) {
    console.error("resume crashed", e instanceof Error ? e.message : "unknown");
    await query("update ai_jobs set status = 'failed', error = 'This run could not be picked up again. Please run it again.', finished_at = now() where id = $1 and status in ('queued','running')", [job.id]);
  }
}
