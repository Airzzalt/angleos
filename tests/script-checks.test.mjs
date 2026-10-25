import test from "node:test";
import assert from "node:assert/strict";
import { runChecks, readingGrade, findTriplets, findBanned, unsupportedNumbers, parseBanned, hasEmoji, countEmDashes, DEFAULT_BANNED } from "../src/lib/ai/script-checks.ts";

const PLAIN = "My feet hurt every night. I tried three pairs of shoes. None helped. Then my sister gave me these. The pain was gone in a week. Now I walk all day with no pain at all. Tap the link and try them.";

test("plain talk scores low and passes", () => {
  const r = runChecks(PLAIN, { facts: "three pairs a week" , needCta: true });
  assert.ok(r.grade <= 6.4, `grade ${r.grade}`);
  assert.equal(r.issues.filter((i) => i.code !== "numbers").length, 0, JSON.stringify(r.issues));
});

test("hard words push the reading grade up and fail", () => {
  const hard = "Orthopaedic biomechanical engineering fundamentally revolutionises musculoskeletal rehabilitation through unprecedented technological sophistication.";
  assert.ok(readingGrade(hard) > 12);
  assert.ok(runChecks(hard).issues.some((i) => i.code === "grade"));
});

test("banned AI words and phrases are caught", () => {
  assert.deepEqual(findBanned("Let us delve into this tapestry.", DEFAULT_BANNED).sort(), ["delve", "tapestry"]);
  assert.deepEqual(findBanned("Look no further than this.", DEFAULT_BANNED), ["look no further"]);
  assert.deepEqual(findBanned("I dealt with it.", DEFAULT_BANNED), []);
});

test("the owner's list is read from lines and commas", () => {
  assert.deepEqual(parseBanned("- foo bar\n2. baz qux, quux"), ["foo bar", "baz qux", "quux"]);
});

test("lists of exactly three are flagged, two and four are fine", () => {
  assert.ok(findTriplets("It is fast, simple, and cheap.").length > 0);
  assert.ok(findTriplets("Fast. Simple. Done.").length > 0);
  assert.equal(findTriplets("It is fast and cheap.").length, 0);
  assert.equal(findTriplets("It is fast, simple, cheap, and strong.").length, 0);
});

test("emoji and pause dashes are caught", () => {
  assert.ok(hasEmoji("Love this 🔥"));
  assert.ok(!hasEmoji("Love this"));
  assert.equal(countEmDashes("Wait — what?"), 1);
  const r = runChecks("Wait — what? It works 🔥.");
  assert.ok(r.issues.some((i) => i.code === "dash") && r.issues.some((i) => i.code === "emoji"));
});

test("invented numbers are caught but facts given are allowed", () => {
  assert.deepEqual(unsupportedNumbers("Over 12,000 people got 87% better.", "Sold in a 30 day trial."), ["12,000", "87%"]);
  assert.deepEqual(unsupportedNumbers("Try it for 30 days.", "30 day trial"), []);
});

test("robotic even sentence length is flagged", () => {
  const even = "I like this shoe a lot. It fits my foot so well. My feet feel good all day. I wear it to the park. I wear it to the shop. I will buy it again soon.";
  assert.ok(runChecks(even).issues.some((i) => i.code === "rhythm"));
});

test("a script with no call to action is flagged when one is needed", () => {
  const r = runChecks("My feet hurt. Then they did not. Odd, right? It was the shoes. That was all.", { needCta: true });
  assert.ok(r.issues.some((i) => i.code === "cta"));
});
