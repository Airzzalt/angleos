// Pure helpers for the Mentor chat (no database), so they are easy to test.
import type { GenImage } from "./gemini";

export type Basis = "kb" | "general";

export const orQuery = (q: string) =>
  q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 14).join(" | ");

/** Pulls the "BASIS:" first line off the reply. The knowledge base label is only allowed when something was actually found. */
export function splitBasis(raw: string, hadExtracts: boolean, scrub: (s: string) => string = (s) => s): { text: string; basis: Basis } {
  const m = /^\s*BASIS:\s*(KB|GENERAL)\s*\n?/i.exec(raw);
  const said: Basis = m && m[1].toUpperCase() === "KB" ? "kb" : "general";
  const text = scrub(raw.replace(/^\s*BASIS:\s*(KB|GENERAL)\s*\n?/i, "").trim());
  return { text, basis: said === "kb" && hadExtracts ? "kb" : "general" };
}

const IMAGE_TYPES: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
};
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Checks a picked screenshot is really a PNG, JPG or WebP picture of a sensible size. */
export function checkImage(bytes: Uint8Array, claimedType: string): { ok: true; image: GenImage } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "That picture is empty." };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "That picture is too big (over 4 MB). Try a smaller screenshot." };
  const type = claimedType === "image/jpg" ? "image/jpeg" : claimedType;
  const test = IMAGE_TYPES[type];
  if (!test || !test(bytes)) return { ok: false, error: "Use a PNG, JPG or WebP screenshot." };
  return { ok: true, image: { mime: type, data: Buffer.from(bytes).toString("base64") } };
}

