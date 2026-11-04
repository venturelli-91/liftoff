import { getEngine } from "@/lib/runtime";
import { handleTrigger, secretMatches } from "@/lib/trigger";

// Auth: header `x-liftoff-secret` must equal env LIFTOFF_WEBHOOK_SECRET.
// If the env var is not set, every request is rejected.
export async function POST(request: Request) {
  if (
    !secretMatches(
      request.headers.get("x-liftoff-secret"),
      process.env.LIFTOFF_WEBHOOK_SECRET,
    )
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const r = handleTrigger(
    getEngine(),
    body,
    request.headers.get("idempotency-key"),
  );
  return Response.json(r.body, { status: r.status });
}
