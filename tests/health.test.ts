import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { checkHealth } from "../src/lib/health.ts";

const down = () => {
  throw new Error("db down");
};

test("health ok when the db query succeeds (sha unset)", () => {
  const db = new DatabaseSync(":memory:");
  const r = checkHealth({
    checkDb: () => {
      db.prepare("SELECT 1").get();
    },
    uptime: () => 12.5,
  });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, {
    status: "ok",
    db: "ok",
    uptime_s: 12.5,
    sha: null,
  });
});

test("health ok includes sha when set", () => {
  const r = checkHealth({ checkDb: () => {}, uptime: () => 1, sha: "abc123" });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, {
    status: "ok",
    db: "ok",
    uptime_s: 1,
    sha: "abc123",
  });
});

test("health degraded (503) when the db query throws (sha unset)", () => {
  const r = checkHealth({ checkDb: down });
  assert.strictEqual(r.status, 503);
  assert.deepStrictEqual(r.body, {
    status: "degraded",
    db: "error",
    sha: null,
  });
});

test("health degraded includes sha when set", () => {
  const r = checkHealth({ checkDb: down, sha: "abc123" });
  assert.strictEqual(r.status, 503);
  assert.deepStrictEqual(r.body, {
    status: "degraded",
    db: "error",
    sha: "abc123",
  });
});
