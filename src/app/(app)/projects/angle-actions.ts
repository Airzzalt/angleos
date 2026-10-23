"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { LIMITS } from "@/lib/uploads/limits";
import { getAiConfig, readiness, readinessAngles } from "@/lib/ai/settings";
import { latestAngleJob, parseOpts, planAngles, startAngles } from "@/lib/ai/angles";
import { applyEdit, type Angle } from "@/lib/ai/angles-shape";
import { generate } from "@/lib/ai/gemini";
import { recordUsage } from "@/lib/ai/guard";
import { costAud } from "@/lib/ai/cost";
import { assertWithinLimit, usageFor } from "@/lib/usage";
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
  return { id: j.id, status: j.status, done: j.done_steps, total: j.total_steps, message: j.message, error: j.error, spentCents: Math.round(Number(j.spent_cents)), seconds: j.secs };
}

export async function favouriteAngleAction(projectId: string, id: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(id)) return;
  await query("update project_angles set favourite = not favourite where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/projects/${project.id}/angles/${id}`);
}

export async function deleteAngleAction(projectId: string, id: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(id)) return;
  await query("delete from project_angles where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/angles");
}

export async function saveProductLineAction(projectId: string, text: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return { error: "That project wasn't found." };
  const line = clean(text, 600);
  if (line.length < 15) return { error: "Say a bit more: what you are selling and who it is for (at least a short sentence)." };
  await query("update projects set description = $2, updated_at = now() where id = $1", [project.id, line]);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}

export async function saveOfferAction(projectId: string, text: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return { error: "That project wasn't found." };
  await query("update projects set offer = $2, updated_at = now() where id = $1", [project.id, clean(text, 600)]);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}

const PRODUCT_LINE_SYSTEM = `You are the PRODUCT LINE WRITER. From the text you are given (research notes, customer threads, product pages), write ONE short line, at most 25 words, saying what the product is and who buys it, like: "Kids contour pillow, ages 2+, sized by age, bought by parents of kids who sleep badly". Use only what the text supports. Do not invent a product or a brand. If the text does not make clear what is being sold, reply exactly: UNCLEAR. Reply with the line only, no quotes, no extra words.`;

/** Asks the cheap AI provider to read what is already in the project and suggest the one-line product description. */
export async function suggestProductLineAction(projectId: string): Promise<{ text?: string; error?: string }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return { error: "That project wasn't found." };
  const cfg = await getAiConfig();
  const ready = readiness(cfg);
  if (!ready.ok) return { error: ready.reason };
  try {
    await assertWithinLimit(me.id, me.role);
  } catch {
    return { error: "You've used up your AI credit." };
  }
  const files = (await query<{ file_name: string; summary: string | null; t: string }>(
    "select file_name, summary, substr(extracted_text, 1, 900) as t from project_files where project_id = $1 order by (summary is null), file_name limit 12",
    [project.id],
  )).rows;
  const notes = (await query<{ body: string }>("select body from project_context where project_id = $1", [project.id])).rows[0]?.body ?? "";
  const material = [
    `Project name: ${project.name}`,
    project.description ? `Typed so far: ${project.description}` : "",
    notes ? `Owner notes:\n${notes.slice(0, 1500)}` : "",
    ...files.map((f) => `## ${f.file_name}\n${(f.summary ?? f.t).slice(0, 700)}`),
  ].filter(Boolean).join("\n\n").slice(0, 9000);
  if (material.length < 60) return { error: "There is nothing to read yet. Add research files first, or type the product line yourself." };
  try {
    const res = await generate({ model: ready.reader.model, system: PRODUCT_LINE_SYSTEM, prompt: material, maxOutputTokens: 400 });
    await recordUsage({ userId: me.id, workspaceId: me.workspaceId, jobId: null, task: "angles:productline", provider: "gemini", model: ready.reader.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costAud: costAud(res.inputTokens, res.outputTokens, ready.reader, ready.usdAud) });
    const line = clean(res.text.replace(/^["'\s]+|["'\s]+$/g, ""), 300);
    if (!line || /^unclear\b/i.test(line)) return { error: "I couldn't tell what is being sold from your files. Type it yourself in one line." };
    return { text: line };
  } catch {
    return { error: "The AI couldn't answer just now. Try again, or type it yourself." };
  }
}

export async function deleteAngleBackAction(formData: FormData) {
  const me = await requireUser();
  const project = await getProject(me, String(formData.get("projectId") ?? ""));
  const id = String(formData.get("id") ?? "");
  if (!project) redirect("/angles");
  if (isId(id)) await query("delete from project_angles where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/angles");
  redirect(`/projects/${project.id}?tab=angles`);
}

export async function saveClaimLevelAction(projectId: string, level: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return { error: "That project wasn't found." };
  if (!["strict", "standard", "bold"].includes(level)) return { error: "Pick Strict, Standard or Bold." };
  await query("update projects set claim_level = $2, updated_at = now() where id = $1", [project.id, level]);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}

export async function deleteRunAction(projectId: string, runId: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return;
  if (runId === "none") await query("delete from project_angles where project_id = $1 and job_id is null", [project.id]);
  else if (isId(runId)) await query("delete from project_angles where project_id = $1 and job_id = $2", [project.id, runId]);
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/angles");
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
  revalidatePath(`/projects/${project.id}/angles/${id}`);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}

/** Quick start: a project that is only a name and a few lines. The research files are added on its Angles tab. */
export async function createQuickProjectAction(_p: AngleState, formData: FormData): Promise<AngleState> {
  const me = await requireUser();
  const name = clean(formData.get("name"), 120);
  const about = clean(formData.get("about"), 2000);
  if (name.length < 2) return { error: "Give the product a name (at least 2 characters)." };
  if (about.length < 15) return { error: "Say what you are selling and who it is for (one line is enough). The angles are built around it." };
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
