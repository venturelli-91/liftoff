import type { CohortPayload } from "./types.ts";

export type FieldError = { field: string; message: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDate(v: unknown): v is string {
  return typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v));
}

export const BIO_MAX = 2000;

function text(errors: FieldError[], field: string, v: unknown) {
  if (typeof v !== "string" || !v.trim() || v.length > 200) {
    errors.push({ field, message: "must be a non-empty string (max 200)" });
    return "";
  }
  return v.trim();
}

function email(errors: FieldError[], field: string, v: unknown) {
  const e = typeof v === "string" ? v.trim() : "";
  if (!EMAIL.test(e) || e.length > 200)
    errors.push({ field, message: "must be a valid email" });
  return e;
}

export function validateInstructor(
  input: unknown,
):
  | { ok: true; value: { name: string; email: string; bio: string } }
  | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const o = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const name = text(errors, "name", o.name);
  const mail = email(errors, "email", o.email);
  let bio = "";
  if (o.bio !== undefined && o.bio !== null) {
    if (typeof o.bio !== "string" || o.bio.length > BIO_MAX)
      errors.push({ field: "bio", message: `must be text (max ${BIO_MAX})` });
    else bio = o.bio.trim();
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { name, email: mail, bio } };
}

export function validatePayload(
  input: unknown,
): { ok: true; value: CohortPayload } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const o = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const cohort = text(errors, "cohort", o.cohort);
  let course: string | undefined;
  if (o.course !== undefined && o.course !== "")
    course = text(errors, "course", o.course);
  if (!isDate(o.startDate))
    errors.push({ field: "startDate", message: "must be a date YYYY-MM-DD" });
  if (!isDate(o.endDate))
    errors.push({ field: "endDate", message: "must be a date YYYY-MM-DD" });
  if (isDate(o.startDate) && isDate(o.endDate) && o.endDate < o.startDate)
    errors.push({ field: "endDate", message: "must not be before startDate" });

  const ins = (
    o.instructor && typeof o.instructor === "object" ? o.instructor : {}
  ) as Record<string, unknown>;
  const name = text(errors, "instructor.name", ins.name);
  const mail = email(errors, "instructor.email", ins.email);

  if (
    !Number.isInteger(o.seats) ||
    (o.seats as number) < 1 ||
    (o.seats as number) > 1000
  )
    errors.push({ field: "seats", message: "must be an integer 1-1000" });

  const materials = Array.isArray(o.materials) ? o.materials : null;
  if (
    !materials ||
    materials.length > 50 ||
    !materials.every(
      (m) => typeof m === "string" && m.trim() && m.length <= 200,
    )
  )
    errors.push({
      field: "materials",
      message: "must be a list of non-empty strings (max 50)",
    });
  else {
    const norm = (materials as string[]).map((m) => m.trim().toLowerCase());
    if (new Set(norm).size !== norm.length)
      errors.push({
        field: "materials",
        message: "must not contain duplicates",
      });
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      cohort,
      course,
      startDate: o.startDate as string,
      endDate: o.endDate as string,
      instructor: { name, email: mail },
      seats: o.seats as number,
      materials: (materials as string[]).map((m) => m.trim()),
    },
  };
}
