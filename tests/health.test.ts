import assert from "node:assert";
import { test } from "node:test";
import { checkHealth } from "../src/lib/health.ts";

const down = () => {
  throw new Error("db down");
};

test("health ok when the db query succeeds, sha from LIFTOFF_SHA", () => {
  delete process.env.LIFTOFF_SHA;
  const r = checkHealth(() => {});
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(
    { ...r.body, uptime_s: typeof r.body.uptime_s },
    { status: "ok", db: "ok", uptime_s: "number", sha: null },
  );
  process.env.LIFTOFF_SHA = "abc123";
  assert.strictEqual(checkHealth(() => {}).body.sha, "abc123");
});

test("health degraded (503) when the db query throws", () => {
  delete process.env.LIFTOFF_SHA;
  assert.deepStrictEqual(checkHealth(down), {
    status: 503,
    body: { status: "degraded", db: "error", sha: null },
  });
  process.env.LIFTOFF_SHA = "abc123";
  assert.strictEqual(checkHealth(down).body.sha, "abc123");
  delete process.env.LIFTOFF_SHA;
});
