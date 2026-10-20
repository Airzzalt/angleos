// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, passwordProblem } from "../src/lib/password.ts";
import { generateInviteCode, hashInviteCode, normalizeInviteCode, inviteHint } from "../src/lib/invite-code.ts";

test("password hashing round trip", async () => {
  const h = await hashPassword("correct horse battery");
  assert.ok(h.startsWith("scrypt$"));
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("wrong password!!", h), false);
  assert.equal(await verifyPassword("anything", "garbage"), false);
});

test("same password hashes differently each time (salted)", async () => {
  assert.notEqual(await hashPassword("same-password-1"), await hashPassword("same-password-1"));
});

test("password rules", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem("aaaaaaaaaaaa"));
  assert.equal(passwordProblem("a decent passphrase"), null);
});

test("invite codes have the right shape and are unique", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const c = generateInviteCode();
    assert.match(c, /^ANGL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    seen.add(c);
  }
  assert.equal(seen.size, 500);
});

test("invite code matching ignores case, spaces and dashes", () => {
  const code = "ANGL-K7QM-2XRD-9TNF";
  assert.equal(hashInviteCode(code), hashInviteCode("angl k7qm 2xrd 9tnf"));
  assert.equal(hashInviteCode(code), hashInviteCode("ANGLK7QM2XRD9TNF"));
  assert.notEqual(hashInviteCode(code), hashInviteCode("ANGL-K7QM-2XRD-9TNG"));
  assert.equal(normalizeInviteCode("  a-b c "), "ABC");
  assert.equal(inviteHint(code), "9TNF");
});
