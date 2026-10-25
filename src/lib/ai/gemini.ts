// The only file that talks to Google's Gemini API. Models are passed in (never hard-coded here).
// The key is read from GEMINI_API_KEY and sent in a header, so it can never end up in a URL, a log or a page.
import { isTestMode } from "./settings";

export type GenResult = { text: string; inputTokens: number; outputTokens: number };
export class AiError extends Error {
  constructor(message: string, public retryable = false) {
    super(message);
  }
}

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL_ID = /^[A-Za-z0-9._-]{1,80}$/;

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new AiError("The AI key has not been added yet.");
  return k;
}

async function call(path: string, init: RequestInit & { timeoutMs?: number }): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 90_000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal, headers: { "content-type": "application/json", "x-goog-api-key": key() } });
    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { error?: { message?: string } };
        detail = String(j.error?.message ?? "").slice(0, 200);
      } catch {}
      const retryable = res.status === 429 || res.status >= 500;
      if (res.status === 400 && /api key/i.test(detail)) throw new AiError("Google rejected the AI key. Check it was copied correctly.");
      if (res.status === 401 || res.status === 403) throw new AiError("Google refused the AI key (wrong key, or billing is not switched on).");
      throw new AiError(`The AI service returned an error (${res.status}).${detail ? " Google says: " + detail.replace(/AIza[0-9A-Za-z_-]+/g, "[key]") : ""}`, retryable);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new AiError("The AI took too long to answer.", true);
    throw new AiError("Could not reach the AI service.", true);
  } finally {
    clearTimeout(timer);
  }
}

export async function listModels(): Promise<string[]> {
  if (isTestMode()) return ["fake-reader", "fake-writer"];
  const out: string[] = [];
  let token = "";
  for (let i = 0; i < 5; i++) {
    const j = (await call(`/models?pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`, { method: "GET", timeoutMs: 20_000 })) as {
      models?: { name: string; supportedGenerationMethods?: string[] }[];
      nextPageToken?: string;
    };
    for (const m of j.models ?? []) if (m.supportedGenerationMethods?.includes("generateContent")) out.push(m.name.replace(/^models\//, ""));
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out.sort();
}

export type GenImage = { mime: string; data: string }; // data is base64
export type GenOpts = { model: string; system: string; prompt: string; maxOutputTokens: number; json?: boolean; images?: GenImage[] };

export async function generate(o: GenOpts): Promise<GenResult> {
  if (!MODEL_ID.test(o.model)) throw new AiError("That model name is not valid.");
  if (isTestMode() && o.model.startsWith("fake")) return fakeGenerate(o);
  let last: AiError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const j = (await call(`/models/${o.model}:generateContent`, {
        method: "POST",
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: o.system }] },
          contents: [{ role: "user", parts: [{ text: o.prompt }, ...(o.images ?? []).map((im) => ({ inlineData: { mimeType: im.mime, data: im.data } }))] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: o.maxOutputTokens, ...(o.json ? { responseMimeType: "application/json" } : {}) },
        }),
      })) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
      };
      const parts = j.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      const u = j.usageMetadata ?? {};
      // Thinking tokens are billed as output.
      const res = { text, inputTokens: u.promptTokenCount ?? 0, outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) };
      if (!text.trim()) throw new AiError("The AI returned an empty answer.", true);
      return res;
    } catch (e) {
      last = e instanceof AiError ? e : new AiError("The AI call failed.", true);
      if (!last.retryable) break;
      await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
    }
  }
  throw last ?? new AiError("The AI call failed.");
}

// ---- Test-only stand-in (only reachable when the database is the in-memory test one) ----
function fakeGenerate(o: GenOpts): GenResult {
  const inputTokens = Math.ceil((o.system.length + o.prompt.length) / 4);
  if (o.prompt.includes("FAKE-FAIL")) throw new AiError("fake failure");
  let text: string;
  if (o.system.includes("SCRIPT EDITOR")) {
    // Stand-in editor: removes the two things the checks look for, so the automatic fix path can be tested.
    text = o.prompt.replace(/^SCRIPT JSON:\n/, "").replace(/delve/gi, "dig").replace(/tapestry/gi, "mess").replace(/ — /g, ". ").replace(/—/g, ",");
  } else if (o.system.includes("ANGLE EDITOR")) {
    text = o.prompt;
  } else if (o.system.includes("MENTOR")) {
    const kb = o.prompt.includes("KNOWLEDGE BASE EXTRACTS:") && !o.prompt.includes("KNOWLEDGE BASE EXTRACTS:\n(none found)");
    text = `BASIS: ${kb ? "KB" : "GENERAL"}\n\n### Fake next steps\n\n* **First:** fake step one\n* **Second:** fake step two\n\nFake mentor answer${kb ? " from the knowledge base (CORE-04)" : " from general knowledge"}.${o.prompt.includes("IMAGE ATTACHED") ? " I read your screenshot." : ""}${o.prompt.includes("SOURCE: kalorip") ? " Kalorip mode." : ""}`;
  } else if (o.system.includes("PRODUCT LINE WRITER")) {
    text = "A ceramic mug for coffee lovers, bought by people who want their drink to stay warm.";
  } else if (o.system.includes("READER")) {
    const items = [...o.prompt.matchAll(/### FILE ([0-9a-f-]{36}) \((.*?)\)\n([\s\S]*?)(?=\n### FILE |$)/g)];
    // Test hook: a file containing FAKE-SKIP is left out of group answers (but answered when asked alone).
    const shown = items.length > 1 ? items.filter((m) => !m[3].includes("FAKE-SKIP")) : items;
    text = JSON.stringify(
      shown.map((m) => {
        const body = m[3];
        const category = /reddit|review|customer/i.test(m[2] + body) ? "context" : /script/i.test(m[2]) ? "scripts" : /angle/i.test(m[2]) ? "angles" : "context";
        return { id: m[1], category, title: m[2], summary: `Summary of ${m[2]}: ${body.slice(0, 120).replace(/\s+/g, " ")}`, key_quotes: [] };
      }),
    );
  } else {
    const names = [...o.prompt.matchAll(/^## (.+?) \[/gm)].map((m) => m[1]).slice(0, 3);
    const keys = ["offer", "avatars", "desires", "awareness", "sophistication", "mechanisms", "new_info", "proof", "objections", "quotes", "restrictions"];
    text = JSON.stringify({
      sections: keys.map((k) => ({ key: k, body: `Fake ${k} section <b>not html</b>`, sources: names })),
      context_score: 72,
      missing: ["Price and guarantee details", "Competitor list"],
    });
  }
  return { text, inputTokens, outputTokens: Math.ceil(text.length / 4) };
}
