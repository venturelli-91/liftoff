import assert from "node:assert";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CohortCard } from "../src/app/cohort-card.ts";
import type {
  CohortView,
  StepName,
  StepRow,
  StepState,
} from "../src/lib/types.ts";

const step = (
  name: StepName,
  state: StepState,
  extra: Partial<StepRow> = {},
): StepRow => ({
  name,
  state,
  attempts: 0,
  error: null,
  approved: false,
  draft: null,
  result: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const view = (status: CohortView["status"], steps: StepRow[]): CohortView => ({
  id: 1,
  idempotencyKey: "k",
  payload: {
    cohort: "Spring Cohort",
    startDate: "2026-03-01",
    endDate: "2026-04-01",
    instructor: { name: "Ada Lovelace", email: "ada@example.com" },
    seats: 20,
    materials: [],
  },
  status,
  createdAt: "2026-01-01T00:00:00.000Z",
  steps,
  events: [],
});

const render = (c: CohortView) =>
  renderToStaticMarkup(createElement(CohortCard, { cohort: c, act: () => {} }));
const items = (html: string): string[] & Record<number, string> =>
  html.match(/<li\b[\s\S]*?<\/li>/g) ?? [];
const text = (s: string) => s.replace(/<!-- -->/g, "");

// pending, running, retrying, awaiting_approval, completed (five steps) ...
const main = view("awaiting_approval", [
  step("calendar", "pending"),
  step("lms", "running", { attempts: 1 }),
  step("marketing", "retrying", { attempts: 2 }),
  step("salesforce", "completed", { attempts: 1, error: "stale error" }),
  step("email", "awaiting_approval", {
    attempts: 1,
    draft: { subject: "Welcome aboard", body: "Hello Ada" },
  }),
]);
// ... and needs_attention on its own cohort (only five step names exist)
const failed = view("needs_attention", [
  step("calendar", "needs_attention", { attempts: 3, error: "calendar boom" }),
]);

test("cohort graph shows name, status, trigger node and the five step labels", () => {
  const html = text(render(main));
  assert.match(html, /Spring Cohort/);
  assert.match(html, /awaiting approval<\/span>/);
  assert.match(html, /Cohort confirmed/);
  const li = items(html);
  assert.strictEqual(li.length, 5);
  for (const l of [
    "Calendar event",
    "LMS environment",
    "Landing page notice",
    "Salesforce record",
    "Welcome email",
  ]) {
    assert.ok(
      li.some((x) => x.includes(l)),
      l,
    );
  }
});

test("each step shows its state text and attempt count only when attempts > 0", () => {
  const li = items(text(render(main)));
  assert.match(li[0], /pending<\/span>/);
  assert.doesNotMatch(li[0], /attempt/);
  assert.match(li[1], /running · attempt 1/);
  assert.match(li[2], /retrying · attempt 2/);
  assert.match(li[3], /completed · attempt 1/);
  assert.match(li[4], /awaiting approval · attempt 1/);
  assert.match(text(render(failed)), /needs attention · attempt 3/);
});

test("state-specific dot and edge colors", () => {
  const li = items(render(main));
  assert.match(li[3], /bg-pos/);
  assert.match(li[3], /h-px w-6 md:block bg-pos/);
  assert.match(li[4], /bg-accent/);
  assert.match(li[4], /h-px w-6 md:block bg-accent/);
  assert.match(li[0], /ring-fg-3/);
  assert.match(li[1], /motion-safe:animate-pulse/);
  const bad = items(render(failed))[0];
  assert.match(bad, /bg-neg/);
  assert.match(bad, /h-px w-6 md:block bg-neg/);
});

test("Approve and draft only when awaiting approval; Retry and error only when needs attention", () => {
  const li = items(render(main));
  assert.match(li[4], /Approve/);
  assert.match(li[4], /Welcome aboard/);
  assert.match(li[4], /Hello Ada/);
  for (const i of [0, 1, 2, 3])
    assert.doesNotMatch(li[i], /Approve|Welcome aboard/);
  assert.doesNotMatch(render(main), /Retry/);
  assert.doesNotMatch(render(main), /stale error/);
  const bad = render(failed);
  assert.match(bad, /Retry/);
  assert.match(bad, /calendar boom/);
  assert.doesNotMatch(bad, /Approve/);
});
