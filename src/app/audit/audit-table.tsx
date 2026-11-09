"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/audit";
import { CARD, INPUT, TD, TH } from "../ui";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <input
          className={`${INPUT} sm:w-56`}
          placeholder="Cohort"
          aria-label="Cohort"
          value={cohort}
          onChange={(e) => setCohort(e.target.value)}
        />
        <select
          className={`${INPUT} sm:w-56`}
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
      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={TH}>Time</th>
              <th className={TH}>Cohort</th>
              <th className={TH}>Step</th>
              <th className={TH}>Event</th>
              <th className={TH}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className={`${TD} text-fg-3`}>
                  No audit entries
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: rows have no unique id in the API
                key={i}
                className="border-t border-line"
              >
                <td
                  className={`${TD} whitespace-nowrap font-mono text-xs text-fg-3 tabular-nums`}
                >
                  {r.time}
                </td>
                <td className={TD}>{r.cohort}</td>
                <td className={TD}>{r.step ?? "-"}</td>
                <td className={TD}>{r.event}</td>
                <td className={TD}>{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
