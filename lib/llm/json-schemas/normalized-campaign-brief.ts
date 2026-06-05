export const normalizedCampaignBriefJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "brandName",
    "brandDescription",
    "category",
    "campaignNameOptions",
    "capsuleDescription",
    "products",
    "priceRange",
    "objectives",
    "audience",
    "budget",
    "timeline",
    "channels",
    "tone",
    "constraints",
    "openQuestions",
  ],
  properties: {
    brandName: { type: "string" },
    brandDescription: { type: "string" },
    category: { type: "string" },
    campaignNameOptions: {
      type: "array",
      items: { type: "string" },
    },
    capsuleDescription: { type: "string" },
    products: {
      type: "array",
      items: { type: "string" },
    },
    priceRange: {
      type: "object",
      additionalProperties: false,
      required: ["min", "max", "currency", "label", "notes"],
      properties: {
        min: { type: ["number", "null"] },
        max: { type: ["number", "null"] },
        currency: { type: ["string", "null"] },
        label: { type: "string" },
        notes: { type: ["string", "null"] },
      },
    },
    objectives: {
      type: "array",
      items: { type: "string" },
    },
    audience: {
      type: "object",
      additionalProperties: false,
      required: ["ageRange", "segments", "geographies", "sensitivities"],
      properties: {
        ageRange: { type: "string" },
        segments: {
          type: "array",
          items: { type: "string" },
        },
        geographies: {
          type: "array",
          items: { type: "string" },
        },
        sensitivities: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    budget: {
      type: "object",
      additionalProperties: false,
      required: ["min", "max", "currency", "label", "notes"],
      properties: {
        min: { type: ["number", "null"] },
        max: { type: ["number", "null"] },
        currency: { type: ["string", "null"] },
        label: { type: "string" },
        notes: { type: ["string", "null"] },
      },
    },
    timeline: {
      type: "object",
      additionalProperties: false,
      required: ["launchWindow", "teaserWindow", "followUpWindow", "risks"],
      properties: {
        launchWindow: { type: "string" },
        teaserWindow: { type: "string" },
        followUpWindow: { type: "string" },
        risks: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    channels: {
      type: "array",
      items: { type: "string" },
    },
    tone: {
      type: "array",
      items: { type: "string" },
    },
    constraints: {
      type: "array",
      items: { type: "string" },
    },
    openQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;
