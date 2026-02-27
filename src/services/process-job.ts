import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export class JobProcessingError extends Error {
  constructor(
    public readonly jobId: string,
    cause: unknown,
  ) {
    super(`Job ${jobId} processing failed`);
    this.cause = cause;
  }
}

const ExtractionSchema = z.object({
  title: z.string().nullable().default('Unknown').describe('Job title'),
  company: z.string().nullable().default('Unknown').describe('Company name'),
  source: z
    .string()
    .nullable()
    .default('Unknown')
    .describe(
      'Job platform (e.g. "LinkedIn", "Indeed", "Glassdoor", "Company Website") — infer from the link URL domain when possible, otherwise null',
    ),
  salary: z
    .string()
    .nullable()
    .default('Unknown')
    .describe('Salary or compensation range if mentioned, otherwise null'),
  skills: z
    .array(z.string().default('Unknown').nullable())
    .describe('Required technical skills, tools, and technologies'),
  location: z
    .string()
    .nullable()
    .default('Unknown')
    .describe(
      'Job location such as city/state/country or "Remote", otherwise null',
    ),
});

async function extractJobData(job: typeof jobs.$inferSelect) {
  const userContent = [
    job.link ? `Job Link: ${job.link}` : null,
    `Job Description:\n${job.description}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return chat({
    adapter: openaiText('gpt-5.2'),
    messages: [{ role: 'user', content: userContent }],
    systemPrompts: [
      'You are a job posting parser. Extract structured information from the provided job description. Be precise and concise. Infer the job platform (source) from the link URL domain when available. Return null for any field that cannot be determined from the content.',
    ],
    outputSchema: ExtractionSchema,
  });
}

export async function processNextNewJob(): Promise<
  typeof jobs.$inferSelect | null
> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'new'))
      .orderBy(asc(jobs.createdAt))
      .limit(1)
      .for('update', { skipLocked: true });

    if (!job) return null;

    console.log(
      `[process-job] Claiming job id=${job.id} title="${job.title}"`,
    );

    let extracted: z.infer<typeof ExtractionSchema>;
    try {
      extracted = await extractJobData(job);
      console.log('[process-job] Extraction result:', JSON.stringify(extracted));
    } catch (err) {
      throw new JobProcessingError(job.id, err);
    }

    const [updated] = await tx
      .update(jobs)
      .set({
        title: extracted.title ?? job.title,
        company: extracted.company ?? job.company,
        source: extracted.source ?? job.source,
        salary: extracted.salary ?? null,
        skills: extracted.skills ?? [],
        jobLocation: extracted.location ?? null,
        status: 'processed',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id))
      .returning();

    console.log(`[process-job] Job id=${job.id} updated to 'processed'`);
    return updated;
  });
}

export async function processJobById(
  id: string,
): Promise<typeof jobs.$inferSelect | null> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return null;

  console.log(`[process-job] Processing job id=${job.id} title="${job.title}"`);

  const extracted = await extractJobData(job);
  console.log('[process-job] Extraction result:', JSON.stringify(extracted));

  const [updated] = await db
    .update(jobs)
    .set({
      title: extracted.title ?? job.title,
      company: extracted.company ?? job.company,
      source: extracted.source ?? job.source,
      salary: extracted.salary ?? null,
      skills: extracted.skills ?? [],
      jobLocation: extracted.location ?? null,
      status: 'processed',
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, job.id))
    .returning();

  console.log(`[process-job] Job id=${job.id} updated to 'processed'`);
  return updated;
}
