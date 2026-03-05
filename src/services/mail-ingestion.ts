import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { db } from '@/db';
import { jobs, jobEmails } from '@/db/schema';
import { ilike, and, desc } from 'drizzle-orm';

export function normalizeSubject(subject: string): string {
  let s = subject;
  let prev: string;
  do {
    prev = s;
    s = s.replace(/^(re|fwd|fw)\s*:\s*/i, '').trim();
  } while (s !== prev);
  return s.toLowerCase();
}

export function getSearchSince(): Date {
  const since = new Date();
  since.setDate(since.getDate() - 10);
  return since;
}

const EmailClassificationSchema = z.object({
  isJobRelated: z
    .boolean()
    .describe(
      'Is this email job-related (recruiter outreach, application update, interview, offer, rejection)?',
    ),
  company: z
    .string()
    .nullable()
    .default('Unknown')
    .describe('Company name if detectable, else null'),
  jobTitle: z
    .string()
    .nullable()
    .default('Unknown')
    .describe('Job title if detectable, else null'),
  summary: z.string().describe('1-3 sentence summary of the email'),
});

const JobExtractionSchema = z.object({
  title: z.string().nullable().default('Unknown'),
  company: z.string().nullable().default('Unknown'),
  description: z.string().nullable().default(''),
  skills: z.array(z.string()).default([]),
  jobLocation: z.string().nullable().default(null),
});

function createImapClient() {
  return new ImapFlow({
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.YAHOO_IMAP_USER!,
      pass: process.env.YAHOO_IMAP_PASSWORD!, // App Password — NOT login password
    },
    logger: false, // suppress verbose IMAP protocol logs
  });
}

export async function runIngestion(): Promise<{
  fetched: number;
  jobRelated: number;
  matched: number;
  created: number;
}> {
  const folders = (process.env.YAHOO_MAIL_FOLDERS ?? 'INBOX')
    .split(',')
    .map((f) => f.trim());
  const maxEmails = parseInt(process.env.YAHOO_MAIL_MAX_EMAILS ?? '50', 10);
  const since = getSearchSince();
  const summary = { fetched: 0, jobRelated: 0, matched: 0, created: 0 };
  const client = createImapClient();

  await client.connect();
  try {
    for (const folder of folders) {
      // Pitfall 7: per-folder error catching — invalid folder name must not abort all ingestion
      let lock;
      try {
        lock = await client.getMailboxLock(folder);
      } catch {
        console.warn(`[mail-ingestion] Folder not found: ${folder}, skipping`);
        continue;
      }

      try {
        const uids =
          (await client.search({ seen: false, since }, { uid: true })) || [];
        const remaining = maxEmails - summary.fetched;
        const batch = uids.slice(0, remaining);
        const seenUids: number[] = [];

        for (const uid of batch) {
          // Pitfall 4: use null as part to get full RFC822 message for mailparser
          const { content } = await client.download(
            String(uid),
            null as unknown as string,
            {
              uid: true,
            },
          );
          const parsed = await simpleParser(content);

          const subject = parsed.subject ?? '';
          const sender = parsed.from?.text ?? '';
          const bodyText = parsed.text || parsed.html || '';
          const receivedAt = parsed.date ?? new Date();

          summary.fetched++;

          const classification = await chat({
            adapter: openaiText('gpt-5.2'),
            messages: [
              {
                role: 'user',
                content: `Subject: ${subject}\n\nFrom: ${sender}\n\n${bodyText.slice(0, 3000)}`,
              },
            ],
            systemPrompts: [
              'You are an email classifier for a job search assistant. Classify whether this email is job-related (recruiter outreach, job application update, interview invite, offer, rejection). Extract company and job title if present.',
            ],
            outputSchema: EmailClassificationSchema,
          });

          // All processed emails (job-related or not) get marked as read
          seenUids.push(uid as number);

          if (!classification.isJobRelated) {
            // Non-job email: skip, do not store. Mark as read later.
            continue;
          }

          summary.jobRelated++;

          const company = classification.company;
          const title = classification.jobTitle;
          let matchedJobId: string | null = null;

          // Pitfall 6: require non-null, non-Unknown values to avoid hallucination matches
          if (
            company &&
            title &&
            company !== 'Unknown' &&
            title !== 'Unknown'
          ) {
            const [match] = await db
              .select({ id: jobs.id })
              .from(jobs)
              .where(
                and(
                  ilike(jobs.company, `%${company}%`),
                  ilike(jobs.title, `%${title}%`),
                ),
              )
              .orderBy(desc(jobs.createdAt))
              .limit(1);
            matchedJobId = match?.id ?? null;
          }

          if (matchedJobId) {
            summary.matched++;
          } else {
            // Auto-create a new job from the email
            const extraction = await chat({
              adapter: openaiText('gpt-5.2'),
              messages: [{ role: 'user', content: bodyText.slice(0, 4000) }],
              systemPrompts: [
                'You are a job data extractor. Extract structured job information from this email for a job search tracker.',
              ],
              outputSchema: JobExtractionSchema,
            });
            const [newJob] = await db
              .insert(jobs)
              .values({
                title: extraction.title ?? 'Unknown',
                company: extraction.company ?? 'Unknown',
                description: extraction.description ?? bodyText.slice(0, 2000),
                source: 'email',
                status: 'generated-from-email',
                skills: extraction.skills,
                jobLocation: extraction.jobLocation,
              })
              .returning();
            matchedJobId = newJob.id;
            summary.created++;
          }

          // Pitfall 3: DB write BEFORE marking as read — if DB fails, email is re-fetched next run
          await db.insert(jobEmails).values({
            jobId: matchedJobId,
            source: 'yahoo',
            emailContent: bodyText,
            emailLlmSummarized: classification.summary,
            subject,
            sender,
            receivedAt,
          });
        }

        // Mark all processed emails as read AFTER DB writes complete
        if (seenUids.length > 0) {
          await client.messageFlagsAdd(seenUids, ['\\Seen'], { uid: true });
        }
      } finally {
        // Pitfall 2: always release the mailbox lock
        lock.release();
      }
    }
  } finally {
    // Pitfall 1/2: always logout regardless of errors
    await client.logout();
  }

  console.log('[mail-ingestion] Summary:', summary);
  return summary;
}

export async function fetchRawEmails(): Promise<
  Array<{
    subject: string;
    sender: string;
    receivedAt: Date;
    bodyText: string;
  }>
> {
  const folders = (process.env.YAHOO_MAIL_FOLDERS ?? 'INBOX')
    .split(',')
    .map((f) => f.trim());
  const since = getSearchSince();
  const results: Array<{
    subject: string;
    sender: string;
    receivedAt: Date;
    bodyText: string;
  }> = [];
  const client = createImapClient();

  await client.connect();
  try {
    for (const folder of folders) {
      let lock;
      try {
        lock = await client.getMailboxLock(folder);
      } catch {
        console.warn(`[mail-ingestion] Folder not found: ${folder}, skipping`);
        continue;
      }
      try {
        const uids = await client.search({ seen: false, since }, { uid: true });
        for (const uid of uids) {
          const { content } = await client.download(
            String(uid),
            null as unknown as string,
            {
              uid: true,
            },
          );
          const parsed = await simpleParser(content);
          results.push({
            subject: parsed.subject ?? '',
            sender: parsed.from?.text ?? '',
            receivedAt: parsed.date ?? new Date(),
            bodyText: parsed.text || parsed.html || '',
          });
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout();
  }
  return results;
}
