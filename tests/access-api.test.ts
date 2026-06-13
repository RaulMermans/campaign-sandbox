// Tests for POST /api/access route handler.
// No HTTP server, no LLM calls.

import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/access/route";
import { ACCESS_COOKIE_NAME, getAccessToken } from "@/lib/auth/access-cookie";

const ORIGINAL_PASSWORD = process.env.INTERNAL_APP_PASSWORD;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeBadRequest(): Request {
  return new Request("http://localhost/api/access", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "not json",
  });
}

beforeEach(() => {
  process.env.INTERNAL_APP_PASSWORD = "correct-horse-battery-staple";
});

afterEach(() => {
  if (ORIGINAL_PASSWORD === undefined) delete process.env.INTERNAL_APP_PASSWORD;
  else process.env.INTERNAL_APP_PASSWORD = ORIGINAL_PASSWORD;
  vi.unstubAllEnvs();
});

describe("POST /api/access — input validation", () => {
  it("returns 400 for non-JSON body", async () => {
    const res = await POST(makeBadRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'password' field is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'password' is not a string", async () => {
    const res = await POST(makeRequest({ password: 123 }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/access — configuration", () => {
  it("fails closed with 500 when no password is configured", async () => {
    delete process.env.INTERNAL_APP_PASSWORD;
    const res = await POST(makeRequest({ password: "anything" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Access is not configured on this deployment.",
    });
  });
});

describe("POST /api/access — authentication", () => {
  it("returns 401 for an incorrect password", async () => {
    const res = await POST(makeRequest({ password: "wrong-password" }));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it("returns 200 and sets an httpOnly access cookie for the correct password", async () => {
    const res = await POST(makeRequest({ password: "correct-horse-battery-staple" }));
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ACCESS_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie.toLowerCase()).toContain("max-age=604800");
  });

  it("sets a cookie value that matches the derived access token, not the raw password", async () => {
    const res = await POST(makeRequest({ password: "correct-horse-battery-staple" }));
    const setCookie = res.headers.get("set-cookie") ?? "";
    const expectedToken = await getAccessToken();

    expect(setCookie).toContain(`${ACCESS_COOKIE_NAME}=${expectedToken}`);
    expect(setCookie).not.toContain("correct-horse-battery-staple");
  });

  it("sets the secure cookie flag in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(makeRequest({ password: "correct-horse-battery-staple" }));
    expect(res.headers.get("set-cookie")?.toLowerCase()).toContain("secure");
  });

  it("never includes the configured password in the response body", async () => {
    const wrongRes = await POST(makeRequest({ password: "wrong-password" }));
    const wrongText = await wrongRes.text();
    expect(wrongText).not.toContain("correct-horse-battery-staple");

    const okRes = await POST(makeRequest({ password: "correct-horse-battery-staple" }));
    const okText = await okRes.text();
    expect(okText).not.toContain("correct-horse-battery-staple");
  });
});
