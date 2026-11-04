import { DuplicateEmailError, type InstructorStore } from "./instructors.ts";
import { validateInstructor } from "./validate.ts";

export type ApiResult = { status: number; body: unknown };

function save(fn: () => unknown): ApiResult {
  try {
    const row = fn();
    if (row === undefined)
      return { status: 404, body: { error: "instructor not found" } };
    return { status: 200, body: row };
  } catch (e) {
    if (e instanceof DuplicateEmailError)
      return {
        status: 409,
        body: { error: "email already in use", field: "email" },
      };
    throw e;
  }
}

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
  const r = save(() => store.create(v.value));
  return r.status === 200 ? { status: 201, body: r.body } : r;
}

/** PUT/PATCH: the body is merged over the existing row, then validated. */
export function updateInstructor(
  store: InstructorStore,
  idParam: string,
  body: unknown,
): ApiResult {
  const id = Number(idParam);
  const existing = Number.isInteger(id) ? store.get(id) : undefined;
  if (!existing)
    return { status: 404, body: { error: "instructor not found" } };
  const patch = body && typeof body === "object" ? body : {};
  const v = validateInstructor({ ...existing, ...patch });
  if (!v.ok) return invalid(v.errors);
  return save(() => store.update(id, v.value));
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
