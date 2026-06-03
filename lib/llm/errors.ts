// Typed error classes for the LLM provider adapter.
// These are thrown by generate-json.ts and caught by stage functions and API routes.

export class LlmProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export class LlmTimeoutError extends LlmProviderError {
  constructor(message: string) {
    super(message);
    this.name = "LlmTimeoutError";
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

export type LlmSchemaIssue = {
  path: Array<string | number>;
  message: string;
};

export class LlmSchemaValidationError extends Error {
  readonly issues: LlmSchemaIssue[];
  constructor(message: string, issues: LlmSchemaIssue[] = []) {
    super(message);
    this.name = "LlmSchemaValidationError";
    this.issues = issues;
  }
}
