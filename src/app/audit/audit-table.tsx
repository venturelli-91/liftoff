"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/audit";

const STEPS = ["calendar", "lms", "marketing", "salesforce", "email"];

export default function AuditTable() {
  const [cohort, setCohort] = useState("");
  const [step, setStep] = useState("");
  const [rows, setRows] = useState<AuditEntry[]>([]);

  const refresh = useCallback(async () => {
    const q = new URLSearchParams();
    if (cohort) q.set("cohort", cohort);
    if (step) q.set("step", step);
    const res = await fetch(`/api/audit?${q}`, { cache: "no-store" });
    if (res.ok) setRows(await res.json());
  }, [cohort, step]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const input =
    "rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <input
          className={input}
          placeholder="Cohort"
          aria-label="Cohort"
          value={cohort}
          onChange={(e) => setCohort(e.target.value)}
        />
        <select
          className={input}
          aria-label="Step"
          value={step}
          onChange={(e) => setStep(e.target.value)}
        >
          <option value="">All steps</option>
          {STEPS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Cohort</th>
              <th className="px-3 py-2">Step</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-zinc-500">
                  No audit entries.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: rows have no unique id in the API
                key={i}
                className="border-t border-zinc-100"
              >
                <td className="whitespace-nowrap px-3 py-2">{r.time}</td>
                <td className="px-3 py-2">{r.cohort}</td>
                <td className="px-3 py-2">{r.step ?? "-"}</td>
                <td className="px-3 py-2">{r.event}</td>
                <td className="px-3 py-2">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
