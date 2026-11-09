"use client";

import { useCallback, useEffect, useState } from "react";
import type { CohortView } from "@/lib/types";
import { CohortCard, type StepAction } from "./cohort-card.ts";
import { BTN_PRIMARY, INPUT } from "./ui";

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
          <ActionableCohort key={c.id} cohort={c} onAction={refresh} />
        ))}
      </div>
    </div>
  );
}

function ActionableCohort({
  cohort,
  onAction,
}: {
  cohort: CohortView;
  onAction: () => void;
}) {
  const [actionError, setActionError] = useState("");
  const act = async (step: string, action: StepAction) => {
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
  return <CohortCard cohort={cohort} act={act} actionError={actionError} />;
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
