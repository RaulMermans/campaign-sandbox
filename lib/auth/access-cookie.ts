// Internal access-gate helpers. Safe to import from middleware (Edge runtime)
// and server-side route handlers (Node runtime) — uses only Web Crypto APIs.
//
// The configured password is never stored in the cookie. The cookie holds a
// signed static marker so the raw password value is never written to the
// client, even in an httpOnly cookie.

export const ACCESS_COOKIE_NAME = "campaign_sandbox_access";
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ACCESS_MARKER = "campaign-sandbox-access-v1";

async function hmacHex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time comparison for equal-length strings (hex digests).
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isPasswordProtectionDisabled(): boolean {
  return (
    process.env.DISABLE_INTERNAL_PASSWORD === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function isAccessPasswordConfigured(): boolean {
  return (process.env.INTERNAL_APP_PASSWORD ?? "").length > 0;
}

// Signs a static marker with the configured password. Returns null when no
// password is configured.
export async function getAccessToken(): Promise<string | null> {
  const password = process.env.INTERNAL_APP_PASSWORD;
  if (!password) return null;
  return `${ACCESS_MARKER}.${await hmacHex(password, ACCESS_MARKER)}`;
}

// Compares signed markers so the configured password is never returned.
export async function passwordMatchesConfigured(candidate: string): Promise<boolean> {
  const password = process.env.INTERNAL_APP_PASSWORD;
  if (!password) return false;
  const [candidateHash, configuredHash] = await Promise.all([
    hmacHex(candidate, ACCESS_MARKER),
    hmacHex(password, ACCESS_MARKER),
  ]);
  return constantTimeEqual(candidateHash, configuredHash);
}

// Validates a cookie token against the token derived from the configured password.
export async function accessTokenIsValid(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await getAccessToken();
  if (!expected) return false;
  return constantTimeEqual(token, expected);
}
