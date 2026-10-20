// Invite codes look like ANGL-K7QM-2XRD-9TNF. Letters/numbers that are easy to mix up
// (0, O, 1, I) are left out so a code is easy to read out or type.
import { createHash, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `ANGL-${part()}-${part()}-${part()}`;
}

/** Ignores case, spaces and dashes, so "angl k7qm 2xrd 9tnf" still works. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashInviteCode(input: string): string {
  return createHash("sha256").update(normalizeInviteCode(input)).digest("hex");
}

/** Last four characters, so the admin can tell codes apart without seeing the code again. */
export function inviteHint(code: string): string {
  return code.slice(-4);
}
