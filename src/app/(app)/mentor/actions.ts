"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { askMentor, checkImage, type Basis, type MentorSource } from "@/lib/ai/chat";
import { clean } from "@/lib/ai/jobs";

export type SendResult =
  | { ok: true; threadId: string; assistant: { id: string; text: string; basis: Basis; sources: string[] } }
  | { ok: false; error: string };

/** One message in the Mentor page or the Ask AI panel. The picture (optional) is checked here, before anything else. */
export async function sendMentorAction(formData: FormData): Promise<SendResult> {
  const me = await requireUser();
  const src = String(formData.get("source") ?? "brand");
  const source: MentorSource = src === "kalorip" ? "kalorip" : src === "ask" ? "ask" : "brand";
  let image = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const checked = checkImage(new Uint8Array(await file.arrayBuffer()), file.type);
    if (!checked.ok) return { ok: false, error: checked.error };
    image = checked.image;
  }
  const r = await askMentor(me, {
    threadId: String(formData.get("threadId") ?? "") || null,
    source,
    projectId: String(formData.get("projectId") ?? "") || null,
    text: String(formData.get("text") ?? ""),
    image,
    screen: String(formData.get("screen") ?? ""),
  });
  if (r.ok && source !== "ask") revalidatePath("/mentor");
  return r;
}

export async function deleteThreadAction(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("threadId") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await query("delete from chat_threads where id = $1 and owner_id = $2", [id, me.id]);
  revalidatePath("/mentor");
}

/** Thumbs up (1) or down (-1), with an optional note. Only on things the person can actually see. */
export async function setFeedbackAction(kind: "chat" | "angle", targetId: string, rating: 1 | -1, note: string): Promise<{ ok: boolean; error?: string }> {
  const me = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(targetId) || (rating !== 1 && rating !== -1)) return { ok: false, error: "Could not save that." };
  if (kind === "chat") {
    const m = await query("select 1 from chat_messages where id = $1 and owner_id = $2 and role = 'assistant'", [targetId, me.id]);
    if (!m.rows[0]) return { ok: false, error: "Could not save that." };
  } else {
    const a = await query(
      `select 1 from project_angles a join projects p on p.id = a.project_id
        where a.id = $1 and (p.owner_id = $2 or ($3::uuid is not null and p.workspace_id = $3::uuid))`,
      [targetId, me.id, me.workspaceId],
    );
    if (!a.rows[0]) return { ok: false, error: "Could not save that." };
  }
  await query(
    `insert into feedback (owner_id, kind, target_id, rating, note) values ($1,$2,$3,$4,$5)
     on conflict (owner_id, kind, target_id) do update set rating = excluded.rating, note = excluded.note, updated_at = now()`,
    [me.id, kind, targetId, rating, clean(note, 600)],
  );
  return { ok: true };
}
