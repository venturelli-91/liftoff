import { getEngine } from "@/lib/runtime";
import { STEP_NAMES, type StepName } from "@/lib/types";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string; step: string; action: string }> },
) {
  const { id, step, action } = await ctx.params;
  const cohortId = Number(id);
  if (!Number.isInteger(cohortId) || !STEP_NAMES.includes(step as StepName)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const engine = getEngine();
  let ok: boolean;
  if (action === "approve") ok = engine.approve(cohortId, step as StepName);
  else if (action === "retry") ok = engine.retry(cohortId, step as StepName);
  else return Response.json({ error: "unknown action" }, { status: 404 });
  return Response.json({ ok }, { status: ok ? 200 : 409 });
}
