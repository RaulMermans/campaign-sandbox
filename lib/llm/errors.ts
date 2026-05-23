// Typed error classes for the LLM provider adapter.
// These are thrown by generate-json.ts and caught by stage functions and API routes.

export class LlmProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export class LlmJsonParseError extends Error {
  readonly raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.name = "LlmJsonParseError";
    this.raw = raw;
  }
}

export class LlmSchemaValidationError extends Error {
  readonly issues: unknown;
  constructor(message: string, issues: unknown) {
    super(message);
    this.name = "LlmSchemaValidationError";
    this.issues = issues;
  }
}
