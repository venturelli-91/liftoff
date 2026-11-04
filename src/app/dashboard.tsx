"use client";

import { useCallback, useEffect, useState } from "react";
import type { CohortView, StepRow, StepState } from "@/lib/types";

const LABELS: Record<string, string> = {
  calendar: "Calendar event",
  lms: "LMS environment",
  marketing: "Landing page notice",
  salesforce: "Salesforce record",
  email: "Welcome email",
};

const COLORS: Record<StepState, string> = {
  pending: "border-zinc-300 bg-zinc-50 text-zinc-700",
  running: "border-blue-400 bg-blue-50 text-blue-800",
  retrying: "border-amber-400 bg-amber-50 text-amber-800",
  awaiting_approval: "border-violet-400 bg-violet-50 text-violet-800",
  completed: "border-emerald-400 bg-emerald-50 text-emerald-800",
  needs_attention: "border-red-500 bg-red-50 text-red-800",
};

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
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <TriggerForm onDone={refresh} />
      <div className="flex flex-col gap-6">
        {cohorts.length === 0 && (
          <p className="text-zinc-500">No cohorts yet. Submit the form.</p>
        )}
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

  const input = "w-full rounded border border-zinc-300 px-2 py-1.5 text-sm";
  const field = (label: string, name: string, extra = {}) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input name={name} className={input} {...extra} />
    </label>
  );
  return (
    <form
      onSubmit={submit}
      className="flex h-fit flex-col gap-3 rounded-lg border border-zinc-200 p-4"
    >
      <h2 className="font-semibold">Confirm a cohort</h2>
      {field("Cohort", "cohort")}
      {field("Course (optional)", "course")}
      {field("Start date", "startDate", { type: "date" })}
      {field("End date", "endDate", { type: "date" })}
      {field("Instructor name", "instructorName")}
      {field("Instructor email", "instructorEmail", { type: "email" })}
      {field("Seats", "seats", { type: "number", min: 1 })}
      {field("Materials (comma separated)", "materials")}
      {errors.length > 0 && (
        <ul className="text-sm text-red-700" role="alert">
          {errors.map((er) => (
            <li key={er.field}>
              {er.field}: {er.message}
            </li>
          ))}
        </ul>
      )}
      {info && <p className="text-sm text-emerald-700">{info}</p>}
      <button
        type="submit"
        className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
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
    <section className="rounded-lg border border-zinc-200 p-4">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold">{p.cohort}</h2>
          <p className="text-sm text-zinc-500">
            {p.startDate} → {p.endDate} · {p.seats} seats · {p.instructor.name}
          </p>
        </div>
        <span
          className={`rounded border px-2 py-0.5 text-xs font-medium ${
            cohort.status === "needs_attention"
              ? COLORS.needs_attention
              : cohort.status === "completed"
                ? COLORS.completed
                : COLORS.running
          }`}
        >
          {cohort.status.replace("_", " ")}
        </span>
      </header>

      {actionError && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {/* Graph: trigger node fans out to the five parallel steps */}
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="rounded border border-zinc-400 bg-zinc-100 px-3 py-2 text-center text-sm font-medium">
          Cohort confirmed
        </div>
        <div className="hidden h-px w-6 bg-zinc-400 md:block" aria-hidden />
        <ul className="grid flex-1 gap-2 border-zinc-400 sm:grid-cols-2 md:border-l md:pl-3 xl:grid-cols-3">
          {cohort.steps.map((s) => (
            <StepNode key={s.name} step={s} act={act} />
          ))}
        </ul>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium">
          Audit log ({cohort.events.length})
        </summary>
        <ol className="mt-2 max-h-64 overflow-auto font-mono text-xs">
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
}: {
  step: StepRow;
  act: (step: string, action: "approve" | "retry") => void;
}) {
  return (
    <li className={`rounded border p-2 text-sm ${COLORS[step.state]}`}>
      <div className="font-medium">{LABELS[step.name]}</div>
      <div className="text-xs">
        {step.state.replace("_", " ")}
        {step.attempts > 0 && ` · attempt ${step.attempts}`}
      </div>
      {step.error && step.state !== "completed" && (
        <div className="mt-1 text-xs">{step.error}</div>
      )}
      {step.state === "awaiting_approval" && step.draft && (
        <div className="mt-2">
          <p className="text-xs font-semibold">{step.draft.subject}</p>
          <pre className="whitespace-pre-wrap text-xs">{step.draft.body}</pre>
          <button
            type="button"
            onClick={() => act(step.name, "approve")}
            className="mt-2 rounded bg-violet-700 px-2 py-1 text-xs text-white"
          >
            Approve
          </button>
        </div>
      )}
      {step.state === "needs_attention" && (
        <>
          <p className="mt-1 text-xs font-bold">⚠ Needs attention</p>
          <button
            type="button"
            onClick={() => act(step.name, "retry")}
            className="mt-1 rounded bg-red-700 px-2 py-1 text-xs text-white"
          >
            Retry
          </button>
        </>
      )}
    </li>
  );
}
