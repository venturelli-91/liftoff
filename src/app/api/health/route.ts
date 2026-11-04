import { checkHealth } from "@/lib/health";
import { getEngine } from "@/lib/runtime";

export async function GET(request: Request) {
  void request.url; // opt into dynamic rendering
  const r = checkHealth({
    checkDb: () => {
      getEngine().db.prepare("SELECT 1").get();
    },
  });
  return Response.json(r.body, { status: r.status });
}
