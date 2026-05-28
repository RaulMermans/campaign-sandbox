// Typed error class for deterministic workflow validation failures.
// Use this for cross-reference rules, coverage checks, and invariant violations
// that do not involve LLM providers.
// Do not use LlmSchemaValidationError for deterministic scoring failures.

export class WorkflowValidationError extends Error {
  readonly issues: Array<{ path: Array<string | number>; message: string }>;

  constructor(
    message: string,
    issues: Array<{ path: Array<string | number>; message: string }>,
  ) {
    super(message);
    this.name = "WorkflowValidationError";
    this.issues = issues;
  }
}
