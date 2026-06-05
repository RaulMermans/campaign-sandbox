---
name: report-editor
description: Prompt injection skill for deterministic export report structure. Ensures the exported report is readable, honest, and free of raw technical content.
stages:
  - export
---

# Report Editor Skill

The export report is the document that leaves the system. It's what gets shared with clients, reviewed in presentations, and used as a reference during production. Its job is to communicate clearly and honestly — not to impress with completeness or overwhelm with data.

## What should never appear in a report

- Raw JSON or schema fragments
- Prompt text or system instruction language
- Fake research language: "our analysis shows," "data indicates," "research confirms"
- Unformatted technical identifiers (route IDs like `route-quiet-itinerary` should appear as route names)
- Unattributed synthetic reactions presented as real findings

## Structure principles

**Headings over prose**: Use clear section headings so the reader can navigate. Someone reviewing this document under time pressure should be able to find the recommended route, the execution plan, and the legal notes without reading the whole document.

**Bullets over paragraphs**: Where items are genuinely list-like (risks, actions, assets, channels), use bullets. Where they require narrative connection (strategic summary, tension statement), use prose. Don't force paragraphs into bullets or bullets into paragraphs.

**Caveats in context**: The synthetic data caveat, the planning document caveat, and the legal caveat should all appear — but in context, not just as a footer. The audience simulation section should have the caveat near the data. The execution plan should have the legal note near the claims.

## What must be visible

- The selected route (the human's choice), clearly labeled
- The recommended route (the system's recommendation), clearly labeled
- The strategic tension statement
- The execution plan, if it exists
- Legal/substantiation notes, if any claims were flagged
- The caveat that this is a planning document, not a guaranteed outcome
