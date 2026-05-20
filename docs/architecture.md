# Architecture

Campaign Sandbox uses a hybrid workflow-agent architecture. The product is a deterministic workflow with bounded LLM stages, not a free-roaming multi-agent system.

Deterministic code owns orchestration, schema validation, scoring weights, trace logging, retries, persistence boundaries, artifact export, and safety rules. LLM stages are reserved for tasks where language judgment matters: brief normalization, strategic tension extraction, campaign route generation, synthetic audience simulation, pre-mortem critique, and final plan synthesis.

For v1, all LLM stages are mocked so the UI, schemas, tests, and workflow contracts can mature without API keys or persistence. Later integrations should be added behind the same workflow boundaries.
