// Pure rules for what an "angle" looks like once the AI has answered. No database, so it is easy to test.
// The AI's answer is treated as untrusted: every field is trimmed, length-limited, and checked against what we really gave it.

export const AWARENESS = ["Unaware", "Problem aware", "Solution aware", "Product aware", "Most aware"] as const;

export type Angle = {
  sub_avatar: string;
  desire: string;
  angle: string;
  awareness: string;
  mechanism: string;
  hooks: string[];
  evidence: string[];
  test_type: string;
  risks: string[];
  why: string;
  sources: string[];
  rules: string[];
  /** Three levels of wanting: what they want the product to do, how they want to feel, who they want to be. */
  ladder?: { surface: string; emotional: string; identity: string };
  /** What keeps happening if they do nothing, in their words. */
  inaction?: string;
  /** Only on a Sniper (deep dive) angle: the full brief. */
  deep?: DeepBrief;
};

export type DeepBrief = {
  story: string;
  belief_now: string;
  belief_needed: string;
  belief_steps: string[];
  objections: { objection: string; answer: string }[];
  proof_needed: string[];
  outline: { hook: string; problem: string; why: string; product: string; result: string; offer: string };
};

const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max);

export type CoverageItem = { theme: string; files: number; status: "covered" | "skipped"; note: string };

/** The "what themes are in the files" list the AI writes before the angles. Untrusted, so every part is cleaned. */
export function normaliseCoverage(raw: unknown, totalFiles: number): CoverageItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: CoverageItem[] = [];
  for (const it of arr as Record<string, unknown>[]) {
    if (!it || typeof it !== "object") continue;
    const theme = clean(it.theme, 120);
    if (!theme) continue;
    const n = Math.round(Number(it.files));
    const files = Number.isFinite(n) ? Math.max(0, Math.min(totalFiles || n, n)) : 0;
    const status = String(it.status ?? "").toLowerCase().startsWith("skip") ? "skipped" : "covered";
    out.push({ theme, files, status, note: clean(it.note, 200) });
    if (out.length >= 12) break;
  }
  return out.sort((a, b) => b.files - a.files);
}

function parseDeep(v: unknown): DeepBrief | undefined {
  if (!v || typeof v !== "object") return undefined;
  const d = v as Record<string, unknown>;
  const o = (d.outline && typeof d.outline === "object" ? d.outline : {}) as Record<string, unknown>;
  const objections = (Array.isArray(d.objections) ? d.objections : [])
    .map((x) => (x && typeof x === "object" ? { objection: clean((x as Record<string, unknown>).objection, 240), answer: clean((x as Record<string, unknown>).answer, 500) } : null))
    .filter((x): x is { objection: string; answer: string } => !!x && !!x.objection)
    .slice(0, 8);
  const brief: DeepBrief = {
    story: clean(d.story, 1800),
    belief_now: clean(d.belief_now, 500),
    belief_needed: clean(d.belief_needed, 500),
    belief_steps: list(d.belief_steps, 8, 300),
    objections,
    proof_needed: list(d.proof_needed, 8, 250),
    outline: { hook: clean(o.hook, 400), problem: clean(o.problem, 500), why: clean(o.why, 500), product: clean(o.product, 500), result: clean(o.result, 500), offer: clean(o.offer, 400) },
  };
  return brief.story || brief.objections.length || brief.outline.hook ? brief : undefined;
}

export function canonicalAwareness(v: unknown): string {
  const t = String(v ?? "").toLowerCase();
  if (t.includes("unaware")) return "Unaware";
  if (t.includes("problem")) return "Problem aware";
  if (t.includes("solution")) return "Solution aware";
  if (t.includes("product")) return "Product aware";
  if (t.includes("most")) return "Most aware";
  return "";
}

function list(v: unknown, max: number, len: number): string[] {
  const arr = Array.isArray(v) ? v : typeof v === "string" && v.trim() ? [v] : [];
  return arr
    .map((x) => (x && typeof x === "object" ? clean((x as { text?: unknown }).text, len) : clean(x, len)))
    .filter(Boolean)
    .slice(0, max);
}

export function normaliseAngles(raw: unknown, ctx: { files: Set<string>; rules: Set<string>; max: number; totalFiles?: number }): { angles: Angle[]; missing: string[]; note: string; coverage: CoverageItem[] } {
  const root = (raw && typeof raw === "object" ? raw : {}) as { angles?: unknown; missing?: unknown; note?: unknown; coverage?: unknown };
  const items = Array.isArray(root.angles) ? root.angles : Array.isArray(raw) ? (raw as unknown[]) : [];
  const seen = new Set<string>();
  const angles: Angle[] = [];
  for (const it of items as Record<string, unknown>[]) {
    if (!it || typeof it !== "object") continue;
    const angle = clean(it.angle, 400);
    if (!angle) continue;
    const key = angle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const deep = parseDeep(it.deep);
    const lad = (it.ladder && typeof it.ladder === "object" ? it.ladder : {}) as Record<string, unknown>;
    const ladder = { surface: clean(lad.surface, 300), emotional: clean(lad.emotional, 300), identity: clean(lad.identity, 300) };
    angles.push({
      sub_avatar: clean(it.sub_avatar, 160),
      desire: clean(it.desire, 300),
      angle,
      awareness: canonicalAwareness(it.awareness),
      mechanism: clean(it.mechanism, 400),
      hooks: list(it.hooks, deep ? 10 : 3, 300),
      evidence: list(it.evidence, 5, 300),
      test_type: clean(it.test_type, 160),
      risks: list(it.risks, 4, 250),
      why: clean(it.why, 600),
      sources: list(it.sources, 8, 200).filter((x) => ctx.files.has(x)),
      rules: list(it.rules, 8, 40).filter((x) => ctx.rules.has(x)),
      ...(ladder.surface || ladder.emotional || ladder.identity ? { ladder } : {}),
      ...(clean(it.inaction, 400) ? { inaction: clean(it.inaction, 400) } : {}),
      ...(deep ? { deep } : {}),
    });
    if (angles.length >= ctx.max) break;
  }
  return { angles, missing: list(root.missing, 8, 200), note: clean(root.note, 400), coverage: normaliseCoverage(root.coverage, ctx.totalFiles ?? 0) };
}

/** What the person typed when editing an angle: only the one-line angle and the hooks can change. */
export function applyEdit(a: Angle, patch: { angle?: unknown; hooks?: unknown }): Angle {
  const angle = clean(patch.angle, 400) || a.angle;
  const hooks = list(typeof patch.hooks === "string" ? patch.hooks.split("\n") : patch.hooks, a.deep ? 10 : 3, 300);
  return { ...a, angle, hooks: hooks.length ? hooks : a.hooks };
}
