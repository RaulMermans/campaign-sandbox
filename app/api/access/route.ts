// Server-side only. Validates the internal access password and sets the
// access cookie. Never logs or echoes the configured or submitted password.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  getAccessToken,
  isAccessPasswordConfigured,
  passwordMatchesConfigured,
} from "@/lib/auth/access-cookie";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("password" in body)) {
    return NextResponse.json({ error: "Request body must include a 'password' field." }, { status: 400 });
  }

  const { password } = body as Record<string, unknown>;
  if (typeof password !== "string") {
    return NextResponse.json({ error: "'password' must be a string." }, { status: 400 });
  }

  if (!isAccessPasswordConfigured()) {
    return NextResponse.json(
      { error: "Access is not configured on this deployment." },
      { status: 500 },
    );
  }

  if (!(await passwordMatchesConfigured(password))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: "Access is not configured on this deployment." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
