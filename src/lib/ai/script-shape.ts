// Pure shape rules for a finished script. The AI's answer is untrusted: every field is trimmed, limited and cleaned here.
// No relative imports here, so plain node tests can load this file.
const RULE_REF = /\s*[\[(]?\b(?:CORE|RES|ANGLE|MECH|AWARE|BELIEF|HOOK|FORMAT|SCRIPT|EMO|VISUAL|STATIC|OFFER|TEST|BRIEF|ETHICS|ANALYZE|BREAKDOWNS|AIWORK|RMBC|MISC|BA)-\d{1,3}\b[\])]?/g;
export const scrubRuleRefs = (x: string) => x.replace(RULE_REF, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();

export type Scene = { say: string; show: string };
export type Claim = { claim: string; support: string };
export type ScriptData = { hooks: string[]; scenes: Scene[]; cta: string; claims: Claim[]; note: string };

export const FORMATS = [
  { id: "ugc", label: "UGC", help: "A real person talking to camera." },
  { id: "text-on-screen", label: "Text on screen", help: "Short lines of text over footage, no voice." },
  { id: "ai-voiceover", label: "AI voiceover", help: "A voice over b-roll and simple visuals." },
  { id: "vsl", label: "VSL", help: "A longer video sales letter." },
] as const;
export type FormatId = (typeof FORMATS)[number]["id"];

export const LENGTHS = [
  { id: "30", label: "30 seconds", words: [60, 85] },
  { id: "45", label: "45 seconds", words: [95, 125] },
  { id: "60", label: "60 seconds", words: [130, 165] },
  { id: "vsl", label: "VSL (about 3 minutes)", words: [400, 520] },
] as const;
export type LengthId = (typeof LENGTHS)[number]["id"];

export const MAX_FORMATS = 3;

export function parseRequest(raw: { formats?: unknown; length?: unknown; note?: unknown }): { formats: FormatId[]; length: LengthId; note: string } {
  const ids = FORMATS.map((f) => f.id as string);
  const formats = [...new Set((Array.isArray(raw.formats) ? raw.formats : [raw.formats]).map(String).filter((f) => ids.includes(f)))].slice(0, MAX_FORMATS) as FormatId[];
  const length = (LENGTHS.find((l) => l.id === String(raw.length))?.id ?? "45") as LengthId;
  return { formats: formats.length ? formats : ["ugc"], length: formats.includes("vsl") && length !== "vsl" ? length : length, note: String(raw.note ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 600) };
}

const s = (v: unknown, max: number) => scrubRuleRefs(String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max));

/** Cleans the AI's script JSON. Returns null when there is nothing usable to say. */
export function normaliseScript(raw: unknown): ScriptData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const scenes = (Array.isArray(o.scenes) ? o.scenes : [])
    .map((x) => ({ say: s((x as Record<string, unknown>)?.say, 700), show: s((x as Record<string, unknown>)?.show, 400) }))
    .filter((x) => x.say)
    .slice(0, 60);
  if (!scenes.length) return null;
  const hooks = (Array.isArray(o.hooks) ? o.hooks : []).map((h) => s(h, 220)).filter(Boolean).slice(0, 5);
  const claims = (Array.isArray(o.claims) ? o.claims : [])
    .map((c) => ({ claim: s((c as Record<string, unknown>)?.claim, 240), support: s((c as Record<string, unknown>)?.support, 240) }))
    .filter((c) => c.claim)
    .slice(0, 12);
  return { hooks, scenes, cta: s(o.cta, 220), claims, note: s(o.note, 400) };
}

/** Only the words that are spoken or shown as text. This is what the readability checks read. */
export function spokenText(d: ScriptData): string {
  return d.scenes.map((x) => x.say).join("\n") + (d.cta && !d.scenes.some((x) => x.say.includes(d.cta)) ? `\n${d.cta}` : "");
}
