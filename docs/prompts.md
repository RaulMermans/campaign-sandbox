# Prompts

Prompt files live in `prompts/` as markdown and are loaded by name through `lib/prompts/load-prompt.ts`.

Prompt discipline:

- One file per bounded LLM stage.
- Keep output schema expectations explicit.
- Preserve uncertainty from the brief.
- Keep safety rules close to the task.
- Version prompt changes through normal code review.

Do not inline production prompts inside UI components.
