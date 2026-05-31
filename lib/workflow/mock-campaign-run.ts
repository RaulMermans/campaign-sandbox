import type {
  CampaignExecutionPlan,
  CampaignRoute,
  NormalizedCampaignBrief,
  Persona,
  PersonaSimulation,
  PremortemReview,
  RouteComparisonMatrix,
  StrategicTension,
} from "@/lib/schemas/campaign";
import type { CampaignRun } from "@/lib/schemas/workflow";
import { scoreRoutes } from "@/lib/scoring/score-routes";
import { compareRoutes } from "@/lib/scoring/compare-routes";
import { createTraceEvent } from "@/lib/traces/trace-events";

export { NODO_SAMPLE_BRIEF } from "@/lib/sample-briefs";

export const normalizedBrief: NormalizedCampaignBrief = {
  brandName: "NODO",
  brandDescription:
    "Independent fashion and lifestyle brand between Madrid and Lisbon, positioned as premium daily uniform rather than luxury.",
  category: "Fashion capsule campaign",
  campaignNameOptions: ["In Transit", "Between Places", "Working From Elsewhere"],
  capsuleDescription:
    "A city movement capsule about the spaces between work, travel, studio time, and everyday life without using obvious travel codes.",
  products: ["oversized shirts", "trousers", "knitwear", "bags", "accessories"],
  priceRange: { min: 80, max: 220, currency: "EUR" },
  objectives: [
    "Sell the capsule",
    "Increase cultural relevance",
    "Grow email signups",
    "Support a potential Madrid or Lisbon pop-up",
  ],
  audience: {
    ageRange: "22-34",
    segments: ["creative professionals", "design students", "architects", "brand and photo workers", "startup operators"],
    geographies: ["Spain", "Portugal", "France", "Italy"],
    sensitivities: ["obvious ads", "forced scarcity language", "fake-deep copy", "cringe TikTok tropes"],
  },
  budget: { min: 3000, max: 7000, currency: "EUR", notes: "Low to medium production budget excluding product." },
  timeline: {
    launchWindow: "Late September",
    teaserWindow: "Two weeks before launch",
    followUpWindow: "Two weeks after launch week",
    risks: ["Production may slip", "Pop-up city is not confirmed"],
  },
  channels: ["Instagram", "email", "TikTok if restrained", "pop-up touchpoints"],
  tone: ["intelligent", "intimate", "slightly dry", "poetic but grounded"],
  constraints: ["No suitcases", "No fake airport shoot", "No limited drop shouting", "No real market certainty claims"],
  openQuestions: ["Final capsule name", "Pop-up location", "Production delay tolerance", "Email signup incentive"],
};

export const strategicTension: StrategicTension = {
  coreTension:
    "NODO wants the energy of movement without looking like a travel brand or using streetwear scarcity codes.",
  audienceInsight:
    "The audience wants clothes that make flexible, mobile work feel intentional without advertising ambition too loudly.",
  culturalContext:
    "Creative work now happens between cafes, trains, studios, and temporary desks, but the visual language around it is often generic.",
  brandContradiction:
    "The capsule is about being in transit, while the brand promise is calm, elevated, and not performative.",
  creativeOpportunity:
    "Frame the product as a uniform for unfinished days: clothes that understand in-between time without dramatizing it.",
  avoid: ["travel campaign cliches", "scarcity hype", "startup productivity language", "performative Gen Z slang"],
};

export const campaignRoutes: CampaignRoute[] = [
  {
    id: "route-quiet-itinerary",
    name: "Quiet Itinerary",
    strategicRole: "safest",
    position: "A restrained editorial route about days that move without announcing themselves.",
    concept:
      "Shoot the capsule across real transitional city spaces: stairwells, cafe counters, studio corners, train platforms cropped tightly enough to avoid travel cliche.",
    whyItWorks: "It preserves NODO's premium restraint while making the product feel useful and culturally current.",
    keyMessage: "For days with more than one place in them.",
    tone: ["quiet", "observational", "precise"],
    channels: ["Instagram carousel", "email editorial", "website lookbook", "pop-up posters"],
    activationIdeas: ["Location-note carousel", "found itinerary email", "city receipt-style product cards"],
    sampleCopy: ["A shirt for the second address of the day.", "Between places, properly dressed."],
    assetIdeas: ["tight environmental stills", "short walking details", "flat lays with notes and receipts"],
    risks: ["May feel too subtle for TikTok", "Needs excellent photography to avoid blandness"],
  },
  {
    id: "route-between-addresses",
    name: "Between Addresses",
    strategicRole: "boldest",
    position: "A cultural statement about the modern creative worker who belongs to routines, not fixed places.",
    concept:
      "Turn customer movement into a campaign language: borrowed desks, half-finished maps, voice notes, calendar fragments, and city handoffs.",
    whyItWorks: "It gives NODO a sharper point of view and creates participation mechanics without pretending to be research.",
    keyMessage: "You are not lost. You are between addresses.",
    tone: ["dry", "poetic", "slightly conceptual"],
    channels: ["Instagram Reels", "UGC prompts", "email essay", "poster series"],
    activationIdeas: ["Between Addresses submissions", "city handoff posts", "micro-interviews with creative locals"],
    sampleCopy: ["Current address: table 4, near the socket.", "A uniform for temporary coordinates."],
    assetIdeas: ["fragmented city notes", "portrait diptychs", "customer desk submissions"],
    risks: ["Could become abstract", "Participation may be low without a clear prompt", "Requires strong copy discipline"],
  },
  {
    id: "route-uniform-for-motion",
    name: "Uniform for Motion",
    strategicRole: "conversion",
    position: "A product-forward route that connects each piece to a flexible day without sounding utilitarian.",
    concept:
      "Build the launch around complete daily uniforms: cafe-to-studio, train-to-dinner, desk-to-pop-up, with clear product bundles and email capture.",
    whyItWorks: "It translates the strategy into shoppable use cases while keeping the brand voice elevated.",
    keyMessage: "Move through the day without changing character.",
    tone: ["clear", "warm", "practical"],
    channels: ["Instagram shopping", "email", "site merchandising", "retargeting-lite organic posts"],
    activationIdeas: ["three uniform edits", "email-first early view", "pop-up outfit reservation list"],
    sampleCopy: ["The cafe-to-studio edit.", "One outfit, several rooms."],
    assetIdeas: ["styled outfit sets", "detail videos", "email signup landing block"],
    risks: ["Less distinctive than the bold route", "Can drift into catalog language"],
  },
];

export const campaignPersonas: Persona[] = [
  {
    id: "persona-creative-director",
    name: "Iria",
    segment: "Independent creative director",
    ageRange: "29-34",
    location: "Madrid",
    mindset: "Buys fewer pieces, wants clothes that feel considered but not precious.",
    motivations: ["taste signaling", "workday versatility", "local cultural relevance"],
    sensitivities: ["obvious influencer language", "fake scarcity", "overproduced campaigns"],
    likelyChannels: ["Instagram", "email"],
  },
  {
    id: "persona-design-student",
    name: "Mateo",
    segment: "Design student and part-time studio assistant",
    ageRange: "22-25",
    location: "Lisbon",
    mindset: "Aspirational but budget-aware; responds to cultural sharpness and shareable detail.",
    motivations: ["identity", "discoverability", "entry-level premium products"],
    sensitivities: ["luxury posturing", "brand copy that tries too hard"],
    likelyChannels: ["Instagram", "TikTok"],
  },
  {
    id: "persona-startup-operator",
    name: "Clara",
    segment: "Remote startup operator",
    ageRange: "27-32",
    location: "Barcelona",
    mindset: "Needs polished casual clothes for fluid days and buys when styling is immediately useful.",
    motivations: ["ease", "versatility", "email early access"],
    sensitivities: ["fashion opacity", "too much concept with no product clarity"],
    likelyChannels: ["email", "Instagram"],
  },
];

// Full deterministic 3×3 route/persona simulation matrix.
// Every route/persona pair must have exactly one entry.
// All caveats must contain the word "synthetic".
// These are planning devices, not real audience research.
export const personaSimulations: PersonaSimulation[] = [
  // route-quiet-itinerary × all three personas
  {
    routeId: "route-quiet-itinerary",
    personaId: "persona-creative-director",
    likelyReaction: "Finds it tasteful and aligned with NODO, especially if the photography is excellent.",
    positives: ["premium restraint", "clear brand fit"],
    objections: ["might not feel new enough"],
    quotedReaction: "This feels like NODO growing up, not shouting.",
    resonanceScore: 4.4,
    conversionIntent: 4.1,
    signupIntent: 3.8,
    confidence: "medium",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  {
    routeId: "route-quiet-itinerary",
    personaId: "persona-design-student",
    likelyReaction: "Appreciates the restraint but may need a more direct entry point to the product.",
    positives: ["elevated aesthetic", "looks shareable as a still image"],
    objections: ["could feel distant if no clear product visibility", "less culturally edgy than expected"],
    quotedReaction: "Beautiful but I need to see what I would actually wear.",
    resonanceScore: 3.8,
    conversionIntent: 3.2,
    signupIntent: 3.5,
    confidence: "low",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  {
    routeId: "route-quiet-itinerary",
    personaId: "persona-startup-operator",
    likelyReaction: "Responds well to the everyday-utility angle, but needs a clearer path to shop.",
    positives: ["calm visual language matches their self-image", "not overwhelming"],
    objections: ["may not trigger urgency to buy", "unclear which pieces to start with"],
    quotedReaction: "This is the kind of thing I would save and then never click through on.",
    resonanceScore: 3.6,
    conversionIntent: 3.4,
    signupIntent: 3.3,
    confidence: "low",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  // route-between-addresses × all three personas
  {
    routeId: "route-between-addresses",
    personaId: "persona-creative-director",
    likelyReaction: "Engages with the concept intellectually but wants more visible brand authority.",
    positives: ["strong conceptual point of view", "feels culturally current"],
    objections: ["risk of concept overshadowing the product", "needs extremely sharp execution"],
    quotedReaction: "I get the idea, now show me the brand behind it.",
    resonanceScore: 4.2,
    conversionIntent: 3.6,
    signupIntent: 3.9,
    confidence: "medium",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  {
    routeId: "route-between-addresses",
    personaId: "persona-design-student",
    likelyReaction: "Likely to save and share if the participation prompt is simple and visually strong.",
    positives: ["cultural edge", "shareable copy"],
    objections: ["could feel too art-school if product is hidden"],
    quotedReaction: "I like the idea, but show me the trousers.",
    resonanceScore: 4.7,
    conversionIntent: 3.4,
    signupIntent: 4.2,
    confidence: "medium",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  {
    routeId: "route-between-addresses",
    personaId: "persona-startup-operator",
    likelyReaction: "Connects with the remote-work framing but wants the product to be more visible.",
    positives: ["language mirrors their actual day", "participation format is familiar"],
    objections: ["needs a clearer product hook", "concept may not justify premium price point"],
    quotedReaction: "Yes, this is my life. But what am I buying exactly?",
    resonanceScore: 4.1,
    conversionIntent: 3.3,
    signupIntent: 4.0,
    confidence: "low",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  // route-uniform-for-motion × all three personas
  {
    routeId: "route-uniform-for-motion",
    personaId: "persona-creative-director",
    likelyReaction: "Sees the utility clearly but worries the approach is too catalog-forward for the brand.",
    positives: ["product is unmistakably visible", "easy to shop from day one"],
    objections: ["less aspirational than NODO's usual register", "could read as too commercial"],
    quotedReaction: "It works, but I hope NODO does not stop there.",
    resonanceScore: 3.7,
    conversionIntent: 4.2,
    signupIntent: 3.5,
    confidence: "medium",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  {
    routeId: "route-uniform-for-motion",
    personaId: "persona-design-student",
    likelyReaction: "Appreciates the outfit-building clarity but may feel it is too safe for their identity.",
    positives: ["easy to understand the product edit", "clear use case for daily life"],
    objections: ["not distinctive enough to share", "could be any elevated-basics brand"],
    quotedReaction: "Makes sense. I would just need a reason to choose NODO over anyone else.",
    resonanceScore: 3.5,
    conversionIntent: 3.7,
    signupIntent: 3.4,
    confidence: "low",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
  {
    routeId: "route-uniform-for-motion",
    personaId: "persona-startup-operator",
    likelyReaction: "Understands the offer quickly and sees how to wear it across the week.",
    positives: ["use-case clarity", "high purchase path clarity"],
    objections: ["less culturally memorable"],
    quotedReaction: "This is the one I would actually shop from.",
    resonanceScore: 4.0,
    conversionIntent: 4.6,
    signupIntent: 4.4,
    confidence: "medium",
    caveat: "Synthetic planning estimate. Not real audience research or market validation.",
  },
];

export const premortemReview: PremortemReview = {
  summary:
    "The campaign is most likely to fail if it becomes visually generic, hides the clothes behind concept, or overclaims synthetic audience insight.",
  routeRisks: [
    {
      routeId: "route-quiet-itinerary",
      risks: ["Too subtle to create launch energy", "Environmental shoot feels like a lookbook only"],
      mitigations: ["Add sharper copy hooks", "Use detail-led reels during launch week"],
    },
    {
      routeId: "route-between-addresses",
      risks: ["Concept becomes vague", "UGC mechanic gets low participation"],
      mitigations: ["Keep one simple prompt", "Seed examples with known local creatives"],
    },
    {
      routeId: "route-uniform-for-motion",
      risks: ["Feels like merchandising rather than campaign", "Lower cultural relevance"],
      mitigations: ["Borrow copy and visual codes from the stronger editorial route", "Anchor each outfit in a real city moment"],
    },
  ],
  overallRisks: ["Production delay compresses teaser window", "Pop-up uncertainty weakens local activation", "Budget limits retakes"],
  decisionWarnings: [
    "Scores are strategic estimates, not predictions.",
    "Synthetic reactions must never be presented as real customer research.",
  ],
};

function buildComparisonMatrix(scores: ReturnType<typeof scoreRoutes>): RouteComparisonMatrix {
  return compareRoutes({
    routes: campaignRoutes,
    simulations: personaSimulations,
    scores,
    premortemReview,
  });
}

function buildExecutionPlan(selectedRouteId: string): CampaignExecutionPlan {
  const selectedRoute = campaignRoutes.find((route) => route.id === selectedRouteId) ?? campaignRoutes[0];

  return {
    selectedRouteId: selectedRoute.id,
    selectedRouteName: selectedRoute.name,
    assumptions: ["Capsule name resolves by production week", "Pop-up remains optional", "Shoot budget stays below EUR7k"],
    objectives: ["Sell capsule", "Grow email list", "Increase cultural relevance without hype language"],
    channelPlan: [
      { channel: "Instagram", role: "Primary visual storytelling and launch traffic", cadence: "4 teasers, 5 launch posts, 6 follow-ups" },
      { channel: "Email", role: "Early access, edit framing, conversion", cadence: "Teaser, launch, last-call, post-launch story" },
      { channel: "TikTok", role: "Lightweight detail and movement clips", cadence: "3 restrained edits if assets are strong" },
    ],
    assetList: ["hero editorial stills", "route detail reels", "email header set", "product edit tiles", "pop-up poster template"],
    timeline: [
      { phase: "Teaser", timing: "T-14 to T-1", actions: ["Name reveal", "detail crops", "email waitlist"] },
      { phase: "Launch", timing: "Launch week", actions: ["Hero story", "product edits", "email early access", "route comparison for internal team"] },
      { phase: "Follow-up", timing: "T+7 to T+21", actions: ["styling proof", "customer saves", "pop-up or city note content"] },
    ],
    metrics: ["sell-through by product", "email signup conversion", "Instagram saves", "site sessions from social", "pop-up RSVP if confirmed"],
    risks: ["Visual subtlety may underperform", "Timeline delay may reduce teaser runway", "Pop-up uncertainty may confuse calls to action"],
    copyExamples: ["For days with more than one place in them.", "A quiet uniform for temporary coordinates."],
    nextActions: ["Confirm capsule name", "Lock pop-up decision", "Create shot list", "Define email signup incentive"],
  };
}

function buildTraceEvents(runId: string, status: "awaiting_selection" | "completed") {
  const completedBeforeSelection = [
    createTraceEvent({ runId, stageId: "workflow", type: "workflow.started", status: "running", message: "Campaign workflow started." }),
    createTraceEvent({ runId, stageId: "normalize_brief", type: "stage.completed", status: "completed", message: "Messy brief normalized.", outputSchema: "NormalizedCampaignBrief", durationMs: 120 }),
    createTraceEvent({ runId, stageId: "extract_strategic_tension", type: "stage.completed", status: "completed", message: "Strategic tension extracted.", outputSchema: "StrategicTension", durationMs: 80 }),
    createTraceEvent({ runId, stageId: "generate_routes", type: "stage.completed", status: "completed", message: "Three campaign routes generated.", outputSchema: "CampaignRoute[]", durationMs: 140 }),
    createTraceEvent({ runId, stageId: "build_personas", type: "stage.completed", status: "completed", message: "Synthetic personas built for simulation only.", outputSchema: "Persona[]", durationMs: 90 }),
    createTraceEvent({ runId, stageId: "simulate_reactions", type: "stage.completed", status: "completed", message: "Synthetic audience reactions simulated.", outputSchema: "PersonaSimulation[]", durationMs: 160 }),
    createTraceEvent({ runId, stageId: "score_routes", type: "stage.completed", status: "completed", message: "Routes scored as strategic estimates.", outputSchema: "RouteScore[]", durationMs: 40 }),
    createTraceEvent({ runId, stageId: "premortem_review", type: "stage.completed", status: "completed", message: "Pre-mortem risks and mitigations reviewed.", outputSchema: "PremortemReview", durationMs: 110 }),
    createTraceEvent({ runId, stageId: "compare_routes", type: "stage.completed", status: "completed", message: "Comparison matrix prepared for human route selection.", outputSchema: "RouteComparisonMatrix", durationMs: 35 }),
  ];

  if (status === "awaiting_selection") {
    return [
      ...completedBeforeSelection,
      createTraceEvent({ runId, stageId: "human_selection", type: "stage.pending", status: "pending", message: "Awaiting explicit human route selection.", inputSchema: "RouteComparisonMatrix", outputSchema: "HumanSelection" }),
      createTraceEvent({ runId, stageId: "generate_execution_plan", type: "stage.pending", status: "pending", message: "Execution plan is blocked until a human selects a route.", inputSchema: "CampaignRun + HumanSelection", outputSchema: "CampaignExecutionPlan" }),
      createTraceEvent({ runId, stageId: "export_artifact", type: "stage.pending", status: "pending", message: "Artifact export boundary is blocked until an execution plan exists.", inputSchema: "CampaignExecutionPlan + TraceEvent[]", outputSchema: "CampaignArtifact" }),
    ];
  }

  return [
    ...completedBeforeSelection,
    createTraceEvent({ runId, stageId: "human_selection", type: "stage.completed", status: "completed", message: "Mock human selection explicitly applied for demo.", outputSchema: "HumanSelection", durationMs: 10 }),
    createTraceEvent({ runId, stageId: "generate_execution_plan", type: "stage.completed", status: "completed", message: "Execution plan generated from selected route.", outputSchema: "CampaignExecutionPlan", durationMs: 130 }),
    createTraceEvent({ runId, stageId: "export_artifact", type: "stage.completed", status: "completed", message: "Export artifact boundary prepared; no PDF export is generated in demo mode.", outputSchema: "CampaignArtifact", durationMs: 20 }),
    createTraceEvent({ runId, stageId: "workflow", type: "workflow.completed", status: "completed", message: "Campaign workflow completed after human selection.", durationMs: 895 }),
  ];
}

export function buildMockCampaignRun(messyBrief = NODO_SAMPLE_BRIEF): CampaignRun {
  const now = new Date().toISOString();
  const runId = "mock-nodo-run";
  const scores = scoreRoutes(campaignRoutes, personaSimulations);

  return {
    id: runId,
    status: "awaiting_selection",
    createdAt: now,
    updatedAt: now,
    rawBrief: { text: messyBrief, source: "paste", receivedAt: now },
    normalizedBrief,
    strategicTension,
    routes: campaignRoutes,
    personas: campaignPersonas,
    simulations: personaSimulations,
    scores,
    premortem: premortemReview,
    comparisonMatrix: buildComparisonMatrix(scores),
    traceEvents: buildTraceEvents(runId, "awaiting_selection"),
    disclaimer:
      "Demo mode currently uses mocked strategy outputs. Synthetic persona reactions and route scores are strategic estimates for decision support, not real market research or success predictions.",
  };
}

export function buildMockCompletedCampaignRun(selectedRouteId = "route-quiet-itinerary", messyBrief = NODO_SAMPLE_BRIEF): CampaignRun {
  const now = new Date().toISOString();
  const runId = "mock-nodo-run";
  const scores = scoreRoutes(campaignRoutes, personaSimulations);

  return {
    id: runId,
    status: "completed",
    createdAt: now,
    updatedAt: now,
    rawBrief: { text: messyBrief, source: "paste", receivedAt: now },
    normalizedBrief,
    strategicTension,
    routes: campaignRoutes,
    personas: campaignPersonas,
    simulations: personaSimulations,
    scores,
    premortem: premortemReview,
    comparisonMatrix: buildComparisonMatrix(scores),
    humanSelection: {
      selectedRouteId,
      selectedBy: "mock_creative_lead",
      rationale: "Explicit demo selection by the creative lead before final plan generation.",
      selectedAt: now,
    },
    executionPlan: buildExecutionPlan(selectedRouteId),
    traceEvents: buildTraceEvents(runId, "completed"),
    disclaimer:
      "Demo mode currently uses mocked strategy outputs. Synthetic persona reactions and route scores are strategic estimates for decision support, not real market research or success predictions.",
  };
}
