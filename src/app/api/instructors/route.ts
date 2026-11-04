import { getInstructorStore } from "@/lib/instructors";
import {
  createInstructor,
  listInstructors,
  readJson,
} from "@/lib/instructors-api";

export async function GET(request: Request) {
  void request.url; // opt into dynamic rendering
  const r = listInstructors(getInstructorStore());
  return Response.json(r.body, { status: r.status });
}

export async function POST(request: Request) {
  const r = createInstructor(getInstructorStore(), await readJson(request));
  return Response.json(r.body, { status: r.status });
}
