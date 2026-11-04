import { getEngine } from "@/lib/runtime";
import { handleTrigger } from "@/lib/trigger";

export async function GET(request: Request) {
  void request.url; // opt into dynamic rendering
  return Response.json(getEngine().listCohorts());
}

// UI form entry point (the form sends its own idempotency key).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const r = handleTrigger(getEngine(), body, null);
  return Response.json(r.body, { status: r.status });
}
