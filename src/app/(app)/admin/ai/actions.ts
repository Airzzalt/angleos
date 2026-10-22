"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isLimited, recordFailure } from "@/lib/rate-limit";
import { DEFAULTS, SETTING_KEYS, getAiConfig, readiness, readinessAngles, setAiSetting, type SettingKey } from "@/lib/ai/settings";
import { generateWith } from "@/lib/ai/provider";
import { AiError, generate } from "@/lib/ai/gemini";
import { recordUsage } from "@/lib/ai/guard";
import { costAud } from "@/lib/ai/cost";

export type AiFormState = { error?: string; ok?: boolean; message?: string } | undefined;

const MODEL = /^[A-Za-z0-9._-]{1,80}$/;
const NUMERIC: SettingKey[] = ["reader_in_usd", "reader_out_usd", "writer_in_usd", "writer_out_usd", "angle_in_usd", "angle_out_usd", "usd_aud", "daily_cap_aud", "job_cap_aud", "jobs_per_15min_member", "jobs_per_15min_admin", "max_running_jobs"];

export async function saveAiSettingsAction(_p: AiFormState, formData: FormData): Promise<AiFormState> {
  await requireAdmin();
  const next: Partial<Record<SettingKey, string>> = {};
  for (const k of SETTING_KEYS) {
    if (!formData.has(k)) continue;
    const v = String(formData.get(k) ?? "").trim();
    if (k === "ai_enabled" || k === "gemini_enabled" || k === "xai_enabled") next[k] = formData.getAll(k).includes("1") ? "1" : "0";
    else if (k === "angle_provider") {
      if (v !== "xai" && v !== "gemini") return { error: "Pick Gemini or xAI for the angle writer." };
      next[k] = v;
    } else if (k === "reader_model" || k === "writer_model" || k === "angle_model") {
      if (v && !MODEL.test(v)) return { error: `That doesn't look like a model name (${k.replace("_", " ")}).` };
      next[k] = v;
    } else if (NUMERIC.includes(k)) {
      if (v === "" && k.includes("_usd") && k !== "usd_aud") next[k] = "";
      else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 100_000) return { error: `${k.replace(/_/g, " ")} must be a number.` };
        if ((k === "usd_aud" || k === "daily_cap_aud" || k === "job_cap_aud" || k === "max_running_jobs") && n === 0) return { error: `${k.replace(/_/g, " ")} can't be zero.` };
        next[k] = String(n);
      }
    }
  }
  for (const [k, v] of Object.entries(next)) await setAiSetting(k as SettingKey, v ?? DEFAULTS[k as SettingKey]);
  revalidatePath("/admin/ai");
  return { ok: true, message: "Saved." };
}

export async function testConnectionAction(_p: AiFormState, formData?: FormData): Promise<AiFormState> {
  const me = await requireAdmin();
  const which = formData && String(formData.get("provider") ?? "") === "xai" ? "xai" : "gemini";
  if (await isLimited("aitest", [{ key: me.id, max: 10 }])) return { error: "Too many tests. Wait a few minutes." };
  await recordFailure("aitest", [me.id]);
  const cfg = await getAiConfig();
  try {
    if (which === "xai") {
      const ready = readinessAngles(cfg);
      if (!ready.ok) return { error: ready.reason };
      if (ready.angle.provider !== "xai") return { error: "The angle writer is set to Gemini right now. Set it to xAI under Task routing to test xAI." };
      const res = await generateWith("xai", { model: ready.angle.model, system: "Reply with the single word OK.", prompt: "Test", maxOutputTokens: 1024 });
      const cost = costAud(res.inputTokens, res.outputTokens, ready.angle, ready.usdAud);
      await recordUsage({ userId: me.id, workspaceId: me.workspaceId, jobId: null, task: "connection-test", provider: "xai", model: ready.angle.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costAud: cost });
      return { ok: true, message: `Connected. The angle model answered. That test cost about A$${cost.toFixed(4)}.` };
    }
    const ready = readiness(cfg);
    if (!ready.ok) return { error: ready.reason };
    const res = await generate({ model: ready.reader.model, system: "Reply with the single word OK.", prompt: "Test", maxOutputTokens: 64 });
    const cost = costAud(res.inputTokens, res.outputTokens, ready.reader, ready.usdAud);
    await recordUsage({ userId: me.id, workspaceId: me.workspaceId, jobId: null, task: "connection-test", provider: "gemini", model: ready.reader.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costAud: cost });
    return { ok: true, message: `Connected. The reader model answered. That test cost about A$${cost.toFixed(4)}.` };
  } catch (e) {
    return { error: e instanceof AiError ? e.message : "The test failed." };
  }
}
