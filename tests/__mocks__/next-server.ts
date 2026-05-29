// Lightweight next/server mock for vitest tests.
// Replaces the real next/server import to avoid initializing the full Next.js
// runtime during test collection, which otherwise takes 3+ minutes.

export class NextResponse extends Response {
  static json(data: unknown, init?: ResponseInit): NextResponse {
    const body = JSON.stringify(data);
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return new Response(body, { ...init, headers }) as NextResponse;
  }
}
