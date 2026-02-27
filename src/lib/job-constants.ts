export const JOB_STATUSES = [
  'new',
  'processed',
  'resume_generated',
  'applied',
  'answered',
  'scheduled_for_interview',
  'offer_received',
  'rejected',
  'withdrawn',
  'failed',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
