import 'dotenv/config';

// ─── Dynamic imports AFTER env vars are set ───────────────────────────────
// Load @/db first so subsequent service imports get the cached, initialized db.
const { db } = await import('@/db');
const { jobs } = await import('@/db/schema');
const { eq } = await import('drizzle-orm');
const { processNextNewJob, JobProcessingError } = await import(
  '@/services/process-job'
);
const { generateResumeForNextProcessedJob, ResumeGenerationError } =
  await import('@/services/generate-resume');

// ─── Worker config ────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 30_000;
const MAX_RETRIES = 3;

let running = true;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function handleJobFailure(
  jobId: string,
  resetStatus: string,
  err: unknown,
) {
  const [current] = await db
    .select({ retryCount: jobs.retryCount })
    .from(jobs)
    .where(eq(jobs.id, jobId));

  const newRetryCount = (current?.retryCount ?? 0) + 1;
  const errorMessage = err instanceof Error ? err.message : String(err);

  if (newRetryCount >= MAX_RETRIES) {
    await db
      .update(jobs)
      .set({
        status: 'failed',
        retryCount: newRetryCount,
        errorMessage,
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
    console.error(
      `[worker] Job ${jobId} permanently FAILED after ${newRetryCount} attempts: ${errorMessage}`,
    );
  } else {
    await db
      .update(jobs)
      .set({
        status: resetStatus,
        retryCount: newRetryCount,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
    console.warn(
      `[worker] Job ${jobId} failed (attempt ${newRetryCount}/${MAX_RETRIES}), will retry next poll`,
    );
  }
}

async function tick(): Promise<boolean> {
  let didWork = false;

  // Phase 1: process a 'new' job
  try {
    const job = await processNextNewJob();
    if (job) {
      console.log(`[worker] Processed job ${job.id} → status: ${job.status}`);
      didWork = true;
    }
  } catch (err) {
    if (err instanceof JobProcessingError) {
      await handleJobFailure(err.jobId, 'new', err.cause ?? err);
      didWork = true;
    } else {
      console.error('[worker] Unexpected error in process phase:', err);
    }
  }

  // Phase 2: generate resume for a 'processed' job
  try {
    const job = await generateResumeForNextProcessedJob();
    if (job) {
      console.log(
        `[worker] Generated resume for job ${job.id} → status: ${job.status}`,
      );
      didWork = true;
    }
  } catch (err) {
    if (err instanceof ResumeGenerationError) {
      await handleJobFailure(err.jobId, 'processed', err.cause ?? err);
      didWork = true;
    } else {
      console.error('[worker] Unexpected error in resume phase:', err);
    }
  }

  return didWork;
}

async function run() {
  console.log('[worker] Starting polling worker...');

  while (running) {
    const didWork = await tick();
    if (!running) break;
    if (!didWork) {
      console.log(
        `[worker] No work found. Sleeping ${POLL_INTERVAL_MS / 1000}s...`,
      );
      await sleep(POLL_INTERVAL_MS);
    }
    // If work was done, loop immediately to drain the queue
  }

  console.log('[worker] Shutting down gracefully.');
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\n[worker] SIGINT received, stopping after current job...');
  running = false;
});
process.on('SIGTERM', () => {
  console.log('[worker] SIGTERM received, stopping after current job...');
  running = false;
});

run().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
