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

import { NODO_SAMPLE_BRIEF } from "@/lib/sample-briefs";
export { NODO_SAMPLE_BRIEF };

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
  budget: { min: 3000, max: 7000, currency: "EUR", label: "EUR 3,000–7,000", notes: "Low to medium production budget excluding product." },
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
  audienceDesire: "Clothes that make mobile, creative work feel intentional and considered — not loud or performative",
  audienceResistance:
    "Any campaign language that mirrors startup hustle culture, obvious travel codes, or influencer aesthetics they already filter out",
  brandProofChallenge:
    "NODO must show that premium daily wear belongs in transitional moments without borrowing the visual codes of travel or wellness brands",
  creativeTrap:
    "Over-aestheticising the in-between moment into a slow-living brand — soft light, linen, candles — that erases the real friction of creative work",
  tensionStatement:
    "Audience wants clothes that make flexible work feel considered, but resists any brand that dramatises that flexibility. The brand must prove wearability in real transitional city moments without falling into aesthetic cliché.",
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
    enemy: "Generic travel aesthetics that romanticise transit instead of inhabiting it",
    visualWorld: [
      "tight environmental stills — stairwells, cafe counters, studio windows at 4pm",
      "hands holding things: keys, espresso cups, notebooks — never posed",
      "city surfaces as negative space: concrete, tile, warm interior shadow",
    ],
    proofMechanism:
      "Garments shot in real transitional city spaces with no travel codes — no luggage, no horizon lines, no departure boards",
    channelFit: ["Instagram carousel (stillness and detail reward the format)", "email editorial", "website lookbook"],
    killerLine: "For days with more than one place in them.",
    failureMode:
      "If the photography is merely pretty rather than precise, the route collapses into a generic lookbook and loses all strategic specificity",
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
    enemy: "The fiction that creative workers are always exactly where they should be",
    visualWorld: [
      "portrait diptychs: two cities, same person, same clothes",
      "fragmented artefacts — annotated maps, voice memo screenshots, desk notes",
      "street-level city corners in Madrid, Lisbon, Barcelona — not tourist views",
    ],
    proofMechanism:
      "Participation mechanics that invite real people to submit their own 'between addresses' moment — the product appears as a consistent anchor across submissions",
    channelFit: ["Instagram Reels (portrait participation format)", "email essay series", "printed city poster drops"],
    killerLine: "You are not lost. You are between addresses.",
    failureMode:
      "If the participation prompt is too loose or the product disappears behind the concept, the campaign becomes a cultural project without a commercial engine",
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
    enemy: "The daily decision tax: what to wear to be presentable across too many different contexts",
    visualWorld: [
      "styled complete outfits photographed in sequence across three real city contexts",
      "clean, warm light — interior rather than exterior",
      "product as the constant in a changing day: same shirt, different desk",
    ],
    proofMechanism:
      "Named uniform edits (cafe-to-studio, desk-to-dinner) with shoppable direct links — the brand proves versatility by building the outfits for you",
    channelFit: [
      "Instagram shopping (product tags on outfits)",
      "email early access with outfit bundle CTAs",
      "site product pages structured as editorial edits",
    ],
    killerLine: "Dinner, without the daily outfit negotiation.",
    failureMode:
      "If copy defaults to direct-response language or the brand voice slips into catalog tone, the route loses all premium positioning and becomes indistinguishable from fast fashion",
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
    understoodMessage: "NODO makes clothes for people who move through cities with intention — no drama, no performance",
    mainObjection: "The campaign may not feel distinct enough to justify choosing NODO over a similar premium brand she already buys",
    actionTrigger:
      "Seeing a specific garment styled in a context that matches her actual week — not a mood board but a recognisable city moment",
    bestCTA: "Shop the capsule — early access for a limited window",
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
    understoodMessage: "This is aspirational fashion that belongs in real city life, not in an edited travel reel",
    mainObjection: "The price point is higher than his current comfort zone and the creative direction feels more editorial than approachable",
    actionTrigger: "A single starter piece — an oversized shirt or bag — clearly photographed with a direct price point visible",
    bestCTA: "Start with one piece — the [product name] at EUR [price]",
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
    understoodMessage: "These are clothes that handle a flexible, multi-context day without requiring extra effort",
    mainObjection: "No clear reason to act now — the campaign feels like something to revisit rather than something to buy today",
    actionTrigger: "An explicit outfit recommendation — 'if your week looks like X, this is the edit' — that removes decision friction",
    bestCTA: "Build your uniform — three pieces, one flexible week",
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
    understoodMessage: "NODO has a point of view about how creative people actually live and move — this brand sees me",
    mainObjection:
      "The campaign concept is strong but if execution is loose or the product is hidden, it becomes brand noise rather than a brand reason to buy",
    actionTrigger: "Seeing her kind of person wear the product in a specific, accurate city context that the participation mechanic makes feel real",
    bestCTA: "Submit your between-addresses moment — and see the collection",
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
    understoodMessage: "This brand is for people who move between cities and contexts — the copy feels like it was written about my actual week",
    mainObjection:
      "High aesthetic resonance does not automatically translate to purchase if the product is not clearly visible and the price feels distant from student budgets",
    actionTrigger: "A share or repost mechanic with a prize or early-access incentive — lower commitment than purchase",
    bestCTA: "Share your between-addresses — first 100 submissions get early capsule access",
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
    understoodMessage: "NODO understands the fragmented week — this brand is relevant to how I actually live",
    mainObjection: "Concept resonance is high but product clarity is low — she understands the idea but cannot clearly identify what to buy",
    actionTrigger: "An email that connects the campaign concept to a specific curated outfit for her context — startup to dinner",
    bestCTA: "The remote week edit — curated for your kind of flexible Friday",
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
    understoodMessage: "NODO is offering practical premium fashion that solves a real wardrobe problem for people with multi-context days",
    mainObjection:
      "The route may read as too straightforwardly commercial — she associates NODO with editorial restraint, not catalog clarity",
    actionTrigger:
      "A product bundle framed with enough creative language to keep the premium register intact — not just 'shop the look'",
    bestCTA: "The cafe-to-studio edit — three pieces for a day with two addresses",
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
    understoodMessage: "NODO sells complete outfits that work across a modern flexible day — clear, practical, premium",
    mainObjection:
      "The route does not give him a strong enough cultural or identity reason to choose NODO over a comparable brand at a similar price point",
    actionTrigger: "One anchor product — a bag or oversized shirt — that feels like an entry point into the NODO world without committing to a full uniform",
    bestCTA: "Start with the bag — the rest of the edit follows naturally",
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
    understoodMessage: "NODO has built an outfit system for people like me — flexible, presentable, and not high-maintenance",
    mainObjection: "The main barrier is price justification — she needs to believe the pieces will last and work across enough contexts to be worth EUR 80–220",
    actionTrigger: "A clear cost-per-wear or outfit versatility argument presented without sounding like a sale pitch",
    bestCTA: "Three pieces, five days — see the uniform",
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
  topFailureRisks: [
    {
      risk: "Generic visual execution erases strategic specificity",
      whyItHappens:
        "Small production budgets create pressure to use stock-adjacent photography or over-polished commercial shots that feel indistinguishable from any premium basics brand",
      earlyWarningSign: "Shot list defaults to clean-background product tiles without any city environmental context",
      mitigation: "Lock the visual brief before production begins — specific locations, surfaces, and lighting conditions are non-negotiable",
      affectedTeam: "Creative / Photography",
    },
    {
      risk: "Synthetic audience insights are presented as research in client-facing documents",
      whyItHappens:
        "Planning documents that cite simulation scores without clear caveats can be mistaken for validated audience research by stakeholders reviewing summaries",
      earlyWarningSign: "Deck references 'audience data showing X%' without the synthetic planning label",
      mitigation: "Add a synthetic-data disclaimer to every output document that references persona scores or simulation results",
      affectedTeam: "Strategy / Client Services",
    },
    {
      risk: "Pop-up activation is built into launch communications before the city is confirmed",
      whyItHappens:
        "Teams under launch pressure include the pop-up as a live CTA to drive urgency — then must retract or redirect when the location falls through",
      earlyWarningSign: "Launch email draft references a specific city or venue before internal confirmation is received",
      mitigation: "Keep pop-up references modular — produce optional versions of all launch assets that can be inserted only once confirmed",
      affectedTeam: "Operations / Content",
    },
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
    planTitle: `${selectedRoute.name} — Execution Plan`,
    strategicSummary: `${selectedRoute.concept} This plan focuses on ${selectedRoute.strategicRole} positioning with a restrained, editorial approach suited to the NODO audience.`,
    assumptions: [
      "Capsule name resolves by production week",
      "Pop-up remains optional and does not anchor the primary campaign",
      "Shoot budget stays below EUR 7,000 excluding product",
      "Synthetic audience reactions are planning hypotheses only and have not been validated with real customers",
    ],
    launchPhases: [
      {
        phase: "Teaser",
        objective: "Build anticipation and grow the email waitlist without revealing the full capsule",
        timing: "T-14 to T-1",
        keyActions: ["Name reveal post", "detail crop series", "email waitlist gate"],
        deliverables: ["Teaser carousel (3 posts)", "Waitlist landing page", "Email signup form"],
      },
      {
        phase: "Launch",
        objective: "Drive initial sales and direct traffic from editorial storytelling",
        timing: "Launch week",
        keyActions: ["Hero editorial story", "product edit tiles", "email early access to waitlist", "pop-up RSVP if confirmed"],
        deliverables: ["Hero story (5 posts)", "Product edit carousel", "Early access email", "Launch email"],
      },
      {
        phase: "Follow-up",
        objective: "Sustain engagement and convert remaining intent through proof and community",
        timing: "T+7 to T+21",
        keyActions: ["Styling proof posts", "customer saves content", "pop-up or city note content if applicable"],
        deliverables: ["3 follow-up posts", "Post-launch email", "Optional pop-up recap"],
      },
    ],
    channelPlan: [
      {
        channel: "Instagram",
        role: "Primary visual storytelling and launch traffic",
        recommendedAssets: ["hero editorial stills", "detail reels", "product edit carousels"],
        notes: "4 teasers, 5 launch posts, 6 follow-ups — restrained cadence consistent with brand tone",
      },
      {
        channel: "Email",
        role: "Early access, editorial framing, and conversion",
        recommendedAssets: ["email header set", "waitlist confirmation", "early access template", "last-call template"],
        notes: "Teaser → launch → last-call → post-launch story sequence",
      },
      {
        channel: "TikTok",
        role: "Lightweight movement and detail clips if assets allow",
        recommendedAssets: ["short product detail edits", "behind-the-scenes clips"],
        notes: "3 restrained edits only if assets are strong — avoid forced or performative content",
      },
    ],
    assetList: [
      "hero editorial stills (city transitional spaces: stairwells, cafe counters, studio corners)",
      "detail crop series (product texture and construction)",
      "product edit tiles (individual item, clean background)",
      "email header set (desktop and mobile)",
      "pop-up poster template (if city is confirmed)",
    ],
    copyExamples: [
      "For days with more than one place in them.",
      "A quiet uniform for temporary coordinates.",
      "Between meetings. Between cities. Between versions of the same plan.",
    ],
    measurementPlan: [
      { metric: "Sell-through rate by product", purpose: "Understand which products drove actual purchase conversion" },
      { metric: "Email signup conversion", purpose: "Measure campaign's ability to build owned audience" },
      { metric: "Instagram saves per post", purpose: "Proxy for genuine interest vs. passive scroll" },
      { metric: "Site sessions from social", purpose: "Attribute traffic and assess content effectiveness" },
      { metric: "Pop-up RSVP count (if confirmed)", purpose: "Gauge local event intent before confirming city" },
    ],
    risksAndMitigations: [
      {
        risk: "Visual subtlety may underperform in algorithmic feeds that reward high-contrast or high-energy content",
        mitigation: "Prioritise saves and shares as success metrics over reach — test one bolder post to compare without abandoning brand tone",
      },
      {
        risk: "Timeline delay may reduce teaser runway and compress launch pressure",
        mitigation: "Define a minimum teaser window of 5 days and identify which assets can be repurposed if production slips",
      },
      {
        risk: "Pop-up uncertainty may confuse calls to action if the city is not confirmed before launch",
        mitigation: "Keep pop-up messaging optional and layer it in only once confirmed — do not anchor the main campaign to it",
      },
    ],
    nextActions: [
      "Confirm capsule name before teaser window opens",
      "Lock pop-up city decision at least 10 days before launch",
      "Create final shot list aligned to selected route creative territory",
      "Define email signup incentive (early access, editorial PDF, or discount)",
      "Brief photographer with route concept and tone guidance",
    ],
    heroVisualSystem:
      "City transitional spaces — stairwells, cafe counters, studio window corners — shot with tight framing, warm interior light, and no travel codes. Garments appear as the consistent anchor across changing environments.",
    shootList: [
      "Exterior stairwell: oversized shirt, natural light, concrete wall — 3 angles",
      "Cafe counter interior: shirt + trouser + bag, espresso in hand — 2 stills + 1 detail reel",
      "Studio window seat: knitwear, golden hour light, notebook on table — 3 angles",
      "Street-level city corner (Madrid or Lisbon): full look, unposed — 2 stills",
      "Detail series: fabric texture, hem, bag hardware, collar construction — 6 tight crops",
      "Flat lay: receipt, keys, coffee token, campaign card alongside garment — 2 setups",
    ],
    oohHeadlines: [
      "For days with more than one place in them.",
      "Between meetings. Between cities. Between versions of the plan.",
      "A shirt for the second address of the day.",
      "Quiet uniform. Moving city.",
    ],
    paidSocialHooks: [
      "You know that moment between the studio and the dinner — NODO is built for that.",
      "The oversized shirt that travels between three different desks without announcing itself.",
      "For people whose days don't start or end in one place. The new NODO capsule.",
      "No airport. No suitcase. Just the capsule for moving through your city with intention.",
    ],
    landingPageBlocks: [
      {
        block: "Hero",
        purpose: "Establish brand territory and campaign concept immediately",
        content:
          "Full-bleed editorial still. Headline: 'For days with more than one place in them.' Subheadline: 'The NODO capsule — available [date].' Single CTA: Join the waitlist.",
      },
      {
        block: "Tension statement",
        purpose: "Articulate the campaign point of view in 2–3 sentences before the product appears",
        content:
          "Cities move faster than calendars. NODO is for the day that starts in the studio and ends somewhere you hadn't planned. Dressed for every version of it.",
      },
      {
        block: "Product edit",
        purpose: "Present the capsule as a curated system, not a product list",
        content:
          "Three outfit configurations: Cafe-to-Studio / Desk-to-Dinner / Day-to-Pop-up. Each configuration shows 3–4 pieces with a single 'Shop this uniform' CTA.",
      },
      {
        block: "Social proof placeholder",
        purpose: "Reserve space for real customer submissions or editorial coverage after launch week",
        content:
          "[Placeholder for 2–3 customer photos or editorial mentions to be inserted post-launch. Do not use synthetic reactions as social proof.]",
      },
      {
        block: "Email capture",
        purpose: "Convert interest into owned audience before and after launch",
        content:
          "Headline: 'Early access. No noise.' Body: 'First look at the capsule before the public drop. No commitment. Unsubscribe anytime.' CTA: Get early access.",
      },
    ],
    legalSubstantiationChecklist: [
      "Time claims (e.g. 'for the day') — confirm no implied durability or performance guarantee",
      "Sustainability claims — do not use 'sustainable', 'eco', or 'responsible' unless materials are certified and documentation is on file",
      "Price claims — any 'value', 'worth', or 'cost-per-wear' framing requires review before publication",
      "Behavior change claims — no copy should imply the capsule changes how audiences work or live; frame as enabling not transforming",
      "Pop-up event claims — include only if venue is contractually confirmed; remove or modularise if unconfirmed",
      "Synthetic research disclaimer — any document citing persona resonance scores must include the label: 'Synthetic planning estimates. Not real audience research.'",
    ],
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
