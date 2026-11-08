import { getEngine } from "../../../../lib/runtime.ts";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const cohortId = Number(id);
  const cohort = Number.isInteger(cohortId)
    ? getEngine().getCohort(cohortId)
    : undefined;
  if (!cohort) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(cohort);
}
