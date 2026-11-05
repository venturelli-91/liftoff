export type HealthDeps = {
  /** Runs a trivial query; throws if the store is unavailable. */
  checkDb: () => void;
  /** Process uptime in seconds. */
  uptime?: () => number;
  /** Build/commit identifier (LIFTOFF_SHA); null when unset. */
  sha?: string | null;
};

export type HealthResult =
  | {
      status: 200;
      body: {
        status: "ok";
        db: "ok";
        uptime_s: number;
        sha: string | null;
      };
    }
  | {
      status: 503;
      body: { status: "degraded"; db: "error"; sha: string | null };
    };

export function checkHealth(deps: HealthDeps): HealthResult {
  const sha = deps.sha ?? null;
  try {
    deps.checkDb();
  } catch {
    return { status: 503, body: { status: "degraded", db: "error", sha } };
  }
  const uptime_s = (deps.uptime ?? process.uptime)();
  return { status: 200, body: { status: "ok", db: "ok", uptime_s, sha } };
}
