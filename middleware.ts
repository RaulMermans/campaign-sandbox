// Internal access gate. Protects the app and its API routes behind a single
// shared password (INTERNAL_APP_PASSWORD). See lib/auth/access-cookie.ts.
//
// SAFETY: This is the only access control in v1 — there are no user accounts,
// sessions, or roles. It exists so the deployed app (which makes server-side
// OpenAI calls) cannot be used by anonymous visitors.

import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  accessTokenIsValid,
  isPasswordProtectionDisabled,
} from "@/lib/auth/access-cookie";

export const config = {
  matcher: ["/:path*"],
};

const PUBLIC_ASSET_PATTERN =
  /\.(?:avif|css|gif|ico|jpe?g|js|map|otf|png|svg|ttf|webp|woff2?)$/i;

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const isPublicAsset =
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    PUBLIC_ASSET_PATTERN.test(pathname);

  if (pathname === "/access" || pathname === "/api/access" || isPublicAsset) {
    return NextResponse.next();
  }

  if (isPasswordProtectionDisabled()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (await accessTokenIsValid(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/access", request.url));
}
