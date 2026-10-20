import test from "node:test";
import assert from "node:assert/strict";
import { parsePlaybook } from "../src/lib/kb/parse-playbook.ts";
import { chunkText, cleanTranscript, detectGlitches, titleFromFileName } from "../src/lib/kb/clean-lesson.ts";
import { findPlaceholders, promptKeyFromFile } from "../src/lib/kb/prompt-blanks.ts";

const SAMPLE = `# 99 TEST: Sample module
**Used by:** Script Writer; Analyze Ad

## How the AI must use this module
Use it.

## Rules
### Group heading

### TEST-01 First rule
- **Rule:** Do the thing. [INFERRED]
- **Why:** Because.

### TEST-02 Second rule
- **Rule:** Do the other thing. [CHECK NUMBER]

## Appendix
Not part of a rule.
`;

test("playbook parser finds rules, flags and the used-by line", () => {
  const m = parsePlaybook("99_TEST.md", SAMPLE);
  assert.equal(m.code, "99_TEST");
  assert.equal(m.kind, "rules");
  assert.equal(m.usedBy, "Script Writer; Analyze Ad");
  assert.deepEqual(m.rules.map((r) => r.code), ["TEST-01", "TEST-02"]);
  assert.deepEqual(m.rules[0].flags, ["INFERRED"]);
  assert.deepEqual(m.rules[1].flags, ["CHECK NUMBER"]);
  assert.ok(!m.rules[1].body.includes("Not part of a rule"));
  assert.ok(m.intro.includes("How the AI must use"));
});

test("a file without numbered rules is a workflow guide", () => {
  const m = parsePlaybook("ANIM_x.md", "# ANIM_x\n## Steps\n### 1. Do this\nText");
  assert.equal(m.kind, "workflow");
  assert.equal(m.rules.length, 0);
});

test("transcript cleaning removes timestamps and repeated caption lines", () => {
  const vtt = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nHello there\n\n2\n00:00:03.000 --> 00:00:05.000\nHello there\nhow are you\n";
  const c = cleanTranscript(vtt);
  assert.ok(!c.includes("-->") && !c.includes("WEBVTT"));
  assert.equal((c.match(/Hello there/g) ?? []).length, 1);
  assert.ok(c.includes("how are you"));
});

test("chunking keeps passages near the target size and covers all text", () => {
  const para = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  const text = [para(300), para(300), para(300), para(300)].join("\n\n");
  const chunks = chunkText(text, 380, 60);
  assert.ok(chunks.length >= 3);
  for (const c of chunks) assert.ok(c.split(" ").length <= 380 * 1.8);
  assert.ok(chunks.join(" ").includes("w299"));
});

test("glitch detection flags short and repeated text", () => {
  assert.ok(detectGlitches("too short").some((f) => f.kind === "short"));
  const rep = "word ".repeat(12) + "and some more real words here to pad this out nicely so it is long enough " + "x ".repeat(10);
  assert.ok(detectGlitches(rep.repeat(2)).some((f) => f.kind === "repeat"));
});

test("file names become titles and keys", () => {
  assert.deepEqual(titleFromFileName("1._Introduction_01_-_The_Skill_Stacking_Effect.txt"), { title: "The Skill Stacking Effect", ref: "Introduction 01" });
  assert.equal(promptKeyFromFile("evolve-desire-prompt.txt"), "evolve-desire-prompt");
});

test("prompt blanks are found", () => {
  assert.deepEqual(findPlaceholders("Brand {{BRAND_NAME}} at [PRODUCT URL]\n\nINSERT PRODUCT URL\nANGLE 1\n"), ["{{BRAND_NAME}}", "[PRODUCT URL]", "INSERT PRODUCT URL", "ANGLE 1"]);
});
