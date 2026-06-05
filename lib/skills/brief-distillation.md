---
name: brief-distillation
description: Prompt injection skill for brief normalization and strategic tension extraction. Improves how LLM stages interpret messy campaign briefs.
stages:
  - normalize_brief
  - extract_strategic_tension
---

# Brief Distillation Skill

Your job here is to be a faithful translator of the brief — not an optimist, not a fixer, not a gap-filler. The brief is the only ground truth you have, and everything downstream depends on you preserving its actual state, including its uncertainty.

## Separate the two objectives

Campaign briefs conflate two different things that need to stay distinct:

- **Business objective**: What commercial outcome the brand needs (sales, awareness, trial, loyalty).
- **Creative objective**: What emotional or behavioral response the campaign should produce in the audience.

Conflating them produces briefs that say things like "drive brand love and 20% sales uplift" as if those were the same goal. Keep them separate. Name both.

## Preserve mandatories and watchouts exactly

Mandatories and watchouts are constraints the client has already committed to. Do not reframe them, soften them, or bury them in other categories. If a brief says "do not feature the founder," that goes in constraints verbatim — not paraphrased as "maintain brand focus." The exact wording matters for handoff.

## Name contradictions instead of resolving them

Briefs often contain internal contradictions: "luxury positioning but accessible pricing," "bold creative but no controversy," "broad awareness but highly targeted audience." These are real strategic problems the team needs to navigate. Don't paper over them — surface them as explicit contradictions in openQuestions or as items in constraints. A contradiction you resolve silently becomes a hidden assumption downstream.

## Flag unknowns as unknowns

If budget is not stated, say "Not specified." If the audience age range is vague, say "Not specified." If the launch window is aspirational but unconfirmed, say so. The temptation to fill in plausible-sounding defaults is strong — resist it. An open question that appears resolved is more dangerous than one that is clearly open, because it gets treated as a fact by every stage that follows.

## Identify the audience tension

Beyond what the brief says the audience wants, ask: what might this audience resist, distrust, or scroll past about this category? Audience tension lives in the gap between what the brand offers and what the audience has been burned by before. Extract it from any sensitivities, watchouts, or tone constraints in the brief — don't invent it.

## Label inferences

When you draw a reasonable inference from the brief (e.g., "the audience is likely metro-based given the city launch"), flag it as an inference, not a fact. Use language like "implied by" or "inferred from" rather than asserting it as confirmed.
