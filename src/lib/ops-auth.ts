import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/** True when the request may pass. An unset or empty password disables auth. Never throws. */
export function isAuthorized(
  header: string | null | undefined,
  password: string | undefined,
): boolean {
  if (!password) return true;
  const m = /^Basic +([A-Za-z0-9+/=_-]+)$/i.exec(header ?? "");
  if (!m) return false;
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  return timingSafeEqual(sha256(decoded.slice(i + 1)), sha256(password));
}

/** A 401 Basic challenge when the request is not authorized, otherwise null. */
export function challenge(
  header: string | null | undefined,
  password: string | undefined,
): Response | null {
  if (isAuthorized(header, password)) return null;
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Liftoff ops", charset="UTF-8"',
    },
  });
}
