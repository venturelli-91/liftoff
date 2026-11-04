import { createMockAdapters, parseFailureEnv } from "./adapters.ts";
import { templateDrafter } from "./drafter.ts";
import { Engine } from "./engine.ts";

const g = globalThis as unknown as { __liftoffEngine?: Engine };

/**
 * One long-lived engine per server process. Swap the adapters/drafter here
 * to change integrations; the orchestration code does not change.
 * Mock failures: LIFTOFF_MOCK_FAILURES="calendar:2,salesforce:99".
 */
export function getEngine(): Engine {
  if (!g.__liftoffEngine) {
    const failures = parseFailureEnv(process.env.LIFTOFF_MOCK_FAILURES);
    const delays = { delayMs: 300 };
    const config = {
      calendar: { ...delays, ...failures.calendar },
      lms: { ...delays, ...failures.lms },
      marketing: { ...delays, ...failures.marketing },
      salesforce: { ...delays, ...failures.salesforce },
      email: { ...delays, ...failures.email },
    };
    g.__liftoffEngine = new Engine(
      createMockAdapters(config),
      templateDrafter,
      process.env.LIFTOFF_DB ?? "liftoff.db",
    );
    g.__liftoffEngine.resume();
  }
  return g.__liftoffEngine;
}
