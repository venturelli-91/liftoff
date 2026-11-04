import type { CohortPayload, StepName } from "./types.ts";

/**
 * Every integration is idempotent on `key`: calling run() again with a key
 * that already produced a side effect returns the same result and does not
 * repeat the effect. Real adapters would pass the key to the remote system.
 */
export interface Integration<I> {
  run(key: string, input: I): Promise<string>;
}

export type CalendarInput = {
  title: string;
  start: string;
  end: string;
  attendee: string;
};
export type LmsInput = { cohort: string; seats: number; materials: string[] };
export type MarketingInput = { title: string; body: string };
export type SalesforceInput = {
  cohort: string;
  instructor: CohortPayload["instructor"];
  seats: number;
  start: string;
  end: string;
};
export type EmailInput = { to: string; subject: string; body: string };

export type Adapters = {
  calendar: Integration<CalendarInput>;
  lms: Integration<LmsInput>;
  marketing: Integration<MarketingInput>;
  salesforce: Integration<SalesforceInput>;
  email: Integration<EmailInput>;
};

export type FailureConfig = {
  /** Fail the first N calls (use a large number for "always fails"). */
  failTimes?: number;
  /** Record the side effect, then fail anyway (simulates a lost response). */
  failAfterEffect?: boolean;
  /** Simulated latency in ms. */
  delayMs?: number;
};

export type MockIntegration<I> = Integration<I> & {
  /** key -> input of every distinct side effect actually performed. */
  effects: Map<string, I>;
  calls: number;
  /** Highest number of simultaneous in-flight calls observed. */
  maxConcurrent: number;
};

export function createMock<I>(
  name: string,
  config: FailureConfig = {},
  shared?: { inFlight: number; peak: number },
): MockIntegration<I> {
  const effects = new Map<string, I>();
  const mock: MockIntegration<I> = {
    effects,
    calls: 0,
    maxConcurrent: 0,
    async run(key, input) {
      mock.calls++;
      const n = mock.calls;
      let current = 0;
      if (shared) {
        current = ++shared.inFlight;
        shared.peak = Math.max(shared.peak, current);
      }
      try {
        if (config.delayMs) {
          await new Promise((r) => setTimeout(r, config.delayMs));
        }
        const shouldFail = n <= (config.failTimes ?? 0);
        if (shouldFail && !config.failAfterEffect) {
          throw new Error(`${name} mock failure (call ${n})`);
        }
        if (!effects.has(key)) effects.set(key, input);
        if (shouldFail) throw new Error(`${name} mock failure after effect`);
        return `${name}-${[...effects.keys()].indexOf(key) + 1}`;
      } finally {
        if (shared) shared.inFlight--;
        mock.maxConcurrent = Math.max(mock.maxConcurrent, current);
      }
    },
  };
  return mock;
}

export function createMockAdapters(
  config: Partial<Record<StepName, FailureConfig>> = {},
  shared?: { inFlight: number; peak: number },
) {
  return {
    calendar: createMock<CalendarInput>("calendar", config.calendar, shared),
    lms: createMock<LmsInput>("lms", config.lms, shared),
    marketing: createMock<MarketingInput>(
      "marketing",
      config.marketing,
      shared,
    ),
    salesforce: createMock<SalesforceInput>(
      "salesforce",
      config.salesforce,
      shared,
    ),
    email: createMock<EmailInput>("email", config.email, shared),
  };
}

/** Parses "calendar:2,salesforce:99" (fail the first N calls per step). */
export function parseFailureEnv(
  raw: string | undefined,
): Partial<Record<StepName, FailureConfig>> {
  const out: Partial<Record<StepName, FailureConfig>> = {};
  for (const part of (raw ?? "").split(",")) {
    const [name, n] = part.split(":").map((s) => s.trim());
    if (name && Number.isInteger(Number(n))) {
      out[name as StepName] = { failTimes: Number(n) };
    }
  }
  return out;
}
