import assert from "node:assert";
import { test } from "node:test";

process.env.LIFTOFF_DB = ":memory:";

const { GET } = await import("../src/app/api/cohorts/[id]/route.ts");
const { getEngine } = await import("../src/lib/runtime.ts");

const call = (id: string) =>
  GET(new Request(`http://x/api/cohorts/${id}`), {
    params: Promise.resolve({ id }),
  });

test("existing id returns 200 with the cohort", async () => {
  const engine = getEngine();
  engine.trigger(
    {
      cohort: "Python Spring",
      startDate: "2026-12-01",
      endDate: "2026-12-20",
      instructor: { name: "Ada", email: "ada@example.com" },
      seats: 20,
      materials: [],
    },
    "k1",
  );
  const [first] = engine.listCohorts();
  const r = await call(String(first.id));
  assert.strictEqual(r.status, 200);
  const body = (await r.json()) as { id: number };
  assert.strictEqual(body.id, first.id);
  await engine.idle();
});

test("unknown or invalid id returns 404 with JSON error", async () => {
  for (const id of ["9999", "abc"]) {
    const r = await call(id);
    assert.strictEqual(r.status, 404);
    assert.deepStrictEqual(await r.json(), { error: "not found" });
  }
});
