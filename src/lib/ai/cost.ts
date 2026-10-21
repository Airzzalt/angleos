// Pure maths for AI cost and batching. No database, so it is easy to test.
// Prices are US dollars per million tokens, set by the admin. Money we store and show is Australian.

export type Price = { inUsd: number; outUsd: number };

export function costAud(inputTokens: number, outputTokens: number, price: Price, usdToAud: number): number {
  const usd = (Math.max(0, inputTokens) * price.inUsd + Math.max(0, outputTokens) * price.outUsd) / 1_000_000;
  return usd * usdToAud;
}

/** Deliberately pessimistic: 3 characters per token (real text is nearer 4). */
export const tokensForChars = (chars: number) => Math.ceil(Math.max(0, chars) / 3);

export type BatchFile = { id: string; chars: number };

/** Groups files into batches so many small files share one AI call. A big file goes alone. */
export function planBatches(files: BatchFile[], opts: { maxCharsPerFile: number; maxCharsPerBatch: number; maxFilesPerBatch: number }): { ids: string[]; chars: number }[] {
  const out: { ids: string[]; chars: number }[] = [];
  let cur: { ids: string[]; chars: number } = { ids: [], chars: 0 };
  for (const f of files) {
    const c = Math.min(f.chars, opts.maxCharsPerFile);
    if (cur.ids.length && (cur.chars + c > opts.maxCharsPerBatch || cur.ids.length >= opts.maxFilesPerBatch)) {
      out.push(cur);
      cur = { ids: [], chars: 0 };
    }
    cur.ids.push(f.id);
    cur.chars += c;
  }
  if (cur.ids.length) out.push(cur);
  return out;
}

export const CENTS = (aud: number) => Math.ceil(aud * 100);
