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
