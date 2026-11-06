import assert from "node:assert";
import { test } from "node:test";
import { InstructorStore } from "../src/lib/instructors.ts";
import {
  createInstructor,
  listInstructors,
} from "../src/lib/instructors-api.ts";

const ada = { name: "Ada", email: "ada@example.com", bio: "hi" };

test("create returns 201, list returns it", () => {
  const s = new InstructorStore(":memory:");
  const c = createInstructor(s, ada);
  assert.strictEqual(c.status, 201);
  const l = listInstructors(s);
  assert.strictEqual(l.status, 200);
  assert.strictEqual((l.body as unknown[]).length, 1);
});

test("create with invalid input is 400 with field errors", () => {
  const s = new InstructorStore(":memory:");
  const r = createInstructor(s, { name: "", email: "nope" });
  assert.strictEqual(r.status, 400);
  const fields = (r.body as { errors: { field: string }[] }).errors.map(
    (e) => e.field,
  );
  assert.deepStrictEqual(fields, ["name", "email"]);
  assert.strictEqual(createInstructor(s, undefined).status, 400);
});

test("duplicate email is 409", () => {
  const s = new InstructorStore(":memory:");
  createInstructor(s, ada);
  const r = createInstructor(s, { ...ada, email: "ADA@example.com" });
  assert.strictEqual(r.status, 409);
});
