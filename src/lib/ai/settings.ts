// AI settings the admin controls on /admin/ai. Model names and prices live here, never in code.
import { query } from "../db";

export const SETTING_KEYS = [
  "ai_enabled", // "1" or "0": a kill switch for every AI feature
  "reader_model", // reads and sorts files (cheap and fast)
  "writer_model", // writes the brief
  "reader_in_usd", "reader_out_usd", // US$ per million tokens
  "writer_in_usd", "writer_out_usd",
  "usd_aud", // exchange rate
  "daily_cap_aud", // most the whole app may spend per rolling 24 hours, everyone included
  "job_cap_aud", // most one run may spend
  "jobs_per_15min_member",
  "jobs_per_15min_admin",
  "max_running_jobs", // across the whole app
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const DEFAULTS: Record<SettingKey, string> = {
  ai_enabled: "1",
  reader_model: "",
  writer_model: "",
  reader_in_usd: "",
  reader_out_usd: "",
  writer_in_usd: "",
  writer_out_usd: "",
  usd_aud: "1.55",
  daily_cap_aud: "20",
  job_cap_aud: "3",
  jobs_per_15min_member: "3",
  jobs_per_15min_admin: "12",
  max_running_jobs: "2",
};

export type AiConfig = Record<SettingKey, string>;

export async function getAiConfig(): Promise<AiConfig> {
  const { rows } = await query<{ key: string; value: string }>("select key, value from ai_settings");
  const cfg: AiConfig = { ...DEFAULTS };
  for (const r of rows) if ((SETTING_KEYS as readonly string[]).includes(r.key)) cfg[r.key as SettingKey] = r.value;
  return cfg;
}

export async function setAiSetting(key: SettingKey, value: string) {
  await query(
    `insert into ai_settings (key, value) values ($1,$2)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, value],
  );
}

const num = (s: string, d = 0) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

export type Ready =
  | { ok: true; cfg: AiConfig; reader: { model: string; inUsd: number; outUsd: number }; writer: { model: string; inUsd: number; outUsd: number }; usdAud: number; dailyCapAud: number; jobCapAud: number }
  | { ok: false; reason: string };

/** Everything needed before any AI call: switched on, key present, models and prices set. */
export function readiness(cfg: AiConfig): Ready {
  if (cfg.ai_enabled !== "1") return { ok: false, reason: "AI is switched off by the admin." };
  if (!process.env.GEMINI_API_KEY && !isTestMode()) return { ok: false, reason: "The AI key has not been added yet." };
  if (!cfg.reader_model || !cfg.writer_model) return { ok: false, reason: "The admin has not chosen the AI models yet." };
  const reader = { model: cfg.reader_model, inUsd: num(cfg.reader_in_usd, NaN), outUsd: num(cfg.reader_out_usd, NaN) };
  const writer = { model: cfg.writer_model, inUsd: num(cfg.writer_in_usd, NaN), outUsd: num(cfg.writer_out_usd, NaN) };
  if ([reader.inUsd, reader.outUsd, writer.inUsd, writer.outUsd].some((n) => !Number.isFinite(n))) {
    return { ok: false, reason: "The admin has not entered the model prices yet." };
  }
  return { ok: true, cfg, reader, writer, usdAud: num(cfg.usd_aud, 1.55) || 1.55, dailyCapAud: num(cfg.daily_cap_aud, 20), jobCapAud: num(cfg.job_cap_aud, 3) };
}

/** Test servers use an in-memory database and a fake AI. A real server never does. */
export function isTestMode() {
  return (process.env.DATABASE_URL ?? "").startsWith("pglite:");
}

export const numSetting = num;
