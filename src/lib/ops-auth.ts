import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/** True when the request may pass. An unset or empty password disables auth. Never throws. */
export function isAuthorized(
  header: string | null | undefined,
  password: string | undefined,
): boolean {
  if (!password) return true;
  try {
    const m = /^Basic +([A-Za-z0-9+/=_-]+)$/i.exec(header ?? "");
    if (!m) return false;
    const decoded = Buffer.from(m[1], "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i < 0) return false;
    return timingSafeEqual(sha256(decoded.slice(i + 1)), sha256(password));
  } catch {
    return false;
  }
}
