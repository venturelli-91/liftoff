import assert from "node:assert";
import { test } from "node:test";
import { InstructorStore } from "../src/lib/instructors.ts";
import {
  createInstructor,
  listInstructors,
  updateInstructor,
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

test("partial update merges, invalid is 400, unknown or bad id is 404", () => {
  const s = new InstructorStore(":memory:");
  createInstructor(s, ada);
  const ok = updateInstructor(s, "1", { name: "Ada L" });
  assert.strictEqual(ok.status, 200);
  assert.deepStrictEqual(ok.body, { id: 1, ...ada, name: "Ada L" });
  assert.strictEqual(updateInstructor(s, "1", { email: "x" }).status, 400);
  assert.strictEqual(updateInstructor(s, "99", ada).status, 404);
  assert.strictEqual(updateInstructor(s, "abc", ada).status, 404);
});

test("update to another instructor's email is 409", () => {
  const s = new InstructorStore(":memory:");
  createInstructor(s, ada);
  createInstructor(s, { name: "Bo", email: "bo@example.com" });
  assert.strictEqual(
    updateInstructor(s, "2", { email: "ada@example.com" }).status,
    409,
  );
});
