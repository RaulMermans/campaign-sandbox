# Normalize Brief

Convert a messy campaign brief into a structured JSON object.

## Output rules

- Respond with **JSON only**. No markdown. No explanation. No commentary before or after the JSON.
- Do not claim certainty about things not stated or clearly implied in the brief.
- Preserve all unresolved uncertainty as items in `openQuestions`.
- Do not invent market research, audience predictions, or probability claims.
- Do not add information not present or clearly implied in the brief.
- Separate confirmed facts from inferred assumptions.
- If a numeric value is not stated, use 0, not an estimated figure.

## Safety rules

- Never set `openQuestions` to an empty array unless the brief leaves nothing unresolved.
- Do not present inferred details as confirmed facts.
- Do not make success predictions or market certainty claims.
- `constraints` must capture things the brand explicitly wants to avoid.

## Required JSON structure

Return an object with exactly these fields. All arrays must have at least one item.

```json
{
  "brandName": "Brand name exactly as stated",
  "brandDescription": "One sentence describing the brand positioning",
  "category": "Campaign category, e.g. fashion capsule, product launch, seasonal",
  "campaignNameOptions": ["Candidate name 1", "Candidate name 2"],
  "capsuleDescription": "What the capsule or campaign is about in one or two sentences",
  "products": ["product type 1", "product type 2"],
  "priceRange": {
    "min": 0,
    "max": 0,
    "currency": "ISO currency code, e.g. EUR, GBP, USD"
  },
  "objectives": ["Stated objective 1", "Stated objective 2"],
  "audience": {
    "ageRange": "e.g. 22-34",
    "segments": ["segment 1", "segment 2"],
    "geographies": ["country or city 1", "country or city 2"],
    "sensitivities": ["thing the audience dislikes 1", "thing the audience dislikes 2"]
  },
  "budget": {
    "min": 0,
    "max": 0,
    "currency": "ISO currency code",
    "notes": "Any stated caveats, exclusions, or conditions about the budget"
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
