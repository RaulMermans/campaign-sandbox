// Tests for the internal access-gate middleware.
// Uses the lightweight next/server mock (tests/__mocks__/next-server.ts).

import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { ACCESS_COOKIE_NAME, getAccessToken } from "@/lib/auth/access-cookie";

const ORIGINAL_PASSWORD = process.env.INTERNAL_APP_PASSWORD;
const ORIGINAL_DISABLE = process.env.DISABLE_INTERNAL_PASSWORD;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  process.env.INTERNAL_APP_PASSWORD = "correct-horse-battery-staple";
  delete process.env.DISABLE_INTERNAL_PASSWORD;
});

afterEach(() => {
  if (ORIGINAL_PASSWORD === undefined) delete process.env.INTERNAL_APP_PASSWORD;
  else process.env.INTERNAL_APP_PASSWORD = ORIGINAL_PASSWORD;

  if (ORIGINAL_DISABLE === undefined) delete process.env.DISABLE_INTERNAL_PASSWORD;
  else process.env.DISABLE_INTERNAL_PASSWORD = ORIGINAL_DISABLE;
  vi.unstubAllEnvs();
});

function makeRequest(path: string, cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  return new NextRequest(new Request(`http://localhost${path}`, { headers }));
}

describe("middleware — page routes", () => {
  it("redirects to /access when no cookie is present", async () => {
    const res = await middleware(makeRequest("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/access");
  });

  it("allows /access without a cookie", async () => {
    const res = await middleware(makeRequest("/access"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows Next internals, favicon, and public assets without a cookie", async () => {
    for (const path of ["/_next/static/app.js", "/favicon.ico", "/demo-image.png"]) {
      const res = await middleware(makeRequest(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("does not treat arbitrary dotted app paths as public assets", async () => {
    const res = await middleware(makeRequest("/portfolio.json"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/access");
  });

  it("redirects to /access when the cookie token is invalid", async () => {
    const res = await middleware(makeRequest("/", `${ACCESS_COOKIE_NAME}=not-a-real-token`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/access");
  });

  it("allows the request through with a valid cookie token", async () => {
    const token = await getAccessToken();
    const res = await middleware(makeRequest("/", `${ACCESS_COOKIE_NAME}=${token}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("middleware — API routes", () => {
  it("returns 401 JSON for unauthorized /api/campaign/run requests", async () => {
    const res = await middleware(makeRequest("/api/campaign/run"));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 JSON for unauthorized /api/campaign/export requests", async () => {
    const res = await middleware(makeRequest("/api/campaign/export"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Unauthorized.",
      code: "UNAUTHORIZED",
    });
  });

  it("allows /api/access without a cookie", async () => {
    const res = await middleware(makeRequest("/api/access"));
    expect(res.status).toBe(200);
  });

  it("does not redirect API requests", async () => {
    const res = await middleware(makeRequest("/api/campaign/run"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows API requests through with a valid cookie token", async () => {
    const token = await getAccessToken();
    const res = await middleware(makeRequest("/api/campaign/run", `${ACCESS_COOKIE_NAME}=${token}`));
    expect(res.status).toBe(200);
  });
});

describe("middleware — DISABLE_INTERNAL_PASSWORD", () => {
  it("allows all requests through when explicitly disabled outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.DISABLE_INTERNAL_PASSWORD = "true";

    const pageRes = await middleware(makeRequest("/"));
    expect(pageRes.status).toBe(200);
    expect(pageRes.headers.get("location")).toBeNull();

    const apiRes = await middleware(makeRequest("/api/campaign/run"));
    expect(apiRes.status).toBe(200);
  });

  it("does not bypass the gate in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DISABLE_INTERNAL_PASSWORD = "true";

    const pageRes = await middleware(makeRequest("/"));
    expect(pageRes.status).toBe(307);

    const apiRes = await middleware(makeRequest("/api/campaign/run"));
    expect(apiRes.status).toBe(401);
  });
});

describe("middleware — unconfigured deployment", () => {
  it("fails closed for page requests in production when no password is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.INTERNAL_APP_PASSWORD;
    const res = await middleware(makeRequest("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/access");
  });

  it("fails closed for API requests in production when no password is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.INTERNAL_APP_PASSWORD;
    const res = await middleware(makeRequest("/api/campaign/run"));
    expect(res.status).toBe(401);
  });
});
