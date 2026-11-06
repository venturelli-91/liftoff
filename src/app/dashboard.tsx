"use client";

import { useCallback, useEffect, useState } from "react";
import type { CohortView, StepRow, StepState } from "@/lib/types";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "./ui";

const LABELS: Record<string, string> = {
  calendar: "Calendar event",
  lms: "LMS environment",
  marketing: "Landing page notice",
  salesforce: "Salesforce record",
  email: "Welcome email",
};

const DOT: Record<StepState, string> = {
  pending: "ring-1 ring-fg-3",
  running: "bg-fg motion-safe:animate-pulse",
  retrying: "bg-fg motion-safe:animate-pulse",
  awaiting_approval: "bg-accent",
  completed: "bg-pos",
  needs_attention: "bg-neg",
};

const EDGE: Record<StepState, string> = {
  pending: "bg-line",
  running: "bg-line",
  retrying: "bg-line",
  awaiting_approval: "bg-accent",
  completed: "bg-pos",
  needs_attention: "bg-neg",
};

const label = (s: string) => s.replace(/_/g, " ");

function Dot({ state }: { state: StepState }) {
  return (
    <span
      aria-hidden
      className={`size-2 shrink-0 rounded-full ${DOT[state]}`}
    />
  );
}

export default function Dashboard() {
  const [cohorts, setCohorts] = useState<CohortView[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cohorts", { cache: "no-store" });
    if (res.ok) setCohorts(await res.json());
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
      <TriggerForm onDone={refresh} />
      <div className="flex flex-col gap-6">
        {cohorts.length === 0 && <p className="text-fg-3">No cohorts yet</p>}
        {cohorts.map((c) => (
          <CohortCard key={c.id} cohort={c} onAction={refresh} />
        ))}
      </div>
    </div>
  );
}

function TriggerForm({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [errors, setErrors] = useState<{ field: string; message: string }[]>(
    [],
  );
  const [info, setInfo] = useState("");
  useEffect(() => setKey(crypto.randomUUID()), []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (n: string) => String(f.get(n) ?? "");
    const res = await fetch("/api/cohorts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: key,
        cohort: s("cohort"),
        course: s("course"),
        startDate: s("startDate"),
        endDate: s("endDate"),
        instructor: { name: s("instructorName"), email: s("instructorEmail") },
        seats: Number(s("seats")),
        materials: s("materials")
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      }),
    });
    const data = await res.json();
    setErrors(data.errors ?? []);
    if (res.ok) {
      setInfo(data.duplicate ? "Duplicate ignored" : "Cohort triggered");
      setKey(crypto.randomUUID());
      (e.target as HTMLFormElement).reset();
      onDone();
    } else setInfo("");
  }

  const field = (text: string, name: string, extra = {}) => (
    <label className="flex flex-col gap-2 text-[13px] text-fg-2">
      {text}
      <input name={name} className={INPUT} {...extra} />
    </label>
  );
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5"
    >
      <h2 className="text-base font-medium">Confirm a cohort</h2>
      {field("Cohort", "cohort")}
      {field("Course (optional)", "course")}
      {field("Start date", "startDate", { type: "date" })}
      {field("End date", "endDate", { type: "date" })}
      {field("Instructor name", "instructorName")}
      {field("Instructor email", "instructorEmail", { type: "email" })}
      {field("Seats", "seats", { type: "number", min: 1 })}
      {field("Materials (comma separated)", "materials")}
      {errors.length > 0 && (
        <ul className="text-[13px] text-neg" role="alert">
          {errors.map((er) => (
            <li key={er.field}>
              {er.field}: {er.message}
            </li>
          ))}
        </ul>
      )}
      {info && <p className="text-[13px] text-fg-2">{info}</p>}
      <button type="submit" className={BTN_PRIMARY}>
        Start onboarding
      </button>
    </form>
  );
}

function CohortCard({
  cohort,
  onAction,
}: {
  cohort: CohortView;
  onAction: () => void;
}) {
  const [actionError, setActionError] = useState("");
  const act = async (step: string, action: "approve" | "retry") => {
    setActionError("");
    try {
      const res = await fetch(
        `/api/cohorts/${cohort.id}/steps/${step}/${action}`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(data?.error ?? `${action} failed (${res.status})`);
      }
    } catch {
      setActionError(`${action} failed: network error`);
    }
    onAction();
  };
  const p = cohort.payload;
  return (
    <section className="rise rounded-xl border border-line bg-card p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-medium">{p.cohort}</h2>
          <p className="text-[13px] text-fg-3">
            <span className="font-mono tabular-nums">
              {p.startDate} → {p.endDate}
            </span>{" "}
            · {p.seats} seats · {p.instructor.name}
          </p>
        </div>
        <span className="flex items-center gap-2 text-[13px] text-fg-2">
          <Dot state={cohort.status} />
          {label(cohort.status)}
        </span>
      </header>

      {actionError && (
        <p role="alert" className="mb-4 text-[13px] text-neg">
          {actionError}
        </p>
      )}

      {/* Graph: trigger node fans out to the five parallel steps */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-0">
        <div className="rounded-lg border border-line bg-raised px-4 py-3 font-medium md:w-40 md:shrink-0">
          Cohort confirmed
        </div>
        <div className="hidden h-px w-6 bg-line md:block" aria-hidden />
        <ul className="flex flex-1 flex-col gap-2 md:pl-6">
          {cohort.steps.map((s, i) => (
            <StepNode
              key={s.name}
              step={s}
              act={act}
              first={i <= (cohort.steps.length - 1) / 2}
              last={i >= (cohort.steps.length - 1) / 2}
            />
          ))}
        </ul>
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-[13px] text-fg-2 transition-colors hover:text-fg">
          Audit log ({cohort.events.length})
        </summary>
        <ol className="mt-3 font-mono text-xs leading-5 text-fg-3">
          {cohort.events.map((e) => (
            <li key={e.id}>
              {e.at.slice(11, 23)} {e.step ?? "cohort"} [{e.type}] {e.message}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function StepNode({
  step,
  act,
  first,
  last,
}: {
  step: StepRow;
  act: (step: string, action: "approve" | "retry") => void;
  first: boolean;
  last: boolean;
}) {
  const edge = EDGE[step.state];
  return (
    <li className="relative rounded-lg border border-line bg-raised px-3 py-2">
      <span
        aria-hidden
        className={`absolute top-[18px] -left-6 hidden h-px w-6 md:block ${edge}`}
      />
      {first && (
        <span
          aria-hidden
          className={`absolute top-[18px] -bottom-2 -left-6 hidden w-px md:block ${edge}`}
        />
      )}
      {last && (
        <span
          aria-hidden
          className={`absolute -top-2 -left-6 hidden h-[26px] w-px md:block ${edge}`}
        />
      )}
      <div className="flex items-center gap-2">
        <Dot state={step.state} />
        <span className="font-medium">{LABELS[step.name]}</span>
        <span className="ml-auto font-mono text-xs text-fg-3">
          {label(step.state)}
          {step.attempts > 0 && ` · attempt ${step.attempts}`}
        </span>
      </div>
      {step.error && step.state !== "completed" && (
        <p className="mt-2 text-[13px] text-neg">{step.error}</p>
      )}
      {step.state === "awaiting_approval" && step.draft && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[13px] font-medium">{step.draft.subject}</p>
          <pre className="font-sans text-[13px] leading-5 whitespace-pre-wrap text-fg-2">
            {step.draft.body}
          </pre>
          <button
            type="button"
            onClick={() => act(step.name, "approve")}
            className={`${BTN_PRIMARY} self-start`}
          >
            Approve
          </button>
        </div>
      )}
      {step.state === "needs_attention" && (
        <button
          type="button"
          onClick={() => act(step.name, "retry")}
          className={`${BTN_SECONDARY} mt-3`}
        >
          Retry
        </button>
      )}
    </li>
  );
}
