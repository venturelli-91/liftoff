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

test("update changes fields", () => {
  const s = new InstructorStore(":memory:");
  const a = s.create(ada);
  const u = s.update(a.id, {
    name: "Ada L",
    email: "ada@example.com",
    bio: "",
  });
  assert.deepStrictEqual(u, {
    id: a.id,
    name: "Ada L",
    email: "ada@example.com",
    bio: "",
  });
  assert.strictEqual(s.get(a.id)?.name, "Ada L");
});

test("update unknown id returns undefined", () => {
  const s = new InstructorStore(":memory:");
  assert.strictEqual(s.update(99, ada), undefined);
});

test("duplicate email is rejected case-insensitively", () => {
  const s = new InstructorStore(":memory:");
  s.create(ada);
  assert.throws(
    () => s.create({ name: "X", email: "ADA@example.com" }),
    DuplicateEmailError,
  );
  const b = s.create({ name: "Bob", email: "bob@example.com" });
  assert.throws(
    () => s.update(b.id, { name: "Bob", email: "ada@example.com" }),
    DuplicateEmailError,
  );
  assert.strictEqual(s.list().length, 2);
});
