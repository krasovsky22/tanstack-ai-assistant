import { createFileRoute } from '@tanstack/react-router';
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';

const ExtractionSchema = z.object({
  title: z.string().describe('Job title'),
  company: z.string().describe('Company name'),
  source: z
    .string()
    .describe(
      'Job platform (e.g. "LinkedIn", "Indeed", "Glassdoor", "Company Website") — infer from the link URL domain when possible',
    ),
  salary: z
    .string()
    .nullable()
    .describe('Salary or compensation range if mentioned, otherwise null'),
  skills: z
    .array(z.string())
    .describe('Required technical skills, tools, and technologies'),
  location: z
    .string()
    .nullable()
    .describe(
      'Job location such as city/state/country or "Remote", otherwise null',
    ),
});

async function processJob(id?: string | null) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { db } = await import('@/db');
  const { jobs } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const [job] = id
    ? await db.select().from(jobs).where(eq(jobs.id, id)).limit(1)
    : await db
        .select()
        .from(jobs)
        .where(eq(jobs.status, 'new'))
        .limit(1);

  if (!job) {
    const message = id
      ? `Job ${id} not found`
      : 'No new jobs to process';
    return new Response(JSON.stringify({ message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userContent = [
    job.link ? `Job Link: ${job.link}` : null,
    `Job Description:\n${job.description}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const extracted = await chat({
    adapter: openaiText('gpt-5.2'),
    messages: [{ role: 'user', content: userContent }],
    outputSchema: ExtractionSchema,
  });

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

  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const Route = createFileRoute('/api/jobs/process')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        return processJob(id);
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const idFromQuery = url.searchParams.get('id');
        const body = await request.json().catch(() => ({}));
        const id = idFromQuery ?? body.id ?? null;
        return processJob(id);
      },
    },
  },
});
