// The rule for how much AI each person may use. Pure logic (no database) so it is easy to test.
// Money is in Australian cents. Admins are always unlimited. Members default to A$10 in total, ever.

export const DEFAULT_LIMIT_CENTS = 1000;

export type LimitState = {
  unlimited: boolean;
  spentCents: number;
  limitCents: number | null;
  remainingCents: number | null;
  blocked: boolean;
  /** 0 to 100, for progress bars */
  percent: number;
};

export function limitState(role: string, spentCents: number, limitCents: number | null): LimitState {
  const spent = Math.max(0, Math.round(spentCents));
  if (role === "admin" || limitCents === null) {
    return { unlimited: true, spentCents: spent, limitCents: null, remainingCents: null, blocked: false, percent: 0 };
  }
  const remaining = Math.max(0, limitCents - spent);
  return {
    unlimited: false,
    spentCents: spent,
    limitCents,
    remainingCents: remaining,
    blocked: spent >= limitCents,
    percent: limitCents === 0 ? 100 : Math.min(100, Math.round((spent / limitCents) * 100)),
  };
}

export const aud = (cents: number) => `A$${(cents / 100).toFixed(2)}`;

/** Reads what a person typed ("10", "7.50", "unlimited") into cents, or null for unlimited. Returns undefined if invalid. */
export function parseLimitInput(text: string): number | null | undefined {
  const t = text.trim().toLowerCase().replace(/^a?\$/, "");
  if (t === "unlimited" || t === "none") return null;
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(t)) return undefined;
  const cents = Math.round(Number(t) * 100);
  return cents > 1_000_000 ? undefined : cents;
}
