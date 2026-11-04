export type HealthDeps = {
  /** Runs a trivial query; throws if the store is unavailable. */
  checkDb: () => void;
  /** Process uptime in seconds. */
  uptime?: () => number;
};

export type HealthResult =
  | { status: 200; body: { status: "ok"; db: "ok"; uptime_s: number } }
  | { status: 503; body: { status: "degraded"; db: "error" } };

export function checkHealth(deps: HealthDeps): HealthResult {
  try {
    deps.checkDb();
  } catch {
    return { status: 503, body: { status: "degraded", db: "error" } };
  }
  const uptime_s = (deps.uptime ?? process.uptime)();
  return { status: 200, body: { status: "ok", db: "ok", uptime_s } };
}
