import test from "node:test";
import assert from "node:assert/strict";
import { costAud, planBatches, tokensForChars } from "../src/lib/ai/cost.ts";

test("cost is tokens times price, in AUD", () => {
  // 1M in at $0.30 and 1M out at $2.50 = $2.80 = A$4.20 at 1.5
  assert.ok(Math.abs(costAud(1_000_000, 1_000_000, { inUsd: 0.3, outUsd: 2.5 }, 1.5) - 4.2) < 1e-9);
  assert.equal(costAud(-5, -5, { inUsd: 1, outUsd: 1 }, 1.5), 0);
});

test("token estimate is pessimistic", () => {
  assert.equal(tokensForChars(300), 100);
  assert.equal(tokensForChars(0), 0);
});

test("small files share a batch, big files are capped and go alone", () => {
  const opts = { maxCharsPerFile: 100, maxCharsPerBatch: 200, maxFilesPerBatch: 3 };
  const b = planBatches([{ id: "a", chars: 50 }, { id: "b", chars: 50 }, { id: "c", chars: 50 }, { id: "d", chars: 50 }, { id: "e", chars: 9999 }, { id: "f", chars: 9999 }], opts);
  assert.deepEqual(b.map((x) => x.ids), [["a", "b", "c"], ["d", "e"], ["f"]]);
  assert.ok(b.every((x) => x.chars <= 200));
  assert.deepEqual(planBatches([], opts), []);
});
