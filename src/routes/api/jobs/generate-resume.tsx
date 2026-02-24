import { createFileRoute } from '@tanstack/react-router';
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const ResumeSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe('0–100 score: how well this resume qualifies for the job'),
  matchReason: z
    .string()
    .describe('2-3 sentence explanation of the match score'),
  updatedResume: z
    .string()
    .describe('Full updated resume in markdown format, tailored to this job'),
  coverLetter: z
    .string()
    .describe('Professional cover letter in markdown format'),
});

async function generateResume(id?: string | null) {
  console.log('[generate-resume] Starting. id =', id ?? '(pick next processed)');

  if (!process.env.OPENAI_API_KEY) {
    console.error('[generate-resume] OPENAI_API_KEY not configured');
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
        .where(eq(jobs.status, 'processed'))
        .limit(1);

  if (!job) {
    const message = id
      ? `Job ${id} not found`
      : 'No processed jobs to generate resume for';
    console.warn('[generate-resume]', message);
    return new Response(JSON.stringify({ message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[generate-resume] Found job: "${job.title}" at ${job.company} (${job.id})`);

  const resumeFilePath = join(process.cwd(), 'files', 'resume', 'initial-resume.md');
  console.log('[generate-resume] Reading resume from', resumeFilePath);
  const resumeContent = await readFile(resumeFilePath, 'utf-8');
  console.log(`[generate-resume] Resume loaded (${resumeContent.length} chars)`);

  const jobDetails = [
    `Job Title: ${job.title}`,
    `Company: ${job.company}`,
    job.jobLocation ? `Location: ${job.jobLocation}` : null,
    job.salary ? `Salary: ${job.salary}` : null,
    job.skills?.length ? `Required Skills: ${job.skills.join(', ')}` : null,
    job.link ? `Job Link: ${job.link}` : null,
    `\nJob Description:\n${job.description}`,
  ]
    .filter(Boolean)
    .join('\n');

  const userContent = `Here is my current resume:\n\n${resumeContent}\n\n---\n\nHere is the job I am applying for:\n\n${jobDetails}`;

  console.log('[generate-resume] Calling LLM...');
  const result = await chat({
    adapter: openaiText('gpt-5.2'),
    messages: [{ role: 'user', content: userContent }],
    systemPrompts: [
      'You are an expert career coach and resume writer. Your job is to analyze a candidate\'s resume against a job posting, compute a match score, tailor the resume to better fit the job requirements, and write a compelling cover letter. Keep the resume truthful — only reframe and emphasize existing experience, never fabricate skills or experience.',
    ],
    outputSchema: ResumeSchema,
  });
  console.log(`[generate-resume] LLM done. matchScore=${result.matchScore}, reason="${result.matchReason}"`);
  console.log(`[generate-resume] Resume length: ${result.updatedResume.length} chars, Cover letter length: ${result.coverLetter.length} chars`);

  const outputDir = join(process.cwd(), 'public', 'generated', job.id);
  console.log('[generate-resume] Writing files to', outputDir);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'resume.md'), result.updatedResume, 'utf-8');
  await writeFile(join(outputDir, 'cover-letter.md'), result.coverLetter, 'utf-8');
  console.log('[generate-resume] Files written successfully');

  const resumeUrlPath = `/generated/${job.id}/resume.md`;
  const coverLetterUrlPath = `/generated/${job.id}/cover-letter.md`;

  const [updated] = await db
    .update(jobs)
    .set({
      status: 'resume_generated',
      matchScore: result.matchScore,
      resumePath: resumeUrlPath,
      coverLetterPath: coverLetterUrlPath,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, job.id))
    .returning();

  console.log('[generate-resume] DB updated. Job status → resume_generated');
  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const Route = createFileRoute('/api/jobs/generate-resume')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        return generateResume(id);
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const idFromQuery = url.searchParams.get('id');
        const body = await request.json().catch(() => ({}));
        const id = idFromQuery ?? body.id ?? null;
        return generateResume(id);
      },
    },
  },
});
