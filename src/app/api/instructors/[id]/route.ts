import { getInstructorStore } from "@/lib/instructors";
import { readJson, updateInstructor } from "@/lib/instructors-api";

type Ctx = { params: Promise<{ id: string }> };

async function handle(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const r = updateInstructor(getInstructorStore(), id, await readJson(request));
  return Response.json(r.body, { status: r.status });
}

export const PATCH = handle;
export const PUT = handle;
