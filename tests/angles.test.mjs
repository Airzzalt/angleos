import test from "node:test";
import assert from "node:assert/strict";
import { normaliseAngles, normaliseCoverage, canonicalAwareness, applyEdit } from "../src/lib/ai/angles-shape.ts";

const ctx = { files: new Set(["reddit.txt", "reviews.md"]), rules: new Set(["ANGLE-01", "HOOK-04"]), max: 3 };

test("angles are cleaned, limited and checked against what we really gave the AI", () => {
  const raw = {
    angles: [
      { angle: "  Sleep without the 3am wake-ups  ", sub_avatar: "Night-shift nurse", awareness: "problem-aware", hooks: ["a", "b", "c", "d"], sources: ["reddit.txt", "made-up.txt"], rules: ["ANGLE-01", "FAKE-99"], evidence: "one line" },
      { angle: "sleep without the 3am wake-ups" }, // same angle again
      { sub_avatar: "no angle line" }, // unusable
      "not an object",
      { angle: "Second", hooks: [{ text: "from object" }] },
    ],
    missing: ["Price", "", "Guarantee"],
    note: "ok",
  };
  const out = normaliseAngles(raw, ctx);
  assert.equal(out.angles.length, 2);
  assert.equal(out.angles[0].angle, "Sleep without the 3am wake-ups");
  assert.equal(out.angles[0].awareness, "Problem aware");
  assert.deepEqual(out.angles[0].hooks, ["a", "b", "c"]);
  assert.deepEqual(out.angles[0].sources, ["reddit.txt"]);
  assert.deepEqual(out.angles[0].rules, ["ANGLE-01"]);
  assert.deepEqual(out.angles[0].evidence, ["one line"]);
  assert.deepEqual(out.angles[1].hooks, ["from object"]);
  assert.deepEqual(out.missing, ["Price", "Guarantee"]);
});

test("a bare array, junk or nothing never crashes", () => {
  assert.equal(normaliseAngles([{ angle: "x" }], ctx).angles.length, 1);
  assert.equal(normaliseAngles(null, ctx).angles.length, 0);
  assert.equal(normaliseAngles("text", ctx).angles.length, 0);
  assert.equal(normaliseAngles({ angles: Array.from({ length: 10 }, (_, i) => ({ angle: `a${i}` })) }, ctx).angles.length, 3);
});

test("awareness levels map to the five standard names", () => {
  assert.equal(canonicalAwareness("Unaware"), "Unaware");
  assert.equal(canonicalAwareness("solution aware"), "Solution aware");
  assert.equal(canonicalAwareness("Product-aware"), "Product aware");
  assert.equal(canonicalAwareness("most aware"), "Most aware");
  assert.equal(canonicalAwareness("banana"), "");
});

test("editing changes only the angle line and hooks", () => {
  const a = normaliseAngles({ angles: [{ angle: "Old", desire: "keep me", hooks: ["h1"] }] }, ctx).angles[0];
  const b = applyEdit(a, { angle: "New line", hooks: "x\ny\n\nz\nw" });
  assert.equal(b.angle, "New line");
  assert.deepEqual(b.hooks, ["x", "y", "z"]);
  assert.equal(b.desire, "keep me");
  assert.equal(applyEdit(a, { angle: "", hooks: "" }).angle, "Old");
});

test("coverage themes are cleaned, capped at the file count and sorted by how common they are", () => {
  const c = normaliseCoverage([
    { theme: " Surgery ", files: 5, status: "covered", note: "Angle 2" },
    { theme: "Adults with neck pain", files: 99, status: "Skipped - wrong buyer" },
    { theme: "", files: 3 },
    "junk",
  ], 30);
  assert.equal(c.length, 2);
  assert.equal(c[0].theme, "Adults with neck pain");
  assert.equal(c[0].files, 30);
  assert.equal(c[0].status, "skipped");
  assert.equal(c[1].theme, "Surgery");
  assert.deepEqual(normaliseCoverage("nope", 10), []);
});

test("desire ladder, cost of inaction and a sniper brief are kept and cleaned", () => {
  const raw = { angles: [{
    angle: "Be the parent who did something", ladder: { surface: "a pillow", emotional: "stop checking at 2am", identity: "the parent who acted" },
    inaction: "Another night of waking up", hooks: Array.from({ length: 12 }, (_, i) => `hook ${i}`),
    deep: { story: "A mum at 2am", belief_now: "x", belief_needed: "y", belief_steps: ["a", "b"], objections: [{ objection: "price", answer: "worth it" }, { objection: "", answer: "z" }], proof_needed: ["p"], outline: { hook: "h", problem: "p", why: "w", product: "pr", result: "r", offer: "o" } },
  }] };
  const a = normaliseAngles(raw, { files: new Set(), rules: new Set(), max: 3 }).angles[0];
  assert.equal(a.ladder.emotional, "stop checking at 2am");
  assert.equal(a.inaction, "Another night of waking up");
  assert.equal(a.hooks.length, 10);
  assert.equal(a.deep.objections.length, 1);
  assert.equal(a.deep.outline.offer, "o");
  const plain = normaliseAngles({ angles: [{ angle: "x", hooks: ["1", "2", "3", "4"] }] }, { files: new Set(), rules: new Set(), max: 3 }).angles[0];
  assert.equal(plain.hooks.length, 3);
  assert.equal(plain.deep, undefined);
});

test("the stakes chain, result, claims to avoid and market note are kept apart and cleaned", () => {
  const a = normaliseAngles({ angles: [{
    angle: "x", chain: { sign: "head slides off", physical: "neck bent", night: "sleep breaks", next_day: "cranky kid" },
    result: "Breakfast stops being a battle", avoid: ["Do not say it helps breathing", "", "Do not promise results"], market_note: "Competitors use scare ads",
  }] }, { files: new Set(), rules: new Set(), max: 3 }).angles[0];
  assert.equal(a.chain.next_day, "cranky kid");
  assert.equal(a.result, "Breakfast stops being a battle");
  assert.deepEqual(a.avoid, ["Do not say it helps breathing", "Do not promise results"]);
  assert.equal(a.market_note, "Competitors use scare ads");
  const none = normaliseAngles({ angles: [{ angle: "y" }] }, { files: new Set(), rules: new Set(), max: 3 }).angles[0];
  assert.equal(none.chain, undefined);
  assert.equal(none.avoid, undefined);
});
