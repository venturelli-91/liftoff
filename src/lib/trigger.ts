import { timingSafeEqual } from "node:crypto";
import type { Engine } from "./engine.ts";
import { validatePayload } from "./validate.ts";

export function secretMatches(given: string | null, expected: string | undefined) {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Shared by the webhook and the UI form. Returns a plain status + body. */
export function handleTrigger(
  engine: Engine,
  body: unknown,
  headerKey: string | null,
): { status: number; body: unknown } {
  const v = validatePayload(body);
  if (!v.ok) return { status: 422, body: { errors: v.errors } };
  const supplied = (body as { idempotencyKey?: unknown }).idempotencyKey;
  const key =
    headerKey ||
    (typeof supplied === "string" && supplied.trim()) ||
    `${v.value.cohort}|${v.value.startDate}|${v.value.instructor.email}`.toLowerCase();
  const r = engine.trigger(v.value, key);
  return { status: r.duplicate ? 200 : 201, body: r };
}
