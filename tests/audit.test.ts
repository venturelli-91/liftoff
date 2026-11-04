import assert from "node:assert";
import { test } from "node:test";
import { createMockAdapters } from "../src/lib/adapters.ts";
import { buildAudit } from "../src/lib/audit.ts";
import { templateDrafter } from "../src/lib/drafter.ts";
import { Engine } from "../src/lib/engine.ts";

const mk = (cohort: string) => ({
  cohort,
  startDate: "2026-12-01",
  endDate: "2026-12-20",
  instructor: { name: "Ada", email: "ada@example.com" },
  seats: 20,
  materials: [],
});

async function seed() {
  const engine = new Engine(
    createMockAdapters({}, { inFlight: 0, peak: 0 }),
    templateDrafter,
    ":memory:",
    { maxAttempts: 3, backoffMs: 1 },
  );
  engine.trigger(mk("Python Spring"), "a");
  engine.trigger(mk("Go Summer"), "b");
  await engine.idle();
  return engine.listCohorts();
}

test("no filter returns all cohorts' events, newest first", async () => {
  const cohorts = await seed();
  const all = buildAudit(cohorts);
  const total = cohorts.reduce((n, c) => n + c.events.length, 0);
  assert.strictEqual(all.length, total);
  assert.deepStrictEqual(
    new Set(all.map((r) => r.cohort)),
    new Set(["Python Spring", "Go Summer"]),
  );
  for (let i = 1; i < all.length; i++) {
    assert.ok(all[i - 1].time >= all[i].time);
  }
});

test("cohort filter", async () => {
  const rows = buildAudit(await seed(), { cohort: "Go Summer" });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.cohort === "Go Summer"));
});

test("step filter", async () => {
  const rows = buildAudit(await seed(), { step: "lms" });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.step === "lms"));
});

test("cohort and step combine; unknown values give empty list", async () => {
  const cohorts = await seed();
  const rows = buildAudit(cohorts, { cohort: "Go Summer", step: "email" });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.cohort === "Go Summer" && r.step === "email"));
  assert.deepStrictEqual(buildAudit(cohorts, { cohort: "nope" }), []);
  assert.deepStrictEqual(buildAudit(cohorts, { step: "nope" }), []);
});

test("equal timestamps order by newest cohort/event first", () => {
  const ev = (id: number) => ({
    id,
    step: null,
    type: "t",
    message: `m${id}`,
    at: "2026-01-01T00:00:00.000Z",
  });
  const c = (id: number) =>
    ({
      id,
      payload: mk(`c${id}`),
      events: [ev(1), ev(2)],
    }) as never;
  const rows = buildAudit([c(1), c(2)]);
  assert.deepStrictEqual(
    rows.map((r) => `${r.cohort}:${r.detail}`),
    ["c2:m2", "c2:m1", "c1:m2", "c1:m1"],
  );
});
