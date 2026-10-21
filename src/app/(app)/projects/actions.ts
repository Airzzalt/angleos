"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { MARKETS, getProject } from "@/lib/projects";
import { isLimited, recordFailure } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/uploads/limits";
import { ingestUpload, type IngestResult } from "@/lib/uploads/ingest";

export type FormState = { error?: string; ok?: boolean } | undefined;

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const clean = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

export async function createProjectAction(_p: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const name = clean(formData.get("name"), 120);
  const url = clean(formData.get("url"), 300);
  const niche = clean(formData.get("niche"), 80);
  const market = clean(formData.get("market"), 40);
  const description = clean(formData.get("description"), 2000);

  if (name.length < 2) return { error: "Give the product a name (at least 2 characters)." };
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    } catch {
      return { error: "The product link should start with https:// (or leave it empty)." };
    }
  }
  if (market && !(MARKETS as readonly string[]).includes(market)) return { error: "Pick a market from the list." };

  if (me.role !== "admin") {
    const n = await query<{ n: number }>("select count(*)::int as n from projects where owner_id = $1", [me.id]);
    if ((n.rows[0]?.n ?? 0) >= LIMITS.maxProjectsPerMember) {
      return { error: `You've reached the limit of ${LIMITS.maxProjectsPerMember} projects. Delete one you no longer need.` };
    }
  }
  const { rows } = await query<{ id: string }>(
    `insert into projects (owner_id, workspace_id, name, product_url, niche, market, description)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [me.id, me.workspaceId, name, url, niche, market, description],
  );
  revalidatePath("/projects");
  redirect(`/projects/${rows[0].id}?tab=files`);
}

/** One file (or one zip) per call; the browser sends several one after another. */
export async function uploadFileAction(formData: FormData): Promise<IngestResult> {
  const me = await requireUser();
  const fail = (message: string): IngestResult => ({ ok: false, message, added: 0, duplicates: 0, skipped: [] });
  const projectId = String(formData.get("projectId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("No file received.");
  const project = await getProject(me, projectId);
  if (!project) return fail("That project wasn't found.");
  if (file.size > LIMITS.maxUploadBytes) return fail(`${file.name}: too large (over ${LIMITS.maxUploadBytes / 1024 / 1024} MB)`);

  const max = me.role === "admin" ? LIMITS.uploadsPer15Min.admin : LIMITS.uploadsPer15Min.member;
  if (await isLimited("upload", [{ key: me.id, max }])) return fail("You're uploading too quickly. Wait a few minutes and try again.");
  await recordFailure("upload", [me.id]);

  try {
    const res = await ingestUpload(me, project.id, file.name, new Uint8Array(await file.arrayBuffer()));
    revalidatePath(`/projects/${project.id}`);
    return res;
  } catch (e) {
    console.error("upload failed", e);
    return fail(`${file.name}: something went wrong while saving it`);
  }
}

/** Several already-unpacked files per call. The browser opens zips itself, so the server never receives a big zip. */
export async function uploadBatchAction(formData: FormData): Promise<IngestResult> {
  const me = await requireUser();
  const fail = (message: string): IngestResult => ({ ok: false, message, added: 0, duplicates: 0, skipped: [] });
  const project = await getProject(me, String(formData.get("projectId") ?? ""));
  if (!project) return fail("That project wasn't found.");
  const files = formData.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return fail("No files received.");
  if (files.length > LIMITS.batchMaxFiles) return fail("Too many files in one go.");
  if (files.reduce((n, f) => n + f.size, 0) > LIMITS.batchMaxBytes) return fail("That batch is too big.");

  const max = me.role === "admin" ? LIMITS.uploadsPer15Min.admin : LIMITS.uploadsPer15Min.member;
  if (await isLimited("upload", [{ key: me.id, max }])) return fail("You're uploading too quickly. Wait a few minutes and try again.");
  await recordFailure("upload", [me.id]);

  const total: IngestResult = { ok: true, message: "", added: 0, duplicates: 0, skipped: [] };
  for (const f of files) {
    if (f.name.toLowerCase().endsWith(".zip")) {
      total.skipped.push({ name: f.name, reason: "zip inside a zip is not opened" });
      continue;
    }
    try {
      const r = await ingestUpload(me, project.id, f.name, new Uint8Array(await f.arrayBuffer()));
      total.added += r.added;
      total.duplicates += r.duplicates;
      total.skipped.push(...r.skipped);
      if (!r.ok && r.message && !r.skipped.length) total.skipped.push({ name: f.name, reason: r.message.replace(/^[^:]*:\s*/, "") });
    } catch (e) {
      console.error("batch upload failed", e);
      total.skipped.push({ name: f.name, reason: "something went wrong while saving it" });
    }
  }
  revalidatePath(`/projects/${project.id}`);
  return total;
}

export async function deleteFileAction(formData: FormData) {
  const me = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const id = String(formData.get("id") ?? "");
  const project = await getProject(me, projectId);
  if (!project || !isId(id)) return;
  await query("delete from project_files where id = $1 and project_id = $2", [id, project.id]);
  revalidatePath(`/projects/${project.id}`);
}

export async function saveContextAction(_p: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const project = await getProject(me, String(formData.get("projectId") ?? ""));
  if (!project) return { error: "That project wasn't found." };
  const body = String(formData.get("body") ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (body.length > 8000) return { error: "That's too long (8,000 characters at most). Put longer material in a file instead." };
  await query(
    `insert into project_context (project_id, owner_id, body) values ($1,$2,$3)
     on conflict (project_id) do update set body = excluded.body, updated_at = now()`,
    [project.id, me.id, body],
  );
  await query("update projects set updated_at = now() where id = $1", [project.id]);
  revalidatePath(`/projects/${project.id}`);
  return { ok: true };
}

export async function deleteProjectAction(formData: FormData) {
  const me = await requireUser();
  const project = await getProject(me, String(formData.get("projectId") ?? ""));
  // Only the person who made the project (or an admin) may delete it.
  if (!project || (project.owner_id !== me.id && me.role !== "admin")) return;
  await query("delete from projects where id = $1", [project.id]);
  revalidatePath("/projects");
  redirect("/projects");
}
