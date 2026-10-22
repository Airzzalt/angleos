// The only file that talks to xAI (Grok). Models are passed in, never hard-coded here.
// The key is read from XAI_API_KEY and sent in a header, so it can never end up in a URL, a log or a page.
import { AiError, type GenOpts, type GenResult } from "./gemini";
import { isTestMode } from "./settings";

const BASE = "https://api.x.ai/v1";
const MODEL_ID = /^[A-Za-z0-9._-]{1,80}$/;

class HttpError extends AiError {
  constructor(message: string, retryable: boolean, public status: number) {
    super(message, retryable);
  }
}

function key(): string {
  const k = process.env.XAI_API_KEY;
  if (!k) throw new AiError("The xAI key has not been added yet.");
  return k;
}

async function call(path: string, init: RequestInit & { timeoutMs?: number }): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 540_000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal, headers: { "content-type": "application/json", authorization: `Bearer ${key()}` } });
    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { error?: { message?: string } | string; message?: string };
        detail = String(typeof j.error === "string" ? j.error : j.error?.message ?? j.message ?? "").slice(0, 240);
      } catch {}
      detail = detail.replace(/xai-[0-9A-Za-z_-]+/g, "[key]");
      if (res.status === 401 || res.status === 403) throw new HttpError("xAI refused the key (wrong key, or the account has no credit).", false, res.status);
      throw new HttpError(`The AI service returned an error (${res.status}).${detail ? " xAI says: " + detail : ""}`, res.status === 429 || res.status >= 500, res.status);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new AiError("The AI took too long to answer (over 9 minutes). Nothing was lost: run it again, or add fewer files.", false);
    throw new AiError("Could not reach the AI service.", true);
  } finally {
    clearTimeout(timer);
  }
}

export async function listXaiModels(): Promise<string[]> {
  if (isTestMode()) return ["fake-angles"];
  for (const path of ["/language-models", "/models"]) {
    try {
      const j = (await call(path, { method: "GET", timeoutMs: 20_000 })) as { models?: { id?: string }[]; data?: { id?: string }[] };
      const ids = [...(j.models ?? []), ...(j.data ?? [])].map((m) => String(m.id ?? "")).filter((id) => id && !/image|imagine|video|embed|vision-only/i.test(id));
      if (ids.length) return [...new Set(ids)].sort();
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) throw e;
    }
  }
  return [];
}

export async function generateXai(o: GenOpts): Promise<GenResult> {
  if (!MODEL_ID.test(o.model)) throw new AiError("That model name is not valid.");
  if (isTestMode() && o.model.startsWith("fake")) return fakeXai(o);
  // First try the modern field names; if xAI rejects the request shape, retry once in the plainest form.
  const variants = [
    { tokens: "max_completion_tokens", json: !!o.json, effort: true },
    { tokens: "max_tokens", json: false, effort: false },
  ];
  let last: AiError | null = null;
  for (let v = 0; v < variants.length; v++) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const j = (await call("/chat/completions", {
          method: "POST",
          body: JSON.stringify({
            model: o.model,
            messages: [
              { role: "system", content: o.system },
              { role: "user", content: o.prompt },
            ],
            [variants[v].tokens]: o.maxOutputTokens,
            ...(variants[v].json ? { response_format: { type: "json_object" } } : {}),
            // xAI thinks at "high" by default, which is slow and costly. "medium" is plenty for writing angles.
            ...(variants[v].effort ? { reasoning_effort: "medium" } : {}),
          }),
        })) as {
          choices?: { message?: { content?: string | null } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
        };
        const text = String(j.choices?.[0]?.message?.content ?? "");
        const u = j.usage ?? {};
        const p = u.prompt_tokens ?? 0;
        const c = (u.completion_tokens ?? 0) + (u.completion_tokens_details?.reasoning_tokens ?? 0);
        // Thinking tokens are billed as output; take the larger of the two ways of counting, to never under-count.
        const out = Math.max(c, (u.total_tokens ?? 0) - p);
        if (!text.trim()) throw new AiError("The AI returned an empty answer.", true);
        return { text, inputTokens: p, outputTokens: out };
      } catch (e) {
        last = e instanceof AiError ? e : new AiError("The AI call failed.", true);
        if (!last.retryable) break;
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
    // Only a rejected request shape (400/422) is worth trying in the plain form; everything else is final.
    const status = last instanceof HttpError ? last.status : 0;
    if (!(status === 400 || status === 422)) break;
  }
  throw last ?? new AiError("The AI call failed.");
}

// ---- Test-only stand-in (only reachable when the database is the in-memory test one) ----
function fakeXai(o: GenOpts): GenResult {
  const inputTokens = Math.ceil((o.system.length + o.prompt.length) / 4);
  if (o.prompt.includes("FAKE-FAIL")) throw new AiError("fake failure");
  const count = Math.max(1, Math.min(20, Number(/NUMBER OF ANGLES: (\d+)/.exec(o.prompt)?.[1] ?? 3)));
  const names = [...o.prompt.matchAll(/^## (.+?) \[/gm)].map((m) => m[1]).slice(0, 2);
  const rules = [...o.system.matchAll(/^\[([A-Z0-9_]+-\d+|[A-Z]+-\d+)\]/gm)].map((m) => m[1]).slice(0, 2);
  const deep = o.prompt.includes("SNIPER (deep dive)");
  const angles = Array.from({ length: deep ? 1 : count }, (_, i) => ({
    sub_avatar: `Fake sub-avatar ${(i % 3) + 1}`,
    desire: `Fake desire ${i + 1}`,
    angle: `Fake angle ${i + 1} <b>not html</b>`,
    awareness: "Problem aware",
    mechanism: "Fake mechanism",
    ladder: { surface: "Fake surface want", emotional: "Fake emotional want", identity: "Fake identity want" },
    inaction: "Fake cost of doing nothing",
    chain: { sign: "Fake sign", physical: "Fake physical effect", night: "Fake night effect", next_day: "Fake next day" },
    result: "Fake hopeful result",
    avoid: ["Fake do-not-claim note"],
    market_note: "Fake market note",
    hooks: deep ? Array.from({ length: 10 }, (_, k) => `Fake deep hook ${k + 1}`) : [`Fake hook A${i + 1}`, `Fake hook B${i + 1}`, `Fake hook C${i + 1}`],
    ...(deep ? { deep: { story: "Fake avatar story", belief_now: "Fake belief now", belief_needed: "Fake belief needed", belief_steps: ["Step one", "Step two"], objections: [{ objection: "Fake objection", answer: "Fake answer" }], proof_needed: ["Fake proof"], outline: { hook: "H", problem: "P", why: "W", product: "Pr", result: "R", offer: "O" } } } : {}),
    evidence: ["Fake evidence line"],
    test_type: "Net-new angle test",
    risks: ["Needs proof for any health claim"],
    why: "Chosen because the research repeats this pain.",
    sources: names,
    rules,
  }));
  const text = JSON.stringify({ coverage: [{ theme: "Fake theme one", files: 2, status: "covered", note: "Angle 1" }, { theme: "Fake theme two", files: 1, status: "skipped", note: "Not for this product" }], angles, missing: ["Competitor prices"], note: "Fake run" });
  return { text, inputTokens, outputTokens: Math.ceil(text.length / 4) };
}
