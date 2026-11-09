import { createElement as h } from "react";
import type { CohortView, StepRow, StepState } from "@/lib/types";
import { BTN_PRIMARY, BTN_SECONDARY } from "./ui.ts";

export type StepAction = "approve" | "retry";
export type Act = (step: string, action: StepAction) => void;

export const LABELS: Record<string, string> = {
  calendar: "Calendar event",
  lms: "LMS environment",
  marketing: "Landing page notice",
  salesforce: "Salesforce record",
  email: "Welcome email",
};

export const DOT: Record<StepState, string> = {
  pending: "ring-1 ring-fg-3",
  running: "bg-fg motion-safe:animate-pulse",
  retrying: "bg-fg motion-safe:animate-pulse",
  awaiting_approval: "bg-accent",
  completed: "bg-pos",
  needs_attention: "bg-neg",
};

export const EDGE: Record<StepState, string> = {
  pending: "bg-line",
  running: "bg-line",
  retrying: "bg-line",
  awaiting_approval: "bg-accent",
  completed: "bg-pos",
  needs_attention: "bg-neg",
};

export const label = (s: string) => s.replace(/_/g, " ");

export function Dot({ state }: { state: StepState }) {
  return h("span", {
    "aria-hidden": true,
    className: `size-2 shrink-0 rounded-full ${DOT[state]}`,
  });
}

export function CohortCard({
  cohort,
  act,
  actionError = "",
}: {
  cohort: CohortView;
  act: Act;
  actionError?: string;
}) {
  const p = cohort.payload;
  const mid = (cohort.steps.length - 1) / 2;
  return h(
    "section",
    { className: "rise rounded-xl border border-line bg-card p-6" },
    h(
      "header",
      {
        className: "mb-6 flex flex-wrap items-start justify-between gap-2",
      },
      h(
        "div",
        null,
        h("h2", { className: "text-base font-medium" }, p.cohort),
        h(
          "p",
          { className: "text-[13px] text-fg-3" },
          h(
            "span",
            { className: "font-mono tabular-nums" },
            `${p.startDate} → ${p.endDate}`,
          ),
          " ",
          `· ${p.seats} seats · ${p.instructor.name}`,
        ),
      ),
      h(
        "span",
        { className: "flex items-center gap-2 text-[13px] text-fg-2" },
        h(Dot, { state: cohort.status }),
        label(cohort.status),
      ),
    ),
    actionError
      ? h(
          "p",
          { role: "alert", className: "mb-4 text-[13px] text-neg" },
          actionError,
        )
      : null,
    // Graph: trigger node fans out to the five parallel steps
    h(
      "div",
      { className: "flex flex-col gap-4 md:flex-row md:items-center md:gap-0" },
      h(
        "div",
        {
          className:
            "rounded-lg border border-line bg-raised px-4 py-3 font-medium md:w-40 md:shrink-0",
        },
        "Cohort confirmed",
      ),
      h("div", {
        className: "hidden h-px w-6 bg-line md:block",
        "aria-hidden": true,
      }),
      h(
        "ul",
        { className: "flex flex-1 flex-col gap-2 md:pl-6" },
        cohort.steps.map((s, i) =>
          h(StepNode, {
            key: s.name,
            step: s,
            act,
            first: i <= mid,
            last: i >= mid,
          }),
        ),
      ),
    ),
    h(
      "details",
      { className: "mt-6" },
      h(
        "summary",
        {
          className:
            "cursor-pointer text-[13px] text-fg-2 transition-colors hover:text-fg",
        },
        `Audit log (${cohort.events.length})`,
      ),
      h(
        "ol",
        { className: "mt-3 font-mono text-xs leading-5 text-fg-3" },
        cohort.events.map((e) =>
          h(
            "li",
            { key: e.id },
            `${e.at.slice(11, 23)} ${e.step ?? "cohort"} [${e.type}] ${e.message}`,
          ),
        ),
      ),
    ),
  );
}

export function StepNode({
  step,
  act,
  first,
  last,
}: {
  step: StepRow;
  act: Act;
  first: boolean;
  last: boolean;
}) {
  const edge = EDGE[step.state];
  return h(
    "li",
    { className: "relative rounded-lg border border-line bg-raised px-3 py-2" },
    h("span", {
      "aria-hidden": true,
      className: `absolute top-[18px] -left-6 hidden h-px w-6 md:block ${edge}`,
    }),
    first
      ? h("span", {
          "aria-hidden": true,
          className: `absolute top-[18px] -bottom-2 -left-6 hidden w-px md:block ${edge}`,
        })
      : null,
    last
      ? h("span", {
          "aria-hidden": true,
          className: `absolute -top-2 -left-6 hidden h-[26px] w-px md:block ${edge}`,
        })
      : null,
    h(
      "div",
      { className: "flex items-center gap-2" },
      h(Dot, { state: step.state }),
      h("span", { className: "font-medium" }, LABELS[step.name]),
      h(
        "span",
        { className: "ml-auto font-mono text-xs text-fg-3" },
        label(step.state),
        step.attempts > 0 ? ` · attempt ${step.attempts}` : null,
      ),
    ),
    step.error && step.state !== "completed"
      ? h("p", { className: "mt-2 text-[13px] text-neg" }, step.error)
      : null,
    step.state === "awaiting_approval" && step.draft
      ? h(
          "div",
          { className: "mt-3 flex flex-col gap-2" },
          h("p", { className: "text-[13px] font-medium" }, step.draft.subject),
          h(
            "pre",
            {
              className:
                "font-sans text-[13px] leading-5 whitespace-pre-wrap text-fg-2",
            },
            step.draft.body,
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () => act(step.name, "approve"),
              className: `${BTN_PRIMARY} self-start`,
            },
            "Approve",
          ),
        )
      : null,
    step.state === "needs_attention"
      ? h(
          "button",
          {
            type: "button",
            onClick: () => act(step.name, "retry"),
            className: `${BTN_SECONDARY} mt-3`,
          },
          "Retry",
        )
      : null,
  );
}
