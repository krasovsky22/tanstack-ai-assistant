import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export class ResumeGenerationError extends Error {
  constructor(
    public readonly jobId: string,
    cause: unknown,
  ) {
    super(`Resume generation failed for job ${jobId}`);
    this.cause = cause;
  }
}

const CHROME_PATH =
  process.env.CHROME_EXECUTABLE_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function markdownToPdf(markdown: string): Promise<Buffer> {
  const html = await marked(markdown);
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.5; max-width: 800px; margin: 40px auto; color: #111; }
    h1 { font-size: 18pt; border-bottom: 2px solid #333; padding-bottom: 4px; }
    h2 { font-size: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-top: 20px; }
    h3 { font-size: 12pt; margin-bottom: 4px; }
    ul { margin: 4px 0; padding-left: 20px; }
    li { margin: 2px 0; }
    p { margin: 6px 0; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    a { color: #1a0dab; }
  </style></head><body>${html}</body></html>`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'Letter',
      margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
      printBackground: false,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

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

async function runResumeGeneration(job: typeof jobs.$inferSelect) {
  const resumeFilePath = join(process.cwd(), 'files', 'resume', 'initial-resume.md');
  console.log('[generate-resume] Reading resume from', resumeFilePath);
  const resumeContent = await readFile(resumeFilePath, 'utf-8');

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
      "You are an expert career coach and resume writer. Your job is to analyze a candidate's resume against a job posting, compute a match score, tailor the resume to better fit the job requirements, and write a compelling cover letter. Keep the resume truthful — only reframe and emphasize existing experience, never fabricate skills or experience.",
    ],
    outputSchema: ResumeSchema,
  });
  console.log(
    `[generate-resume] LLM done. matchScore=${result.matchScore}, reason="${result.matchReason}"`,
  );

  const outputDir = join(process.cwd(), 'public', 'generated', job.id);
  console.log('[generate-resume] Writing files to', outputDir);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'resume.md'), result.updatedResume, 'utf-8');
  await writeFile(join(outputDir, 'cover-letter.md'), result.coverLetter, 'utf-8');

  // Index generated file content into Elasticsearch (fire-and-forget)
  const { indexDocument } = await import('@/services/elasticsearch');
  void indexDocument('memory_generated_files', `${job.id}-resume`, {
    fileId: `${job.id}-resume`,
    filename: 'resume.md',
    content: result.updatedResume,
    mimeType: 'text/markdown',
    source_type: 'generated_file',
    createdAt: new Date().toISOString(),
  });
  void indexDocument('memory_generated_files', `${job.id}-cover-letter`, {
    fileId: `${job.id}-cover-letter`,
    filename: 'cover-letter.md',
    content: result.coverLetter,
    mimeType: 'text/markdown',
    source_type: 'generated_file',
    createdAt: new Date().toISOString(),
  });

  console.log('[generate-resume] Generating PDF...');
  const pdfBuffer = await markdownToPdf(result.updatedResume);
  await writeFile(join(outputDir, 'resume.pdf'), pdfBuffer);
  console.log('[generate-resume] Files written successfully');

  return {
    matchScore: result.matchScore,
    resumePath: `/generated/${job.id}/resume.md`,
    resumePdfPath: `/generated/${job.id}/resume.pdf`,
    coverLetterPath: `/generated/${job.id}/cover-letter.md`,
  };
}

export async function generateResumeForNextProcessedJob(): Promise<
  typeof jobs.$inferSelect | null
> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.status, 'processed'))
      .orderBy(asc(jobs.createdAt))
      .limit(1)
      .for('update', { skipLocked: true });

    if (!job) return null;

    console.log(
      `[generate-resume] Claiming job id=${job.id} title="${job.title}"`,
    );

    let paths: Awaited<ReturnType<typeof runResumeGeneration>>;
    try {
      paths = await runResumeGeneration(job);
    } catch (err) {
      throw new ResumeGenerationError(job.id, err);
    }

    const [updated] = await tx
      .update(jobs)
      .set({
        status: 'resume_generated',
        matchScore: paths.matchScore,
        resumePath: paths.resumePath,
        resumePdfPath: paths.resumePdfPath,
        coverLetterPath: paths.coverLetterPath,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id))
      .returning();

    console.log(`[generate-resume] Job id=${job.id} updated to 'resume_generated'`);
    return updated;
  });
}

export async function generateResumeForJobById(
  id: string,
): Promise<typeof jobs.$inferSelect | null> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return null;

  console.log(
    `[generate-resume] Generating resume for job id=${job.id} title="${job.title}"`,
  );

  const paths = await runResumeGeneration(job);

  const [updated] = await db
    .update(jobs)
    .set({
      status: 'resume_generated',
      matchScore: paths.matchScore,
      resumePath: paths.resumePath,
      resumePdfPath: paths.resumePdfPath,
      coverLetterPath: paths.coverLetterPath,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, job.id))
    .returning();

  console.log(`[generate-resume] Job id=${job.id} updated to 'resume_generated'`);
  return updated;
}
