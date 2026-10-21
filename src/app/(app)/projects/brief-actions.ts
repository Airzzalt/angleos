"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { getAiConfig, readiness } from "@/lib/ai/settings";
import { BRIEF_SECTIONS, latestJob, startBrief, type BriefSection } from "@/lib/ai/brief";

export type BriefState = { error?: string; ok?: boolean; jobId?: string } | undefined;

export async function startBriefAction(projectId: string, confirmedCents: number): Promise<BriefState> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return { error: "That project wasn't found." };
  const cfg = await getAiConfig();
  const ready = readiness(cfg);
  if (!ready.ok) return { error: ready.reason };
  const c = Math.round(Number(confirmedCents));
  if (!Number.isFinite(c) || c < 0 || c > 100_000) return { error: "Something looked wrong with that request. Reload the page and try again." };
  const res = await startBrief(me, project, cfg, ready, c);
  if (!res.ok) return { error: res.message };
  // Runs after the reply is sent, so the page does not wait for the AI.
  after(res.run);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, jobId: res.jobId };
}

export async function jobStatusAction(projectId: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return null;
  const j = await latestJob(project.id);
  if (!j) return null;
  return { id: j.id, status: j.status, done: j.done_steps, total: j.total_steps, message: j.message, error: j.error, spentCents: Math.round(Number(j.spent_cents)) };
}

export async function cancelJobAction(projectId: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return;
  await query("update ai_jobs set status = 'cancelled', message = 'Cancelled.', finished_at = now() where project_id = $1 and status in ('queued','running')", [project.id]);
  revalidatePath(`/projects/${project.id}`);
}

export async function saveBriefSectionAction(_p: BriefState, formData: FormData): Promise<BriefState> {
  const me = await requireUser();
  const project = await getProject(me, String(formData.get("projectId") ?? ""));
  if (!project) return { error: "That project wasn't found." };
  const key = String(formData.get("key") ?? "");
  if (!BRIEF_SECTIONS.some((s) => s.key === key)) return { error: "Unknown section." };
  const body = String(formData.get("body") ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (body.length > 6000) return { error: "That's too long (6,000 characters at most)." };
  const row = (await query<{ sections: BriefSection[] }>("select sections from project_briefs where project_id = $1", [project.id])).rows[0];
  if (!row) return { error: "There is no brief yet." };
  const sections = row.sections.map((s) => (s.key === key ? { ...s, body, edited: true } : s));
  await query("update project_briefs set sections = $2, updated_at = now() where project_id = $1", [project.id, JSON.stringify(sections)]);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}
