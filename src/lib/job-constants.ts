export const JOB_STATUSES = [
  'new',
  'processed',
  'applied',
  'answered',
  'scheduled_for_interview',
  'offer_received',
  'rejected',
  'withdrawn',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
