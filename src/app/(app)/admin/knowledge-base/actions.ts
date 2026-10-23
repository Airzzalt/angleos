"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  MAX_FILE_BYTES,
  ensureCollection,
  importLessonFile,
  importPlaybookFile,
  importPromptFile,
  type ImportResult,
} from "@/lib/kb/store";

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** One file per call; the browser sends them one after another so a big folder never hits a size limit. */
export async function importFileAction(formData: FormData): Promise<ImportResult> {
  const me = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "No file received." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, message: `${file.name}: too big (over 2 MB)` };
  const kind = String(formData.get("kind") ?? "");
  try {
    const text = await file.text();
    let res: ImportResult;
    if (kind === "playbook") res = await importPlaybookFile(me.id, file.name, text);
    else if (kind === "prompts") res = await importPromptFile(me.id, file.name, text);
    else if (kind === "lessons") {
      const name = String(formData.get("collection") ?? "").trim().slice(0, 80);
      const tier = Math.min(3, Math.max(1, Number(formData.get("tier")) || 2));
      if (!name) return { ok: false, message: "Type a collection name first (for example the course name)." };
      res = await importLessonFile(me.id, await ensureCollection(me.id, name, tier, String(formData.get("mentor") ?? "") === "kalorip" ? "kalorip" : "brand"), file.name, text);
    } else return { ok: false, message: "Unknown import type." };
    revalidatePath("/admin/knowledge-base", "layout");
    revalidatePath("/admin/prompts", "layout");
    return res;
  } catch (e) {
    console.error("import failed", e);
    return { ok: false, message: `${file.name}: something went wrong while saving it` };
  }
}

/** Which mentor a whole collection feeds: Brand or Kalorip. */
export async function setCollectionMentorAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").slice(0, 80);
  const mentor = String(formData.get("mentor") ?? "") === "kalorip" ? "kalorip" : "brand";
  await query("update kb_collections set mentor = $2 where name = $1", [name, mentor]);
  revalidatePath("/admin/knowledge-base");
}

export async function setRuleStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "off" ? "off" : "active";
  if (!isId(id)) return;
  await query("update playbook_rules set status = $2, updated_at = now() where id = $1", [id, status]);
  revalidatePath("/admin/knowledge-base", "layout");
}

export async function setModuleActiveAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return;
  await query("update playbook_modules set active = $2, updated_at = now() where id = $1", [id, formData.get("active") === "true"]);
  revalidatePath("/admin/knowledge-base", "layout");
}

export type SaveState = { ok?: boolean; error?: string } | undefined;

export async function saveRuleAction(_p: SaveState, formData: FormData): Promise<SaveState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").replace(/\r\n?/g, "\n").trim();
  if (!isId(id)) return { error: "Unknown rule." };
  if (body.length < 10) return { error: "A rule can't be empty." };
  if (body.length > 20000) return { error: "That's too long for one rule." };
  await query("update playbook_rules set body_md = $2, version = version + 1, updated_at = now() where id = $1", [id, body]);
  revalidatePath("/admin/knowledge-base", "layout");
  return { ok: true };
}

export async function resetRuleAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return;
  await query("update playbook_rules set body_md = original_body_md, version = version + 1, updated_at = now() where id = $1", [id]);
  revalidatePath("/admin/knowledge-base", "layout");
}

export async function deleteLessonAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return;
  await query("delete from kb_documents where id = $1", [id]);
  revalidatePath("/admin/knowledge-base", "layout");
}

/** Removes a whole module and all of its rules (for example a file added by mistake). */
export async function deleteModuleAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return;
  await query("delete from playbook_modules where id = $1", [id]);
  revalidatePath("/admin/knowledge-base", "layout");
  redirect("/admin/knowledge-base");
}
