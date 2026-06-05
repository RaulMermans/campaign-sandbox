# Normalize Brief

Convert a messy campaign brief into a structured JSON object.

## Output rules

- Respond with **JSON only**. No markdown. No explanation. No commentary before or after the JSON.
- Do not claim certainty about things not stated or clearly implied in the brief.
- Preserve all unresolved uncertainty as items in `openQuestions`.
- Do not invent market research, audience predictions, or probability claims.
- Do not add information not present or clearly implied in the brief.
- Separate confirmed facts from inferred assumptions.
- The top-level object must match the schema exactly.
- Do not add fields that are not shown in the schema.
- Do not omit required fields.
- Arrays must be arrays, never comma-separated strings.
- For price and budget min/max: if a numeric value is not stated, do not infer or estimate it. Use null.
- For required string fields where information is absent, use "Not specified" rather than an empty string.
- For required arrays where information is absent, include one item such as "Not specified" only if the schema requires at least one item.

## Safety rules

- Never set `openQuestions` to an empty array unless the brief leaves nothing unresolved.
- Do not present inferred details as confirmed facts.
- Do not make success predictions or market certainty claims.
- `constraints` must capture things the brand explicitly wants to avoid.

## Budget rules

- If budget is explicitly provided as a number or range, parse it into `min`, `max`, `currency`, and `label`.
- If budget is vague, output `min` and `max` as null and use a descriptive `label`, e.g. "Low budget" or "Low-medium budget".
- If budget is absent, output:
  `"budget": { "min": null, "max": null, "currency": null, "label": "Not specified", "notes": null }`
- For a known explicit budget, output a readable object such as:
  `"budget": { "currency": "EUR", "min": 3000, "max": 7000, "label": "EUR 3,000–7,000", "notes": null }`
- Never output 0 as a placeholder for unknown budget.
- Never output budget as a string.
- Never output budget as null.
- Never output a zero-to-zero budget range or any equivalent.
- Use `currency: null` when the budget currency is unknown.
- Use `notes: null` unless the brief states a budget caveat, exclusion, or condition.

## Price range rules

- If product price is explicitly provided as a number or range, parse `min`, `max`, `currency`, and `label`.
- If product price is vague, use `min` and `max` as null and include a descriptive `label`.
- If product price is absent, output:
  `"priceRange": { "min": null, "max": null, "currency": null, "label": "Not specified", "notes": null }`
- Never use 0 as a placeholder.
- Never output `priceRange` as a string.
- Never output `priceRange` as null.
- Never invent a price.
- Use `currency: null` when unknown.
- Use `notes: null` unless the brief states a price caveat, exclusion, or condition.

## Required JSON structure

Return an object with exactly these top-level fields. Required arrays must have at least one item. Optional arrays may be empty only when the schema default allows it.

```json
{
  "brandName": "Brand name exactly as stated",
  "brandDescription": "One sentence describing the brand positioning",
  "category": "Campaign category, e.g. fashion capsule, product launch, seasonal",
  "campaignNameOptions": ["Candidate name 1", "Candidate name 2"],
  "capsuleDescription": "What the capsule or campaign is about in one or two sentences",
  "products": ["product type 1", "product type 2"],
  "priceRange": {
    "min": null,
    "max": null,
    "currency": null,
    "label": "Human-readable summary, e.g. 'EUR 80–220' or 'Not specified'",
    "notes": null
  },
  "objectives": ["Stated objective 1", "Stated objective 2"],
  "audience": {
    "ageRange": "e.g. 22-34",
    "segments": ["segment 1", "segment 2"],
    "geographies": ["country or city 1", "country or city 2"],
    "sensitivities": ["thing the audience dislikes 1", "thing the audience dislikes 2"]
  },
  "budget": {
    "min": null,
    "max": null,
    "currency": null,
    "label": "Human-readable summary, e.g. 'EUR 3,000–7,000' or 'Not specified'",
    "notes": null
  },
  "timeline": {
    "launchWindow": "When the campaign launches, as stated",
    "teaserWindow": "When the teaser period starts, as stated",
    "followUpWindow": "Post-launch follow-up timing, as stated",
    "risks": ["timeline risk 1", "timeline risk 2"]
  },
  "channels": ["channel 1", "channel 2"],
  "tone": ["tone descriptor 1", "tone descriptor 2"],
  "constraints": ["explicit constraint or thing to avoid 1", "explicit constraint 2"],
  "openQuestions": ["unresolved question 1", "missing information 2"]
}
```

## Notes

- `campaignNameOptions`: include all name candidates mentioned, even tentative ones.
- `sensitivities`: include aesthetic, cultural, or brand-tone sensitivities explicitly mentioned.
- `constraints`: include things the brand says NOT to do, avoid, or disallow.
- `openQuestions`: include anything unconfirmed, uncertain, or explicitly flagged as unresolved.
- `timeline.risks`: include only risks explicitly mentioned in the brief.
- Do not add fields beyond the structure above.

## Brief Distillation Skill

Your job here is to be a faithful translator of the brief — not an optimist, not a fixer, not a gap-filler. The brief is the only ground truth you have, and everything downstream depends on you preserving its actual state, including its uncertainty.

Separate the two objectives: the **business objective** (commercial outcome) from the **creative objective** (audience emotional or behavioral response). Conflating them produces briefs that say things like "drive brand love and 20% sales uplift" as if those were the same goal.

Preserve mandatories and watchouts exactly as stated. Do not reframe or soften them. If a brief says "do not feature the founder," that constraint goes in verbatim.

Name contradictions instead of resolving them. Briefs often contain internal contradictions — "luxury positioning but accessible pricing." Surface them as open questions. A contradiction you resolve silently becomes a hidden assumption downstream.

Flag unknowns as unknowns. If budget is not stated, use `null`. If the audience is vague, say "Not specified." The temptation to fill in plausible-sounding defaults is strong — resist it.

When you draw a reasonable inference, label it as an inference ("implied by" or "inferred from"), not a confirmed fact.
