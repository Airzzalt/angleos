import test from "node:test";
import assert from "node:assert/strict";
import { parseRequest, normaliseScript, spokenText, LENGTHS } from "../src/lib/ai/script-shape.ts";

test("a request keeps only real formats, at most three, and a real length", () => {
  const r = parseRequest({ formats: ["ugc", "vsl", "bogus", "text-on-screen", "ai-voiceover"], length: "60", note: "hi\u0000there" });
  assert.deepEqual(r.formats, ["ugc", "vsl", "text-on-screen"]);
  assert.equal(r.length, "60");
  assert.equal(r.note, "hithere");
  assert.deepEqual(parseRequest({ formats: [], length: "9" }).formats, ["ugc"]);
  assert.equal(parseRequest({ length: "9" }).length, "45");
  assert.ok(LENGTHS.every((l) => l.words[0] < l.words[1]));
});

test("an AI script is cleaned: html gone, rule codes gone, empty lines dropped", () => {
  const d = normaliseScript({ hooks: ["<b>Hi</b> there (CORE-04)"], scenes: [{ say: "Line one [HOOK-02]", show: "x" }, { say: "", show: "nothing said" }], cta: "Tap the link", claims: [{ claim: "A claim", support: "" }, { claim: "" }] });
  assert.equal(d.hooks[0], "Hi there");
  assert.equal(d.scenes.length, 1);
  assert.equal(d.scenes[0].say, "Line one");
  assert.equal(d.claims.length, 1);
  assert.equal(normaliseScript({ scenes: [] }), null);
  assert.equal(normaliseScript("x"), null);
});

test("only the spoken words are read by the checks", () => {
  const d = normaliseScript({ scenes: [{ say: "One.", show: "very long visual text that is not spoken" }, { say: "Two.", show: "" }], cta: "Tap the link" });
  assert.equal(spokenText(d), "One.\nTwo.\nTap the link");
});
