import assert from "node:assert";
import { test } from "node:test";
import {
  DuplicateEmailError,
  InstructorStore,
} from "../src/lib/instructors.ts";

const ada = { name: "Ada", email: "ada@example.com", bio: "Maths" };

test("create then list", () => {
  const s = new InstructorStore(":memory:");
  assert.deepStrictEqual(s.list(), []);
  const a = s.create(ada);
  assert.deepStrictEqual(a, { id: 1, ...ada });
  const b = s.create({ name: "Bob", email: "bob@example.com" });
  assert.strictEqual(b.bio, "");
  assert.deepStrictEqual(
    s.list().map((i) => i.id),
    [1, 2],
  );
});

test("duplicate email is rejected case-insensitively", () => {
  const s = new InstructorStore(":memory:");
  s.create(ada);
  assert.throws(
    () => s.create({ name: "X", email: "ADA@example.com" }),
    DuplicateEmailError,
  );
  assert.strictEqual(s.list().length, 1);
});
