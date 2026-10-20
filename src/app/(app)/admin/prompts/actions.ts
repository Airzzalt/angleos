"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { findPlaceholders } from "@/lib/kb/prompt-blanks";
import type { SaveState } from "../knowledge-base/actions";

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Saving an edit never overwrites history: it adds a new version with a note on why. */
export async function savePromptAction(_p: SaveState, formData: FormData): Promise<SaveState> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").replace(/\r\n?/g, "\n").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  if (!isId(id)) return { error: "Unknown prompt." };
  if (body.length < 20) return { error: "A prompt can't be nearly empty." };
  if (!note) return { error: "Write one line on why you changed it (it's kept in the history)." };
  const cur = await query<{ body: string; version: number }>("select body, version from admin_prompts where id = $1", [id]);
  if (!cur.rows[0]) return { error: "Unknown prompt." };
  if (cur.rows[0].body === body) return { error: "Nothing changed." };
  const v = cur.rows[0].version + 1;
  await query("update admin_prompts set body=$2, placeholders=$3, version=$4, updated_at=now() where id=$1", [id, body, findPlaceholders(body), v]);
  await query("insert into admin_prompt_versions (owner_id, prompt_id, version_no, body, note) values ($1,$2,$3,$4,$5)", [me.id, id, v, body, note]);
  revalidatePath("/admin/prompts", "layout");
  return { ok: true };
}

export async function restorePromptAction(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isId(id)) return;
  const cur = await query<{ original_body: string; body: string; version: number }>(
    "select original_body, body, version from admin_prompts where id = $1",
    [id],
  );
  const p = cur.rows[0];
  if (!p || p.body === p.original_body) return;
  const v = p.version + 1;
  await query("update admin_prompts set body=original_body, placeholders=$2, version=$3, updated_at=now() where id=$1", [id, findPlaceholders(p.original_body), v]);
  await query("insert into admin_prompt_versions (owner_id, prompt_id, version_no, body, note) values ($1,$2,$3,$4,'Restored the original course text')", [me.id, id, v, p.original_body]);
  revalidatePath("/admin/prompts", "layout");
}
