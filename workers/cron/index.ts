import 'dotenv/config';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { db } from '@/db';
import { cronjobs } from '@/db/schema';
import { validate } from 'node-cron';
import type { JobWorkerData } from './job-worker.ts';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
// Bootstrap .mjs registers tsx/esm hooks before importing the .ts worker
const WORKER_PATH = fileURLToPath(new URL('./job-worker-bootstrap.mjs', import.meta.url));

// Map of job ID → { worker, cronExpression } for change detection
const activeWorkers = new Map<string, { worker: Worker; cronExpression: string }>();

function spawnWorker(data: JobWorkerData): Worker {
  const worker = new Worker(WORKER_PATH, {
    execArgv: [], // prevent inheriting parent tsx loader flags
    workerData: data,
    env: { ...process.env },
  });

  worker.on('error', (err) => {
    console.error(`[cron] Worker error for job "${data.name}" (${data.id}):`, err);
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.warn(`[cron] Worker for job "${data.name}" (${data.id}) exited with code ${code}`);
    }
    // Clean up the map entry if the worker exits unexpectedly
    const entry = activeWorkers.get(data.id);
    if (entry?.worker === worker) {
      activeWorkers.delete(data.id);
    }
  });

  return worker;
}

function stopWorker(id: string) {
  const entry = activeWorkers.get(id);
  if (!entry) return;
  entry.worker.postMessage({ type: 'stop' });
  activeWorkers.delete(id);
}

async function syncJobs() {
  console.log('[cron] Syncing jobs from database...');

  const allJobs = await db.select().from(cronjobs);
  const activeJobIds = new Set<string>();

  for (const job of allJobs) {
    if (!job.isActive) {
      if (activeWorkers.has(job.id)) {
        stopWorker(job.id);
        console.log(`[cron] Stopped disabled job "${job.name}"`);
      }
      continue;
    }

    if (!validate(job.cronExpression)) {
      console.warn(`[cron] Skipping job "${job.name}" — invalid expression: ${job.cronExpression}`);
      continue;
    }

    activeJobIds.add(job.id);

    const existing = activeWorkers.get(job.id);

    // Reschedule if expression or prompt changed
    if (existing && existing.cronExpression !== job.cronExpression) {
      stopWorker(job.id);
      console.log(`[cron] Expression changed for "${job.name}", restarting worker...`);
    }

    if (!activeWorkers.has(job.id)) {
      const data: JobWorkerData = {
        id: job.id,
        name: job.name,
        prompt: job.prompt,
        cronExpression: job.cronExpression,
        userId: job.userId ?? null,
      };
      const worker = spawnWorker(data);
      activeWorkers.set(job.id, { worker, cronExpression: job.cronExpression });
    }
  }

  // Stop workers for jobs deleted from DB
  for (const [id] of activeWorkers) {
    if (!activeJobIds.has(id)) {
      stopWorker(id);
      console.log(`[cron] Removed deleted job (id: ${id})`);
    }
  }

  console.log(`[cron] Sync complete. Active workers: ${activeWorkers.size}`);
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

function shutdown() {
  console.log('[cron] Shutting down — stopping all workers...');
  for (const [id] of activeWorkers) {
    stopWorker(id);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  console.error('[cron] Fatal error:', err);
  process.exit(1);
});
