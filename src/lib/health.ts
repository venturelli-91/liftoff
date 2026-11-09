/** `checkDb` runs a trivial query and throws if the store is unavailable. */
export function checkHealth(checkDb: () => void) {
  const sha = process.env.LIFTOFF_SHA ?? null;
  try {
    checkDb();
  } catch {
    return {
      status: 503,
      body: { status: "degraded", db: "error", sha },
    };
  }
  return {
    status: 200,
    body: { status: "ok", db: "ok", uptime_s: process.uptime(), sha },
  };
}
