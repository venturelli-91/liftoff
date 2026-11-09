import assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isAuthorized } from "../src/lib/ops-auth.ts";

const basic = (user: string, pass: string) =>
  `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

test("unset or empty password: everything passes", () => {
  assert.ok(isAuthorized(null, undefined));
  assert.ok(isAuthorized(null, ""));
  assert.ok(isAuthorized("garbage", ""));
});

test("password set, no header: rejected", () => {
  assert.strictEqual(isAuthorized(null, "s3cret"), false);
  assert.strictEqual(isAuthorized("", "s3cret"), false);
});

test("wrong password rejected, correct password accepted with any username", () => {
  assert.strictEqual(isAuthorized(basic("ops", "nope"), "s3cret"), false);
  assert.ok(isAuthorized(basic("ops", "s3cret"), "s3cret"));
  assert.ok(isAuthorized(basic("", "s3cret"), "s3cret"));
  assert.ok(isAuthorized(basic("a", "pa:ss"), "pa:ss"));
});

test("malformed headers return false without throwing", () => {
  for (const h of [
    "Basic",
    "Basic !!!",
    "Bearer abc",
    "Basic bm9jb2xvbg==",
    "Basic %%%%",
    "x".repeat(10000),
  ]) {
    assert.strictEqual(isAuthorized(h, "s3cret"), false);
  }
});

test("matcher never covers /api/health or /api/webhook, covers protected routes", () => {
  // proxy.ts imports next/server (not resolvable under plain node), so read the matcher from source
  const src = readFileSync("src/proxy.ts", "utf8");
  const block = /matcher:\s*\[([^\]]*)\]/.exec(src)?.[1] ?? "";
  const matcher = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(matcher.length >= 7);
  const res = matcher.map((m) => new RegExp(`^${m.replace(/:path\*/, ".*")}$`));
  const hit = (p: string) => res.some((r) => r.test(p));
  assert.strictEqual(hit("/api/health"), false);
  assert.strictEqual(hit("/api/webhook/cohort-confirmed"), false);
  for (const p of [
    "/",
    "/audit",
    "/instructors",
    "/api/cohorts",
    "/api/cohorts/1/steps/a/b",
    "/api/instructors",
    "/api/audit",
  ]) {
    assert.ok(hit(p), p);
  }
});
