import type { CohortView } from "./types.ts";

export type AuditEntry = {
  time: string;
  cohort: string;
  step: string | null;
  event: string;
  detail: string;
};

export type AuditFilter = { cohort?: string | null; step?: string | null };

// Flattens cohort.events across cohorts, filters and sorts newest first.
export function buildAudit(
  cohorts: CohortView[],
  filter: AuditFilter = {},
): AuditEntry[] {
  const rows: (AuditEntry & { id: number; cohortId: number })[] = [];
  for (const c of cohorts) {
    if (filter.cohort && c.payload.cohort !== filter.cohort) continue;
    for (const e of c.events) {
      if (filter.step && e.step !== filter.step) continue;
      rows.push({
        time: e.at,
        cohort: c.payload.cohort,
        step: e.step,
        event: e.type,
        detail: e.message,
        id: e.id,
        cohortId: c.id,
      });
    }
  }
  rows.sort(
    (a, b) =>
      b.time.localeCompare(a.time) || b.cohortId - a.cohortId || b.id - a.id,
  );
  return rows.map(({ id: _id, cohortId: _cid, ...entry }) => entry);
}
