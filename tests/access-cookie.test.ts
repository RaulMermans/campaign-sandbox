// Tests for lib/auth/access-cookie.ts — internal access gate helpers.
// No HTTP server, no LLM calls.

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  ACCESS_COOKIE_NAME,
  accessTokenIsValid,
  getAccessToken,
  isAccessPasswordConfigured,
  isPasswordProtectionDisabled,
  passwordMatchesConfigured,
} from "@/lib/auth/access-cookie";

const ORIGINAL_PASSWORD = process.env.INTERNAL_APP_PASSWORD;
const ORIGINAL_DISABLE = process.env.DISABLE_INTERNAL_PASSWORD;

afterEach(() => {
  if (ORIGINAL_PASSWORD === undefined) delete process.env.INTERNAL_APP_PASSWORD;
  else process.env.INTERNAL_APP_PASSWORD = ORIGINAL_PASSWORD;

  if (ORIGINAL_DISABLE === undefined) delete process.env.DISABLE_INTERNAL_PASSWORD;
  else process.env.DISABLE_INTERNAL_PASSWORD = ORIGINAL_DISABLE;
  vi.unstubAllEnvs();
});

describe("ACCESS_COOKIE_NAME", () => {
  it("is a stable, non-empty cookie name", () => {
    expect(ACCESS_COOKIE_NAME).toBeTruthy();
    expect(ACCESS_COOKIE_NAME).toMatch(/^[a-z0-9_]+$/);
  });
});

describe("isPasswordProtectionDisabled", () => {
  it("is false by default", () => {
    delete process.env.DISABLE_INTERNAL_PASSWORD;
    expect(isPasswordProtectionDisabled()).toBe(false);
  });

  it("is true only when set to the exact string 'true'", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.DISABLE_INTERNAL_PASSWORD = "true";
    expect(isPasswordProtectionDisabled()).toBe(true);

    process.env.DISABLE_INTERNAL_PASSWORD = "1";
    expect(isPasswordProtectionDisabled()).toBe(false);
  });

  it("cannot disable the gate in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DISABLE_INTERNAL_PASSWORD = "true";
    expect(isPasswordProtectionDisabled()).toBe(false);
  });
});

describe("isAccessPasswordConfigured", () => {
  it("is false when no password is set", () => {
    delete process.env.INTERNAL_APP_PASSWORD;
    expect(isAccessPasswordConfigured()).toBe(false);
  });

  it("is true when a password is set", () => {
    process.env.INTERNAL_APP_PASSWORD = "correct-horse-battery-staple";
    expect(isAccessPasswordConfigured()).toBe(true);
  });
});

describe("getAccessToken / passwordMatchesConfigured / accessTokenIsValid", () => {
  it("returns null when no password is configured", async () => {
    delete process.env.INTERNAL_APP_PASSWORD;
    expect(await getAccessToken()).toBeNull();
  });

  it("derives a token that does not equal the raw password", async () => {
    process.env.INTERNAL_APP_PASSWORD = "correct-horse-battery-staple";
    const token = await getAccessToken();
    expect(token).toBeTruthy();
    expect(token).not.toBe("correct-horse-battery-staple");
    expect(token).not.toContain("correct-horse-battery-staple");
    expect(token).toMatch(/^campaign-sandbox-access-v1\.[a-f0-9]{64}$/);
  });

  it("matches the correct password", async () => {
    process.env.INTERNAL_APP_PASSWORD = "correct-horse-battery-staple";
    expect(await passwordMatchesConfigured("correct-horse-battery-staple")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    process.env.INTERNAL_APP_PASSWORD = "correct-horse-battery-staple";
    expect(await passwordMatchesConfigured("wrong-password")).toBe(false);
  });

  it("rejects any password when none is configured", async () => {
    delete process.env.INTERNAL_APP_PASSWORD;
    expect(await passwordMatchesConfigured("anything")).toBe(false);
  });

  it("validates a token derived from the configured password", async () => {
    process.env.INTERNAL_APP_PASSWORD = "correct-horse-battery-staple";
    const token = await getAccessToken();
    expect(await accessTokenIsValid(token)).toBe(true);
    expect(await accessTokenIsValid("not-a-real-token")).toBe(false);
    expect(await accessTokenIsValid(undefined)).toBe(false);
    expect(await accessTokenIsValid(null)).toBe(false);
  });

  it("rejects a token from a previous password after the password changes", async () => {
    process.env.INTERNAL_APP_PASSWORD = "first-password";
    const oldToken = await getAccessToken();

    process.env.INTERNAL_APP_PASSWORD = "second-password";
    expect(await accessTokenIsValid(oldToken)).toBe(false);
  });
});
