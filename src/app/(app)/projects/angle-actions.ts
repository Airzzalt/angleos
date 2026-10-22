"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { LIMITS } from "@/lib/uploads/limits";
import { getAiConfig, readinessAngles } from "@/lib/ai/settings";
import { latestAngleJob, parseOpts, planAngles, startAngles } from "@/lib/ai/angles";
import { applyEdit, type Angle } from "@/lib/ai/angles-shape";
import { usageFor } from "@/lib/usage";
import { aud } from "@/lib/usage-limit";

export type AngleState = { error?: string; ok?: boolean } | undefined;
export type PlanDto = { estCents: number; capCents: number; files: number; needRead: number; willRead: number; includeWrite: boolean; thin: boolean; hasBrief: boolean };

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

export async function estimateAnglesAction(projectId: string, raw: unknown): Promise<{ plan?: PlanDto; blocked?: string; creditLine?: string }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return { blocked: "That project wasn't found." };
  const ready = readinessAngles(await getAiConfig());
  if (!ready.ok) return { blocked: `${ready.reason}${me.role === "admin" ? " Set it up on the AI connection page." : " Ask Ayaan."}` };
  const plan = await planAngles(project.id, ready, parseOpts(raw));
  if (plan.error) return { blocked: plan.error };
  const u = await usageFor(me.id, me.role);
  return {
    plan: { estCents: plan.estCents, capCents: plan.capCents, files: plan.files, needRead: plan.needRead, willRead: plan.willRead, includeWrite: plan.includeWrite, thin: plan.thin, hasBrief: plan.hasBrief },
    creditLine: u.unlimited ? "" : `You have ${aud(u.remainingCents ?? 0)} of credit left.`,
  };
}

export async function startAnglesAction(projectId: string, confirmedCents: number, raw: unknown): Promise<AngleState & { jobId?: string }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return { error: "That project wasn't found." };
  const cfg = await getAiConfig();
  const ready = readinessAngles(cfg);
  if (!ready.ok) return { error: ready.reason };
  const c = Math.round(Number(confirmedCents));
  if (!Number.isFinite(c) || c < 0 || c > 100_000) return { error: "Something looked wrong with that request. Reload the page and try again." };
  const res = await startAngles(me, project, cfg, ready, parseOpts(raw), c);
  if (!res.ok) return { error: res.message };
  after(res.run);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, jobId: res.jobId };
}

export async function anglesJobStatusAction(projectId: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return null;
  const j = await latestAngleJob(project.id);
  if (!j) return null;
  return { id: j.id, status: j.status, done: j.done_steps, total: j.total_steps, message: j.message, error: j.error, spentCents: Math.round(Number(j.spent_cents)) };
}

export async function favouriteAngleAction(projectId: string, id: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(id)) return;
  await query("update project_angles set favourite = not favourite where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath(`/projects/${project.id}`);
}

export async function deleteAngleAction(projectId: string, id: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(id)) return;
  await query("delete from project_angles where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath(`/projects/${project.id}`);
}

export async function saveAngleAction(_p: AngleState, formData: FormData): Promise<AngleState> {
  const me = await requireUser();
  const project = await getProject(me, String(formData.get("projectId") ?? ""));
  const id = String(formData.get("id") ?? "");
  if (!project || !isId(id)) return { error: "That angle wasn't found." };
  const row = (await query<{ data: Angle }>("select data from project_angles where id = $1 and project_id = $2", [id, project.id])).rows[0];
  if (!row) return { error: "That angle wasn't found." };
  const angle = clean(formData.get("angle"), 400);
  if (angle.length < 3) return { error: "The angle can't be empty." };
  const next = applyEdit(row.data, { angle, hooks: String(formData.get("hooks") ?? "") });
  await query("update project_angles set data = $3, edited = true where id = $1 and project_id = $2", [id, project.id, JSON.stringify(next)]);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}

/** Quick start: a project that is only a name and a few lines. The research files are added on its Angles tab. */
export async function createQuickProjectAction(_p: AngleState, formData: FormData): Promise<AngleState> {
  const me = await requireUser();
  const name = clean(formData.get("name"), 120);
  const about = clean(formData.get("about"), 2000);
  if (name.length < 2) return { error: "Give the product a name (at least 2 characters)." };
  if (me.role !== "admin") {
    const n = await query<{ n: number }>("select count(*)::int as n from projects where owner_id = $1", [me.id]);
    if ((n.rows[0]?.n ?? 0) >= LIMITS.maxProjectsPerMember) return { error: `You've reached the limit of ${LIMITS.maxProjectsPerMember} projects. Delete one you no longer need.` };
  }
  const { rows } = await query<{ id: string }>(
    `insert into projects (owner_id, workspace_id, name, description, kind) values ($1,$2,$3,$4,'quick') returning id`,
    [me.id, me.workspaceId, name, about],
  );
  revalidatePath("/projects");
  redirect(`/projects/${rows[0].id}?tab=angles`);
}

export async function makeFullProjectAction(formData: FormData) {
  const me = await requireUser();
  const project = await getProject(me, String(formData.get("projectId") ?? ""));
  if (!project) return;
  await query("update projects set kind = 'full', updated_at = now() where id = $1", [project.id]);
  revalidatePath("/projects");
  revalidatePath(`/projects/${project.id}`);
}
