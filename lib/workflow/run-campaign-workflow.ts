import { campaignRunSchema, type CampaignRun } from "@/lib/schemas/workflow";
import { buildMockCampaignRun } from "./mock-campaign-run";

export async function runCampaignWorkflow(messyBrief: string): Promise<CampaignRun> {
  const run = buildMockCampaignRun(messyBrief);
  return campaignRunSchema.parse(run);
}
