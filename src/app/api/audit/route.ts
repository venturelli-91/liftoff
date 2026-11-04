import { buildAudit } from "@/lib/audit";
import { getEngine } from "@/lib/runtime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return Response.json(
    buildAudit(getEngine().listCohorts(), {
      cohort: searchParams.get("cohort"),
      step: searchParams.get("step"),
    }),
  );
}
