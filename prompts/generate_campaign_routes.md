# Generate Campaign Routes

Generate 3 to 5 distinct campaign routes based on the normalized brief and strategic tension provided.

## Output rules

- Respond with **JSON only**. No markdown. No explanation. No commentary before or after the JSON.
- Generate between 3 and 5 routes. Do not generate fewer than 3 or more than 5.
- Routes must be genuinely different strategic territories — not cosmetic variations of the same idea.
- Include exactly one route with `strategicRole: "safest"`.
- Include exactly one route with `strategicRole: "boldest"`.
- Include exactly one route with `strategicRole: "conversion"`.
- If generating 4 or 5 routes, the additional routes may use any `strategicRole` value.
- Do not invent real performance data, market benchmarks, or audience research.
- Do not claim success probability or predict campaign outcomes.
- Base every route only on the normalized brief and strategic tension provided.
- Respect all constraints, tone rules, budget range, channel preferences, and open questions.
- Every route must include at least one risk.
- `sampleCopy` must be campaign-safe copy examples, not full ad claims or fabricated testimonials.
- Avoid generic campaign names. Route names should be specific and evocative of the strategic territory.

## Safety rules

- Do not present estimates as predictions.
- Do not fabricate audience reactions or market certainty.
- Do not add information not grounded in the brief or tension.
- `risks` must name genuine creative or strategic risks, not disclaimers.

## Required JSON structure

Return exactly this structure. The `routes` array must have 3 to 5 items.

```json
{
  "routes": [
    {
      "id": "route-[short-slug]",
      "name": "Route Name",
      "strategicRole": "safest",
      "position": "One sentence describing the strategic position of this route.",
      "concept": "Two to three sentences describing the creative concept and execution approach.",
      "whyItWorks": "Why this route is effective given the brief and tension.",
      "keyMessage": "The single core message of this route.",
      "tone": ["tone descriptor 1", "tone descriptor 2"],
      "channels": ["channel 1", "channel 2"],
      "activationIdeas": ["activation idea 1", "activation idea 2"],
      "sampleCopy": ["Sample copy line 1.", "Sample copy line 2."],
      "assetIdeas": ["asset type 1", "asset type 2"],
      "risks": ["risk 1", "risk 2"]
    }
  ]
}
```

## Field notes

- `id`: Use `route-` prefix followed by a short lowercase slug, e.g. `route-quiet-itinerary`.
- `strategicRole`: Must be one of `"safest"`, `"boldest"`, `"conversion"`.
- `position`: One sentence only. Describes the strategic territory, not the execution.
- `concept`: Describes the creative idea and what it looks like in practice.
- `whyItWorks`: Connects the route to the brief and tension specifically.
- `keyMessage`: One sentence. The core claim or idea the audience should take away.
- `tone`: At least one item. Should reflect the tone specified in the brief.
- `channels`: At least one item. Should align with channels in the brief.
- `activationIdeas`: At least one item. Concrete, budget-appropriate ideas.
- `sampleCopy`: At least one item. Real copy examples — direct, campaign-ready, grounded in the brief voice.
- `assetIdeas`: At least one item. Specific asset formats and types to produce.
- `risks`: At least one item. Name genuine risks, not generic disclaimers.
