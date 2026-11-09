import assert from "node:assert";
import { test } from "node:test";
import { validatePayload } from "../src/lib/validate.ts";

const base = {
  cohort: "C1",
  startDate: "2026-01-01",
  endDate: "2026-02-01",
  instructor: { name: "Ada", email: "ada@example.com" },
  seats: 10,
};

const dup = [{ field: "materials", message: "must not contain duplicates" }];

test("exact duplicate materials are rejected", () => {
  const r = validatePayload({ ...base, materials: ["Slides", "Slides"] });
  assert.ok(!r.ok);
  assert.deepStrictEqual(r.errors, dup);
});

test("duplicates differing in case or whitespace are rejected", () => {
  const r = validatePayload({ ...base, materials: ["Slides", " slides "] });
  assert.ok(!r.ok);
  assert.deepStrictEqual(r.errors, dup);
});

test("distinct materials pass, trimmed and in order", () => {
  const r = validatePayload({ ...base, materials: [" B ", "A", "C"] });
  assert.ok(r.ok);
  assert.deepStrictEqual(r.value.materials, ["B", "A", "C"]);
});

test("empty materials list still passes", () => {
  const r = validatePayload({ ...base, materials: [] });
  assert.ok(r.ok);
  assert.deepStrictEqual(r.value.materials, []);
});
