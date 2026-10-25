"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { getAiConfig, readinessAngles } from "@/lib/ai/settings";
import { estimateScripts, startScripts, type ScriptRequest } from "@/lib/ai/scripts";
import { parseRequest } from "@/lib/ai/script-shape";
import { usageFor } from "@/lib/usage";
import { aud } from "@/lib/usage-limit";

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function toRequest(raw: unknown): ScriptRequest {
  const o = (raw ?? {}) as Record<string, unknown>;
  const r = parseRequest({ formats: o.formats, length: o.length, note: o.note });
  const ci = Number(o.creativeIndex);
  return { ...r, creativeIndex: Number.isInteger(ci) && ci >= 0 && ci < 3 ? ci : null };
}

export async function estimateScriptsAction(projectId: string, angleId: string, raw: unknown): Promise<{ estCents?: number; scripts?: number; blocked?: string; creditLine?: string }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(angleId)) return { blocked: "That project or angle wasn't found." };
  const ready = readinessAngles(await getAiConfig());
  if (!ready.ok) return { blocked: `${ready.reason}${me.role === "admin" ? " Set it up on the AI connection page." : " Ask Ayaan."}` };
  const est = await estimateScripts(project, angleId, toRequest(raw), ready);
  if ("error" in est) return { blocked: est.error };
  const u = await usageFor(me.id, me.role);
  return { estCents: est.plan.estCents, scripts: est.plan.scripts, creditLine: u.unlimited ? "" : `You have ${aud(u.remainingCents ?? 0)} of credit left.` };
}

export async function startScriptsAction(projectId: string, angleId: string, confirmedCents: number, raw: unknown): Promise<{ error?: string; ok?: boolean }> {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(angleId)) return { error: "That project or angle wasn't found." };
  const cfg = await getAiConfig();
  const ready = readinessAngles(cfg);
  if (!ready.ok) return { error: ready.reason };
  const c = Math.round(Number(confirmedCents));
  if (!Number.isFinite(c) || c < 0 || c > 100_000) return { error: "Something looked wrong with that request. Reload the page and try again." };
  const res = await startScripts(me, project, angleId, toRequest(raw), cfg, ready, c);
  if (!res.ok) return { error: res.message };
  after(res.run);
  revalidatePath("/scripts");
  return { ok: true };
}

export async function scriptJobStatusAction(projectId: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project) return null;
  const { rows } = await query<{ id: string; status: string; done_steps: number; total_steps: number; message: string; error: string | null; spent_cents: string; secs: number }>(
    "select id, status, done_steps, total_steps, message, error, spent_cents, extract(epoch from (coalesce(finished_at, now()) - created_at))::int as secs from ai_jobs where project_id = $1 and kind = 'script' order by created_at desc limit 1",
    [project.id],
  );
  const j = rows[0];
  return j ? { id: j.id, status: j.status, done: j.done_steps, total: j.total_steps, message: j.message, error: j.error, spentCents: Math.round(Number(j.spent_cents)), seconds: j.secs } : null;
}

export async function deleteScriptAction(projectId: string, id: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(id)) return;
  await query("delete from scripts where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath("/scripts");
  revalidatePath(`/projects/${project.id}`);
}

export async function favouriteScriptAction(projectId: string, id: string) {
  const me = await requireUser();
  const project = await getProject(me, projectId);
  if (!project || !isId(id)) return;
  await query("update scripts set favourite = not favourite where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath("/scripts");
  revalidatePath(`/scripts/${id}`);
}

// ---------- One script: edit by hand, refine with a request ----------
import { getScript, getVersion, refineScript, saveVersion } from "@/lib/ai/scripts";
import { normaliseScript } from "@/lib/ai/script-shape";

async function mine(scriptId: string) {
  const me = await requireUser();
  if (!isId(scriptId)) return { me, script: null };
  const row = (await query<{ project_id: string }>("select project_id from scripts where id = $1", [scriptId])).rows[0];
  if (!row) return { me, script: null };
  const project = await getProject(me, row.project_id);
  if (!project) return { me, script: null };
  return { me, script: await getScript(project.id, scriptId) };
}

export async function saveScriptEditAction(scriptId: string, data: unknown): Promise<{ ok?: boolean; error?: string; version?: number }> {
  const { me, script } = await mine(scriptId);
  if (!script) return { error: "That script wasn't found." };
  const clean = normaliseScript(data);
  if (!clean) return { error: "A script needs at least one line." };
  const saved = await saveVersion(me.id, script.id, clean, "edit", "Edited by hand");
  revalidatePath(`/scripts/${script.id}`);
  return { ok: true, version: saved.version };
}

export async function refineScriptAction(scriptId: string, instruction: string, confirmed: boolean): Promise<{ ok?: boolean; error?: string; conflict?: string; version?: number }> {
  const { me, script } = await mine(scriptId);
  if (!script) return { error: "That script wasn't found." };
  const cfg = await getAiConfig();
  const ready = readinessAngles(cfg);
  if (!ready.ok) return { error: ready.reason };
  const cur = await getVersion(script.id, script.current_version);
  if (!cur) return { error: "That script wasn't found." };
  const r = await refineScript(me, script, cur.data, instruction, !!confirmed, cfg, ready);
  if (r.ok) {
    revalidatePath(`/scripts/${script.id}`);
    return { ok: true, version: r.version };
  }
  return "conflict" in r ? { conflict: r.conflict } : { error: r.error };
}

export async function restoreVersionAction(scriptId: string, versionNo: number): Promise<{ ok?: boolean; error?: string }> {
  const { me, script } = await mine(scriptId);
  if (!script) return { error: "That script wasn't found." };
  const v = await getVersion(script.id, Math.round(Number(versionNo)));
  if (!v) return { error: "That version wasn't found." };
  await saveVersion(me.id, script.id, v.data, "edit", `Restored version ${v.version_no}`);
  revalidatePath(`/scripts/${script.id}`);
  return { ok: true };
}
