export const STEP_NAMES = [
  "calendar",
  "lms",
  "marketing",
  "salesforce",
  "email",
] as const;
export type StepName = (typeof STEP_NAMES)[number];

/** Steps whose outward-facing action needs a human approval of the draft. */
export const APPROVAL_STEPS: readonly StepName[] = ["marketing", "email"];

export type StepState =
  | "pending"
  | "running"
  | "retrying"
  | "awaiting_approval"
  | "completed"
  | "needs_attention";

export type CohortPayload = {
  cohort: string;
  course?: string;
  startDate: string;
  endDate: string;
  instructor: { name: string; email: string };
  seats: number;
  materials: string[];
};

export type Draft = { subject: string; body: string };

export type StepRow = {
  name: StepName;
  state: StepState;
  attempts: number;
  error: string | null;
  approved: boolean;
  draft: Draft | null;
  result: string | null;
  updatedAt: string;
};

export type EventRow = {
  id: number;
  step: StepName | null;
  type: string;
  message: string;
  at: string;
};

export type CohortView = {
  id: number;
  idempotencyKey: string;
  payload: CohortPayload;
  status: "running" | "awaiting_approval" | "needs_attention" | "completed";
  createdAt: string;
  steps: StepRow[];
  events: EventRow[];
};
