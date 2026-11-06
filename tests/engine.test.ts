import assert from "node:assert";
import { test } from "node:test";
import { createMockAdapters, type FailureConfig } from "../src/lib/adapters.ts";
import { templateDrafter } from "../src/lib/drafter.ts";
import { Engine } from "../src/lib/engine.ts";
import { handleTrigger, secretMatches } from "../src/lib/trigger.ts";
import type { StepName } from "../src/lib/types.ts";
import { lostResponse, probe } from "./helpers.ts";

const payload = {
  cohort: "Python Spring",
  startDate: "2026-12-01",
  endDate: "2026-12-20",
  instructor: { name: "Ada", email: "ada@example.com" },
  seats: 20,
  materials: ["Extra slides"],
};

function setup(
  config: Partial<
    Record<StepName, FailureConfig & { failAfterEffect?: boolean }>
  > = {},
  maxAttempts = 3,
) {
  const shared = { inFlight: 0, peak: 0 };
  const plain = Object.fromEntries(
    Object.entries(config).map(([n, c]) => [
      n,
      c.failAfterEffect ? { delayMs: c.delayMs } : c,
    ]),
  );
  const adapters = createMockAdapters(plain);
  for (const [n, c] of Object.entries(config))
    if (c.failAfterEffect)
      lostResponse(adapters[n as StepName], c.failTimes ?? 0);
  probe(Object.values(adapters), shared);
  const engine = new Engine(adapters, templateDrafter, ":memory:", {
    maxAttempts,
    backoffMs: 1,
  });
  return { adapters, engine, shared };
}

const states = (e: Engine, id: number) =>
  Object.fromEntries(
    e.getCohort(id)?.steps.map((s) => [s.name, s.state]) ?? [],
  );

test("happy path: approval gates email and notice, rest completes", async () => {
  const { adapters, engine } = setup();
  const { id } = engine.trigger(payload, "k1");
  await engine.idle();
  assert.deepStrictEqual(states(engine, id), {
    calendar: "completed",
    lms: "completed",
    marketing: "awaiting_approval",
    salesforce: "completed",
    email: "awaiting_approval",
  });
  assert.strictEqual(adapters.email.effects.size, 0);
  assert.strictEqual(adapters.marketing.effects.size, 0);

  assert.ok(engine.approve(id, "email"));
  assert.ok(engine.approve(id, "marketing"));
  await engine.idle();
  assert.strictEqual(engine.getCohort(id)?.status, "completed");
  assert.strictEqual(adapters.email.effects.size, 1);
  assert.strictEqual(adapters.marketing.effects.size, 1);
  const types = engine.getCohort(id)?.events.map((e) => e.type);
  assert.ok(types?.includes("triggered") && types.includes("approved"));
});

test("drafter picks course materials and email content", () => {
  const m = templateDrafter.selectMaterials(payload);
  assert.ok(m.includes("Python handbook") && m.includes("Extra slides"));
  assert.match(templateDrafter.welcomeEmail(payload).body, /Ada/);
});

test("duplicate trigger never repeats side effects", async () => {
  const { adapters, engine } = setup();
  const a = engine.trigger(payload, "same");
  const b = engine.trigger(payload, "same");
  await engine.idle();
  assert.strictEqual(a.id, b.id);
  assert.strictEqual(b.duplicate, true);
  assert.strictEqual(engine.listCohorts().length, 1);
  assert.strictEqual(adapters.calendar.calls, 1);
  assert.strictEqual(adapters.lms.effects.size, 1);
  assert.strictEqual(adapters.salesforce.effects.size, 1);
  // double approval is a no-op too
  engine.approve(a.id, "email");
  assert.strictEqual(engine.approve(a.id, "email"), false);
  await engine.idle();
  assert.strictEqual(adapters.email.calls, 1);
});

test("steps run in parallel", async () => {
  const d = { delayMs: 40 };
  const { engine, shared } = setup({
    calendar: d,
    lms: d,
    salesforce: d,
    marketing: d,
    email: d,
  });
  const { id } = engine.trigger(payload, "p");
  await engine.idle();
  engine.approve(id, "email");
  engine.approve(id, "marketing");
  await engine.idle();
  assert.ok(shared.peak >= 3, `peak concurrency ${shared.peak}`);
});

test("transient failure is retried automatically, effect happens once", async () => {
  const { adapters, engine } = setup({
    calendar: { failTimes: 2, failAfterEffect: true },
  });
  const { id } = engine.trigger(payload, "r");
  await engine.idle();
  assert.strictEqual(states(engine, id).calendar, "completed");
  assert.strictEqual(adapters.calendar.calls, 3);
  assert.strictEqual(adapters.calendar.effects.size, 1);
});

test("exhausted retries escalate; manual retry recovers without duplicates", async () => {
  const { adapters, engine } = setup({ salesforce: { failTimes: 3 } });
  const { id } = engine.trigger(payload, "e");
  await engine.idle();
  assert.strictEqual(states(engine, id).salesforce, "needs_attention");
  assert.strictEqual(engine.getCohort(id)?.status, "needs_attention");
  assert.ok(engine.getCohort(id)?.events.some((e) => e.type === "escalated"));
  assert.strictEqual(engine.retry(id, "calendar"), false); // only flagged steps

  assert.ok(engine.retry(id, "salesforce"));
  await engine.idle();
  assert.strictEqual(states(engine, id).salesforce, "completed");
  assert.strictEqual(adapters.salesforce.effects.size, 1);
  assert.strictEqual(adapters.calendar.calls, 1);
  assert.ok(
    engine.getCohort(id)?.events.some((e) => e.type === "manual_retry"),
  );
});

test("unapproved step failing after approval still gates correctly", async () => {
  const { adapters, engine } = setup({ email: { failTimes: 99 } }, 2);
  const { id } = engine.trigger(payload, "g");
  await engine.idle();
  assert.strictEqual(adapters.email.calls, 0);
  engine.approve(id, "email");
  await engine.idle();
  assert.strictEqual(states(engine, id).email, "needs_attention");
  assert.strictEqual(adapters.email.effects.size, 0);
});

test("validation rejects bad payloads with field errors", () => {
  const { engine } = setup();
  const r = handleTrigger(
    engine,
    {
      ...payload,
      seats: 0,
      startDate: "x",
      instructor: { name: "", email: "no" },
    },
    null,
  );
  assert.strictEqual(r.status, 422);
  const fields = (r.body as { errors: { field: string }[] }).errors.map(
    (e) => e.field,
  );
  for (const f of ["seats", "startDate", "instructor.name", "instructor.email"])
    assert.ok(fields.includes(f), f);
  assert.strictEqual(engine.listCohorts().length, 0);
});

test("webhook secret check fails closed", () => {
  assert.strictEqual(secretMatches("a", undefined), false);
  assert.strictEqual(secretMatches(null, "a"), false);
  assert.strictEqual(secretMatches("b", "a"), false);
  assert.strictEqual(secretMatches("a", "a"), true);
});
