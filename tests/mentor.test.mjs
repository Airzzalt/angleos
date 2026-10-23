import test from "node:test";
import assert from "node:assert/strict";
import { scrubRuleRefs } from "../src/lib/ai/angles-shape.ts";
import { splitBasis, checkImage, orQuery } from "../src/lib/ai/chat-shape.ts";

test("the BASIS line is taken off the answer and decides the label", () => {
  const a = splitBasis("BASIS: KB\n\nScale slowly.", true);
  assert.equal(a.basis, "kb");
  assert.equal(a.text, "Scale slowly.");
  const b = splitBasis("BASIS: GENERAL\n\nTry it.", true);
  assert.equal(b.basis, "general");
});

test("the knowledge base label is only allowed when something was found", () => {
  assert.equal(splitBasis("BASIS: KB\n\nHello.", false).basis, "general");
  assert.equal(splitBasis("No basis line here.", true).basis, "general");
});

test("rule codes never reach the person", () => {
  const r = splitBasis("BASIS: KB\n\nUse a strong hook (CORE-04) first.", true, scrubRuleRefs);
  assert.ok(!r.text.includes("CORE-04"));
});

test("only real PNG, JPG and WebP pictures are accepted", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  assert.equal(checkImage(png, "image/png").ok, true);
  assert.equal(checkImage(png, "image/jpeg").ok, false);
  assert.equal(checkImage(new Uint8Array([1, 2, 3, 4]), "image/png").ok, false);
  assert.equal(checkImage(new Uint8Array(0), "image/png").ok, false);
  assert.equal(checkImage(new Uint8Array(5 * 1024 * 1024).fill(0xff), "image/jpeg").ok, false);
  assert.equal(checkImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpg").ok, true);
});

test("a question becomes an OR search without short words", () => {
  assert.equal(orQuery("Should I scale my ads now?"), "should | scale | ads | now");
});
