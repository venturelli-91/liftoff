import { type CohortPayload, STEP_NAMES, type StepName } from "./types.ts";

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
  /** Simulated latency in ms. */
  delayMs?: number;
};

export type MockIntegration<I> = Integration<I> & {
  /** key -> input of every distinct side effect actually performed. */
  effects: Map<string, I>;
  calls: number;
};

export function createMock<I>(
  name: string,
  config: FailureConfig = {},
): MockIntegration<I> {
  const effects = new Map<string, I>();
  const mock: MockIntegration<I> = {
    effects,
    calls: 0,
    async run(key, input) {
      const n = ++mock.calls;
      if (config.delayMs) {
        await new Promise((r) => setTimeout(r, config.delayMs));
      }
      if (n <= (config.failTimes ?? 0)) {
        throw new Error(`${name} mock failure (call ${n})`);
      }
      if (!effects.has(key)) effects.set(key, input);
      return `${name}-${[...effects.keys()].indexOf(key) + 1}`;
    },
  };
  return mock;
}

type Mocks = { [K in StepName]: MockIntegration<InputOf<Adapters[K]>> };
type InputOf<T> = T extends Integration<infer I> ? I : never;

export function createMockAdapters(
  config: Partial<Record<StepName, FailureConfig>> = {},
): Mocks {
  return Object.fromEntries(
    STEP_NAMES.map((n) => [n, createMock(n, config[n])]),
  ) as Mocks;
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
