// Pure checks for finished scripts (no database, no AI), so they are quick and easy to test.
// The spoken words only go in here (not the visual column).

export type Issue = { code: string; message: string; detail?: string };
export type CheckResult = { grade: number; words: number; sentences: number; issues: Issue[]; pass: boolean };

/** Safety-net list. The owner's editable list in admin settings is merged on top of this. */
export const DEFAULT_BANNED = [
  "delve", "delves", "tapestry", "landscape", "leverage", "leveraging", "testament", "beacon", "pivotal", "nestled",
  "vibrant", "revolutionise", "revolutionize", "game-changer", "game changer", "unlock", "elevate", "seamless", "seamlessly",
  "in today's fast-paced world", "it's worth noting", "it is worth noting", "look no further", "imagine a world where",
  "here is the ad copy", "here's the ad copy", "in conclusion", "at the end of the day", "dive into", "embark",
];

/** Splits the owner's banned-phrase text (one per line, or comma separated) into a clean list. */
export function parseBanned(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((s) => s.replace(/^[\s\-*•\d.)]+/, "").trim().toLowerCase())
    .filter((s) => s.length >= 3 && !s.startsWith("#"));
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z0-9]/i.test(s));
}

export function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+(?:['’][a-z]+)?/g) ?? [];
}

export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

/** Flesch-Kincaid grade level. Grade 6 means a 11 to 12 year old can read it easily. */
export function readingGrade(text: string): number {
  const sents = splitSentences(text);
  const words = wordsOf(text);
  if (!sents.length || !words.length) return 0;
  const syl = words.reduce((n, w) => n + countSyllables(w), 0);
  const g = 0.39 * (words.length / sents.length) + 11.8 * (syl / words.length) - 15.59;
  return Math.max(0, Math.round(g * 10) / 10);
}

export function findBanned(text: string, banned: string[]): string[] {
  const low = text.toLowerCase().replace(/[’]/g, "'");
  const hits: string[] = [];
  for (const b of banned) {
    const esc = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`, "i").test(low)) hits.push(b);
  }
  return hits;
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{2B50}\u{2B06}\u{FE0F}]/u;
export const hasEmoji = (t: string) => EMOJI.test(t);
export const countEmDashes = (t: string) => (t.match(/[—–]/g) ?? []).length;

/** Finds "a, b, and c" lists of exactly three items (the rule of three) and "Fast. Simple. Done." runs. */
export function findTriplets(text: string): string[] {
  const out: string[] = [];
  for (const s of splitSentences(text)) {
    const m = /(?<!, )\b([\w'’-]+(?: [\w'’-]+){0,2}), ([\w'’-]+(?: [\w'’-]+){0,2}),? (?:and|or) ([\w'’-]+(?: [\w'’-]+){0,2})\b/i.exec(s);
    if (m) out.push(m[0]);
  }
  const runs = text.match(/(?:^|[.!?]\s+)([A-Za-z']{2,12}\.)\s+([A-Za-z']{2,12}\.)\s+([A-Za-z']{2,12}\.)/g);
  if (runs) out.push(...runs.map((r) => r.trim()));
  return out;
}

/** Very even sentence lengths read like a robot. Real speech mixes short and long. */
export function rhythmCv(text: string): number {
  const lens = splitSentences(text).map((s) => wordsOf(s).length);
  if (lens.length < 5) return 1;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  return Math.sqrt(variance) / (mean || 1);
}

/** Numbers in the script that do not appear in the facts given. Catches invented stats. */
export function unsupportedNumbers(text: string, facts: string): string[] {
  const norm = (s: string) => s.replace(/[,\s]/g, "").toLowerCase();
  const known = norm(facts);
  const found = text.match(/\$?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  const bad: string[] = [];
  for (const f of found) {
    const n = norm(f);
    if (!n.replace(/\D/g, "")) continue;
    if (/^\d$/.test(n)) continue; // a lone small digit like "1" or "3" is normal speech
    if (!known.includes(n) && !known.includes(n.replace(/^\$/, "").replace(/%$/, ""))) bad.push(f);
  }
  return [...new Set(bad)];
}

const CTA = /\b(tap|click|shop|get|grab|order|try|learn|visit|buy|start|claim|join|swipe|see|check|go to|link)\b/i;
export const hasCta = (t: string) => CTA.test(t.split(/\n/).slice(-4).join(" "));

export type CheckOpts = {
  banned?: string[];
  facts?: string;
  /** Highest reading grade allowed. Default 6.4 so a "grade 6" script is not failed by a tenth of a point. */
  maxGrade?: number;
  needCta?: boolean;
};

export function runChecks(text: string, o: CheckOpts = {}): CheckResult {
  const issues: Issue[] = [];
  const maxGrade = o.maxGrade ?? 6.4;
  const words = wordsOf(text).length;
  const sentences = splitSentences(text).length;
  const grade = readingGrade(text);
  if (grade > maxGrade) issues.push({ code: "grade", message: `Reading level is grade ${grade}. It must be grade 6 or lower. Use shorter words and shorter sentences.` });
  const banned = findBanned(text, [...new Set([...DEFAULT_BANNED, ...(o.banned ?? [])])]);
  if (banned.length) issues.push({ code: "banned", message: "Uses banned words or phrases. Replace them with plain speech.", detail: banned.join(", ") });
  if (hasEmoji(text)) issues.push({ code: "emoji", message: "Contains an emoji. Remove it." });
  if (countEmDashes(text) > 0) issues.push({ code: "dash", message: "Contains a dash used as a pause. Use a full stop or a comma." });
  const trip = findTriplets(text);
  if (trip.length) issues.push({ code: "triplet", message: "Uses a list of exactly three. Use two or four items instead.", detail: trip.slice(0, 3).join(" | ") });
  if (sentences >= 5 && rhythmCv(text) < 0.35) issues.push({ code: "rhythm", message: "Every sentence is about the same length. Mix very short lines with longer ones." });
  if (o.facts !== undefined) {
    const nums = unsupportedNumbers(text, o.facts);
    if (nums.length) issues.push({ code: "numbers", message: "Has numbers that are not in the product facts. Remove them or say it without a number.", detail: nums.join(", ") });
  }
  if (o.needCta && !hasCta(text)) issues.push({ code: "cta", message: "No clear call to action at the end." });
  return { grade, words, sentences, issues, pass: issues.length === 0 };
}

/** Turns issues into one short instruction block for an automatic rewrite. */
export function issuesToFix(issues: Issue[]): string {
  return issues.map((i, n) => `${n + 1}. ${i.message}${i.detail ? ` (${i.detail})` : ""}`).join("\n");
}
