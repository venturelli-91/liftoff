import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { challenge } from "./lib/ops-auth.ts";

export function proxy(request: NextRequest) {
  return (
    challenge(
      request.headers.get("authorization"),
      process.env.LIFTOFF_OPS_PASSWORD,
    ) ?? NextResponse.next()
  );
}

// Allow-list: /api/health and /api/webhook/** are intentionally absent.
export const config = {
  matcher: [
    "/",
    "/audit",
    "/instructors",
    "/api/cohorts/:path*",
    "/api/instructors",
    "/api/audit",
  ],
};
