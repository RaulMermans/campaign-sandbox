# Observability

Every workflow stage emits trace events so users can inspect what happened, where a decision came from, and which stage produced each output.

Trace events include run ID, stage ID, event type, status, message, timestamp, duration, schemas, and metadata. This supports debugging, eval review, safety audits, and later replay.

V1 stores trace events in mock run objects only. Later versions should persist them with campaign runs.
