import { DatabaseSync } from "node:sqlite";
import type { Adapters } from "./adapters.ts";
import type { Drafter } from "./drafter.ts";
import {
  APPROVAL_STEPS,
  type CohortPayload,
  type CohortView,
  type Draft,
  type EventRow,
  STEP_NAMES,
  type StepName,
  type StepRow,
  type StepState,
} from "./types.ts";

export type EngineOptions = {
  maxAttempts?: number;
  /** Base backoff in ms; attempt n waits base * 2^(n-1). */
  backoffMs?: number;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cohorts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS steps (
  cohort_id INTEGER NOT NULL REFERENCES cohorts(id),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  draft TEXT,
  result TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (cohort_id, name)
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cohort_id INTEGER NOT NULL REFERENCES cohorts(id),
  step TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  at TEXT NOT NULL
);`;

const now = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Engine {
  db: DatabaseSync;
  adapters: Adapters;
  drafter: Drafter;
  maxAttempts: number;
  backoffMs: number;
  private inFlight = new Set<string>();
  private tasks = new Set<Promise<void>>();

  constructor(
    adapters: Adapters,
    drafter: Drafter,
    dbPath = ":memory:",
    opts: EngineOptions = {},
  ) {
    this.adapters = adapters;
    this.drafter = drafter;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.backoffMs = opts.backoffMs ?? 200;
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  /** Resolves when no step is running (tests / graceful shutdown). */
  async idle() {
    while (this.tasks.size) await Promise.all([...this.tasks]);
  }

  /** Re-launches steps interrupted by a server restart. */
  resume() {
    const rows = this.db
      .prepare(
        "SELECT cohort_id, name FROM steps WHERE state IN ('pending','running','retrying')",
      )
      .all() as { cohort_id: number; name: StepName }[];
    for (const r of rows) this.launch(r.cohort_id, r.name);
  }

  private log(cohortId: number, step: StepName | null, type: string, message: string) {
    this.db
      .prepare(
        "INSERT INTO events (cohort_id, step, type, message, at) VALUES (?,?,?,?,?)",
      )
      .run(cohortId, step, type, message, now());
  }

  private setStep(
    cohortId: number,
    name: StepName,
    f: { state: StepState; error?: string | null; attempts?: number; result?: string },
  ) {
    this.db
      .prepare(
        `UPDATE steps SET state = ?, error = ?, attempts = COALESCE(?, attempts),
         result = COALESCE(?, result), updated_at = ? WHERE cohort_id = ? AND name = ?`,
      )
      .run(
        f.state,
        f.error ?? null,
        f.attempts ?? null,
        f.result ?? null,
        now(),
        cohortId,
        name,
      );
  }

  /** Creates the cohort and starts its five steps in parallel. Idempotent on key. */
  trigger(payload: CohortPayload, idempotencyKey: string) {
    const existing = this.db
      .prepare("SELECT id FROM cohorts WHERE idempotency_key = ?")
      .get(idempotencyKey) as { id: number } | undefined;
    if (existing) {
      this.log(existing.id, null, "duplicate_trigger", "Duplicate trigger ignored");
      return { id: existing.id, duplicate: true };
    }
    this.db.exec("BEGIN");
    let id: number;
    try {
      const r = this.db
        .prepare(
          "INSERT INTO cohorts (idempotency_key, payload, created_at) VALUES (?,?,?)",
        )
        .run(idempotencyKey, JSON.stringify(payload), now());
      id = Number(r.lastInsertRowid);
      for (const name of STEP_NAMES) {
        this.db
          .prepare(
            "INSERT INTO steps (cohort_id, name, state, updated_at) VALUES (?,?, 'pending', ?)",
          )
          .run(id, name, now());
      }
      this.log(id, null, "triggered", `Cohort "${payload.cohort}" confirmed`);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    for (const name of STEP_NAMES) this.launch(id, name);
    return { id, duplicate: false };
  }

  approve(cohortId: number, name: StepName) {
    const s = this.getStep(cohortId, name);
    if (!s || s.state !== "awaiting_approval") return false;
    this.db
      .prepare("UPDATE steps SET approved = 1 WHERE cohort_id = ? AND name = ?")
      .run(cohortId, name);
    this.log(cohortId, name, "approved", "Draft approved by a human");
    this.launch(cohortId, name);
    return true;
  }

  retry(cohortId: number, name: StepName) {
    const s = this.getStep(cohortId, name);
    if (!s || s.state !== "needs_attention") return false;
    this.setStep(cohortId, name, { state: "pending", attempts: 0 });
    this.log(cohortId, name, "manual_retry", "Manual retry requested");
    this.launch(cohortId, name);
    return true;
  }

  private launch(cohortId: number, name: StepName) {
    const k = `${cohortId}:${name}`;
    if (this.inFlight.has(k)) return;
    this.inFlight.add(k);
    const p = this.runStep(cohortId, name)
      .catch((e) =>
        this.log(cohortId, name, "engine_error", String(e?.message ?? e)),
      )
      .finally(() => {
        this.inFlight.delete(k);
        this.tasks.delete(p);
      });
    this.tasks.add(p);
  }

  private async runStep(cohortId: number, name: StepName) {
    let step = this.getStep(cohortId, name) as StepRow;
    if (step.state === "completed" || step.state === "needs_attention") return;
    const payload = this.getPayload(cohortId);

    if (APPROVAL_STEPS.includes(name)) {
      if (!step.draft) {
        const draft =
          name === "email"
            ? this.drafter.welcomeEmail(payload)
            : this.drafter.landingNotice(payload);
        this.db
          .prepare("UPDATE steps SET draft = ? WHERE cohort_id = ? AND name = ?")
          .run(JSON.stringify(draft), cohortId, name);
        this.log(cohortId, name, "drafted", "Draft generated, waiting for approval");
        step = this.getStep(cohortId, name) as StepRow;
      }
      if (!step.approved) {
        this.setStep(cohortId, name, { state: "awaiting_approval" });
        return;
      }
    }

    const key = `${cohortId}:${name}`;
    while (step.attempts < this.maxAttempts) {
      const attempt = step.attempts + 1;
      this.setStep(cohortId, name, { state: "running", attempts: attempt });
      this.log(cohortId, name, "attempt", `Attempt ${attempt}/${this.maxAttempts}`);
      try {
        const result = await this.execute(name, key, payload, step.draft);
        this.setStep(cohortId, name, { state: "completed", result });
        this.log(cohortId, name, "completed", `Completed (${result})`);
        return;
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        this.log(cohortId, name, "failed", `Attempt ${attempt} failed: ${msg}`);
        if (attempt >= this.maxAttempts) {
          this.setStep(cohortId, name, {
            state: "needs_attention",
            error: msg,
            attempts: attempt,
          });
          this.log(
            cohortId,
            name,
            "escalated",
            "Retries exhausted, flagged as needs-attention",
          );
          return;
        }
        this.setStep(cohortId, name, {
          state: "retrying",
          error: msg,
          attempts: attempt,
        });
        await sleep(this.backoffMs * 2 ** (attempt - 1));
      }
      step = this.getStep(cohortId, name) as StepRow;
    }
  }

  private execute(
    name: StepName,
    key: string,
    p: CohortPayload,
    draft: Draft | null,
  ): Promise<string> {
    const a = this.adapters;
    switch (name) {
      case "calendar":
        return a.calendar.run(key, {
          title: p.cohort,
          start: p.startDate,
          end: p.endDate,
          attendee: p.instructor.email,
        });
      case "lms":
        return a.lms.run(key, {
          cohort: p.cohort,
          seats: p.seats,
          materials: this.drafter.selectMaterials(p),
        });
      case "marketing":
        return a.marketing.run(key, {
          title: draft?.subject ?? p.cohort,
          body: draft?.body ?? "",
        });
      case "salesforce":
        return a.salesforce.run(key, {
          cohort: p.cohort,
          instructor: p.instructor,
          seats: p.seats,
          start: p.startDate,
          end: p.endDate,
        });
      case "email":
        return a.email.run(key, {
          to: p.instructor.email,
          subject: draft?.subject ?? "",
          body: draft?.body ?? "",
        });
    }
  }

  private getPayload(cohortId: number): CohortPayload {
    const r = this.db
      .prepare("SELECT payload FROM cohorts WHERE id = ?")
      .get(cohortId) as { payload: string };
    return JSON.parse(r.payload);
  }

  private getStep(cohortId: number, name: StepName): StepRow | undefined {
    const r = this.db
      .prepare("SELECT * FROM steps WHERE cohort_id = ? AND name = ?")
      .get(cohortId, name) as Record<string, unknown> | undefined;
    return r && toStep(r);
  }

  getCohort(id: number): CohortView | undefined {
    const r = this.db.prepare("SELECT * FROM cohorts WHERE id = ?").get(id) as
      | Record<string, string | number>
      | undefined;
    if (!r) return undefined;
    const steps = (
      this.db
        .prepare("SELECT * FROM steps WHERE cohort_id = ?")
        .all(id) as Record<string, unknown>[]
    )
      .map(toStep)
      .sort((x, y) => STEP_NAMES.indexOf(x.name) - STEP_NAMES.indexOf(y.name));
    const events = this.db
      .prepare(
        "SELECT id, step, type, message, at FROM events WHERE cohort_id = ? ORDER BY id",
      )
      .all(id) as EventRow[];
    const states = steps.map((s) => s.state);
    const status = states.includes("needs_attention")
      ? "needs_attention"
      : states.every((s) => s === "completed")
        ? "completed"
        : states.includes("awaiting_approval")
          ? "awaiting_approval"
          : "running";
    return {
      id: r.id as number,
      idempotencyKey: r.idempotency_key as string,
      payload: JSON.parse(r.payload as string),
      status,
      createdAt: r.created_at as string,
      steps,
      events,
    };
  }

  listCohorts(): CohortView[] {
    const ids = this.db
      .prepare("SELECT id FROM cohorts ORDER BY id DESC")
      .all() as { id: number }[];
    return ids.map((i) => this.getCohort(i.id) as CohortView);
  }
}

function toStep(r: Record<string, unknown>): StepRow {
  return {
    name: r.name as StepName,
    state: r.state as StepState,
    attempts: r.attempts as number,
    error: (r.error as string) ?? null,
    approved: r.approved === 1,
    draft: r.draft ? JSON.parse(r.draft as string) : null,
    result: (r.result as string) ?? null,
    updatedAt: r.updated_at as string,
  };
}
