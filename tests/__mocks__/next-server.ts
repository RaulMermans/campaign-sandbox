// Lightweight next/server mock for vitest tests.
// Replaces the real next/server import to avoid initializing the full Next.js
// runtime during test collection, which otherwise takes 3+ minutes.

interface CookieOptions {
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: string;
  secure?: boolean;
}

class ResponseCookies {
  constructor(private headers: Headers) {}

  set(name: string, value: string, options?: CookieOptions): void {
    let cookie = `${name}=${value}`;
    if (options?.path) cookie += `; Path=${options.path}`;
    if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
    if (options?.httpOnly) cookie += `; HttpOnly`;
    if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
    if (options?.secure) cookie += `; Secure`;
    this.headers.append("set-cookie", cookie);
  }
}

class RequestCookies {
  private map = new Map<string, string>();

  constructor(headers: Headers) {
    const header = headers.get("cookie") ?? "";
    for (const part of header.split(";")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      this.map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
  }

  get(name: string): { name: string; value: string } | undefined {
    const value = this.map.get(name);
    return value !== undefined ? { name, value } : undefined;
  }
}

export class NextResponse extends Response {
  cookies: ResponseCookies;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    this.cookies = new ResponseCookies(this.headers);
  }

  static json(data: unknown, init?: ResponseInit): NextResponse {
    const body = JSON.stringify(data);
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return new NextResponse(body, { ...init, headers });
  }

  static next(init?: ResponseInit): NextResponse {
    return new NextResponse(null, init);
  }

  static redirect(url: string | URL, init?: number | ResponseInit): NextResponse {
    const status = typeof init === "number" ? init : (init?.status ?? 307);
    const headers = new Headers(typeof init === "object" ? init?.headers : undefined);
    headers.set("Location", url.toString());
    return new NextResponse(null, { ...((typeof init === "object" ? init : {}) ?? {}), status, headers });
  }
}

export class NextRequest extends Request {
  get cookies(): RequestCookies {
    return new RequestCookies(this.headers);
  }

  get nextUrl(): URL {
    return new URL(this.url);
  }
}
