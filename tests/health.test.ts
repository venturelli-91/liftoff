import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { checkHealth } from "../src/lib/health.ts";

test("health ok when the db query succeeds", () => {
  const db = new DatabaseSync(":memory:");
  const r = checkHealth({
    checkDb: () => {
      db.prepare("SELECT 1").get();
    },
    uptime: () => 12.5,
  });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, { status: "ok", db: "ok", uptime_s: 12.5 });
});

test("health degraded (503) when the db query throws", () => {
  const r = checkHealth({
    checkDb: () => {
      throw new Error("db down");
    },
  });
  assert.strictEqual(r.status, 503);
  assert.deepStrictEqual(r.body, { status: "degraded", db: "error" });
});
