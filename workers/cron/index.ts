import 'dotenv/config';

// ─── Dynamic imports AFTER env vars are set ───────────────────────────────
const { db } = await import('@/db');
const { cronjobs, cronjobLogs } = await import('@/db/schema');
const { eq } = await import('drizzle-orm');
const { schedule, validate } = await import('node-cron');
import type { ScheduledTask } from 'node-cron';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Map of job ID → { task, cronExpression } for change detection
const scheduledTasks = new Map<string, { task: ScheduledTask; cronExpression: string }>();

async function runCronjob(job: { id: string; name: string; prompt: string }) {
  const startTime = Date.now();
  console.log(`[cron] Firing job "${job.name}" (${job.id})`);

  try {
    const res = await fetch(`${APP_URL}/api/chat-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: job.prompt }],
        title: `Cronjob: ${job.name}`,
        source: 'cronjob',
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json() as { text?: string; error?: string };
    const resultText = data.text ?? '';

    await db.insert(cronjobLogs).values({
      cronjobId: job.id,
      status: 'success',
      result: resultText,
      durationMs,
    });

    await db
      .update(cronjobs)
      .set({ lastRunAt: new Date(), lastResult: resultText, updatedAt: new Date() })
      .where(eq(cronjobs.id, job.id));

    console.log(`[cron] Job "${job.name}" succeeded in ${durationMs}ms`);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    await db.insert(cronjobLogs).values({
      cronjobId: job.id,
      status: 'error',
      error: errorMessage,
      durationMs,
    });

    await db
      .update(cronjobs)
      .set({ lastRunAt: new Date(), lastResult: `ERROR: ${errorMessage}`, updatedAt: new Date() })
      .where(eq(cronjobs.id, job.id));

    console.error(`[cron] Job "${job.name}" failed in ${durationMs}ms: ${errorMessage}`);
  }
}

async function syncJobs() {
  console.log('[cron] Syncing jobs from database...');

  const allJobs = await db.select().from(cronjobs);
  const activeJobIds = new Set<string>();

  for (const job of allJobs) {
    if (!job.isActive) {
      // Stop if it was previously scheduled
      if (scheduledTasks.has(job.id)) {
        scheduledTasks.get(job.id)!.task.stop();
        scheduledTasks.delete(job.id);
        console.log(`[cron] Stopped disabled job "${job.name}"`);
      }
      continue;
    }

    activeJobIds.add(job.id);

    if (!validate(job.cronExpression)) {
      console.warn(`[cron] Skipping job "${job.name}" — invalid expression: ${job.cronExpression}`);
      continue;
    }

    const existing = scheduledTasks.get(job.id);

    // Reschedule if expression changed
    if (existing && existing.cronExpression !== job.cronExpression) {
      existing.task.stop();
      scheduledTasks.delete(job.id);
      console.log(`[cron] Expression changed for "${job.name}", rescheduling...`);
    }

    if (!scheduledTasks.has(job.id)) {
      const task = schedule(job.cronExpression, () => {
        runCronjob({ id: job.id, name: job.name, prompt: job.prompt }).catch((err) => {
          console.error(`[cron] Unhandled error in job "${job.name}":`, err);
        });
      });
      scheduledTasks.set(job.id, { task, cronExpression: job.cronExpression });
      console.log(`[cron] Scheduled "${job.name}" with expression: ${job.cronExpression}`);
    }
  }

  // Stop tasks for jobs that were deleted from DB entirely
  for (const [id, { task }] of scheduledTasks) {
    if (!activeJobIds.has(id)) {
      task.stop();
      scheduledTasks.delete(id);
      console.log(`[cron] Removed deleted job (id: ${id})`);
    }
  }

  console.log(`[cron] Sync complete. Active scheduled jobs: ${scheduledTasks.size}`);
}

async function start() {
  console.log('[cron] Starting cron worker...');

  await syncJobs();

  setInterval(() => {
    syncJobs().catch((err) => {
      console.error('[cron] Error during job sync:', err);
    });
  }, SYNC_INTERVAL_MS);

  console.log(`[cron] Polling for job changes every ${SYNC_INTERVAL_MS / 1000}s`);
}

process.on('SIGINT', () => {
  console.log('\n[cron] SIGINT received, shutting down...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('[cron] SIGTERM received, shutting down...');
  process.exit(0);
});

start().catch((err) => {
  console.error('[cron] Fatal error:', err);
  process.exit(1);
});
