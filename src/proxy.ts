import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthorized } from "./lib/ops-auth.ts";

export function proxy(request: NextRequest) {
  if (
    isAuthorized(
      request.headers.get("authorization"),
      process.env.LIFTOFF_OPS_PASSWORD,
    )
  ) {
    return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Liftoff ops", charset="UTF-8"',
    },
  });
}

// Allow-list: /api/health and /api/webhook/** are intentionally absent.
export const config = {
  matcher: [
    "/",
    "/audit",
    "/instructors",
    "/api/cohorts/:path*",
    "/api/cohorts",
    "/api/instructors",
    "/api/audit",
  ],
};
