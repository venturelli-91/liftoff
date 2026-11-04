import assert from "node:assert";
import { test } from "node:test";
import { BIO_MAX, validateInstructor } from "../src/lib/validate.ts";

test("valid instructor is trimmed, bio defaults to empty", () => {
  const r = validateInstructor({ name: " Ada ", email: " ada@example.com " });
  assert.deepStrictEqual(r, {
    ok: true,
    value: { name: "Ada", email: "ada@example.com", bio: "" },
  });
});

test("invalid name, email and bio give field errors", () => {
  const r = validateInstructor({
    name: "  ",
    email: "nope",
    bio: "x".repeat(BIO_MAX + 1),
  });
  assert.ok(!r.ok);
  assert.deepStrictEqual(r.errors.map((e) => e.field).sort(), [
    "bio",
    "email",
    "name",
  ]);
});

test("name over 200 and non-object input are rejected", () => {
  const r = validateInstructor({ name: "a".repeat(201), email: "a@b.co" });
  assert.ok(!r.ok && r.errors[0].field === "name");
  const n = validateInstructor(null);
  assert.ok(!n.ok && n.errors.length === 2);
});

test("non-string bio is rejected, bio at the cap is accepted", () => {
  assert.ok(!validateInstructor({ name: "A", email: "a@b.co", bio: 5 }).ok);
  assert.ok(
    validateInstructor({ name: "A", email: "a@b.co", bio: "x".repeat(BIO_MAX) })
      .ok,
  );
});
