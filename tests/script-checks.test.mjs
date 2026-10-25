import test from "node:test";
import assert from "node:assert/strict";
import { runChecks, hasCta, readingGrade, findTriplets, findBanned, unsupportedNumbers, parseBanned, hasEmoji, countEmDashes, DEFAULT_BANNED } from "../src/lib/ai/script-checks.ts";

const PLAIN = "My feet hurt every night and I had no idea why. I tried new shoes but none of them helped at all. Then my sister showed me a simple insole that spreads the weight across your whole foot. Simple. If you wait, it only keeps coming back. Tap the link and try them today.";

test("plain talk scores low and passes", () => {
  const r = runChecks(PLAIN, { facts: "", needCta: true });
  assert.ok(r.grade <= 6.4, `grade ${r.grade}`);
  assert.equal(r.issues.length, 0, JSON.stringify(r.issues));
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

test("a script that is too simple and choppy is flagged", () => {
  const choppy = "My feet hurt every night. I tried new shoes. None helped. Then my sister gave me these. The pain was gone in a week. Now I walk all day. Tap the link and try them.";
  assert.ok(readingGrade(choppy) < 2.5);
  assert.ok(runChecks(choppy).issues.some((i) => i.code === "choppy"));
});

test("missing beats such as the mechanism are flagged", () => {
  const r = runChecks(PLAIN, { beats: ["hook", "cost", "cta"], needBeats: ["mechanism", "cost", "cta"] });
  const b = r.issues.find((i) => i.code === "beats");
  assert.ok(b && b.detail === "mechanism");
  assert.ok(!runChecks(PLAIN, { beats: ["mechanism", "cost", "cta"], needBeats: ["mechanism", "cost", "cta"] }).issues.some((i) => i.code === "beats"));
});

test("a real call to action is needed, not just the word start", () => {
  assert.equal(hasCta("Start tonight. Let the body you chose catch your eye first."), false);
  assert.equal(hasCta("Tap the link to get yours today."), true);
  assert.equal(hasCta("Order yours now."), true);
});
