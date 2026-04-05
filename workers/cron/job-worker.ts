import 'dotenv/config';
import { workerData, parentPort } from 'node:worker_threads';
import { db } from '@/db';
import { indexCronjobResult } from '@/services/memory';
import { CONVERSATION_SOURCES } from '@/lib/conversation-sources';
import { cronjobs, cronjobLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { schedule, validate } from 'node-cron';
import type { ScheduledTask } from 'node-cron';

export interface JobWorkerData {
  id: string;
  name: string;
  prompt: string;
  cronExpression: string;
  userId: string | null;
}

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const job = workerData as JobWorkerData;

async function runCronjob() {
  const startTime = Date.now();
  const url = `${APP_URL}/api/chat-sync`;
  console.log(`[cron:worker] Firing job "${job.name}" (${job.id})`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: job.prompt }],
        title: `Cronjob: ${job.name}`,
        source: CONVERSATION_SOURCES.CRONJOB,
        userId: job.userId ?? undefined,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { text?: string; error?: string };
    const resultText = data.text ?? '';

    const [logRow] = await db
      .insert(cronjobLogs)
      .values({
        cronjobId: job.id,
        status: 'success',
        result: resultText,
        durationMs,
      })
      .returning();

    indexCronjobResult(logRow.id, job.id, job.name, resultText, null, 'success');

    await db
      .update(cronjobs)
      .set({ lastRunAt: new Date(), lastResult: resultText, updatedAt: new Date() })
      .where(eq(cronjobs.id, job.id));

    console.log(`[cron:worker] Job "${job.name}" succeeded in ${durationMs}ms`);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    const [errorLogRow] = await db
      .insert(cronjobLogs)
      .values({ cronjobId: job.id, status: 'error', error: errorMessage, durationMs })
      .returning();

    indexCronjobResult(errorLogRow.id, job.id, job.name, null, errorMessage, 'error');

    await db
      .update(cronjobs)
      .set({ lastRunAt: new Date(), lastResult: `ERROR: ${errorMessage}`, updatedAt: new Date() })
      .where(eq(cronjobs.id, job.id));

    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause : undefined;
    console.error(
      `[cron:worker] Job "${job.name}" failed in ${durationMs}ms: ${errorMessage}`,
      cause ? `\n  cause: ${cause instanceof Error ? cause.message : String(cause)}` : '',
    );
  }
}

if (!validate(job.cronExpression)) {
  console.error(`[cron:worker] Invalid cron expression for "${job.name}": ${job.cronExpression}`);
  process.exit(1);
}

let task: ScheduledTask | null = null;

function start() {
  task = schedule(job.cronExpression, () => {
    runCronjob().catch((err) => {
      console.error(`[cron:worker] Unhandled error in job "${job.name}":`, err);
    });
  });
  console.log(`[cron:worker] Scheduled "${job.name}" (${job.id}) with expression: ${job.cronExpression}`);
}

parentPort?.on('message', (msg: { type: string }) => {
  if (msg.type === 'stop') {
    task?.stop();
    console.log(`[cron:worker] Stopped job "${job.name}" (${job.id})`);
    process.exit(0);
  }
});

start();
