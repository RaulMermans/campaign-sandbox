export class CampaignRunStageError extends Error {
  readonly stageId: string;
  readonly cause: unknown;

  constructor(stageId: string, cause: unknown) {
    super(`Campaign run failed at stage: ${stageId}`);
    this.name = "CampaignRunStageError";
    this.stageId = stageId;
    this.cause = cause;
  }
}
