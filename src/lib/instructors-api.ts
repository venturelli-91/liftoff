import { DuplicateEmailError, type InstructorStore } from "./instructors.ts";
import { validateInstructor } from "./validate.ts";

export type ApiResult = { status: number; body: unknown };

function invalid(errors: unknown): ApiResult {
  return { status: 400, body: { error: "invalid input", errors } };
}

export function listInstructors(store: InstructorStore): ApiResult {
  return { status: 200, body: store.list() };
}

export function createInstructor(
  store: InstructorStore,
  body: unknown,
): ApiResult {
  const v = validateInstructor(body);
  if (!v.ok) return invalid(v.errors);
  try {
    return { status: 201, body: store.create(v.value) };
  } catch (e) {
    if (e instanceof DuplicateEmailError)
      return {
        status: 409,
        body: { error: "email already in use", field: "email" },
      };
    throw e;
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
