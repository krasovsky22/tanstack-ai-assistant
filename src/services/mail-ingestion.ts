import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
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

export interface RawEmail {
  subject: string;
  sender: string;
  receivedAt: Date;
  bodyText: string;
}

export interface ClassifiedEmail {
  subject: string;
  sender: string;
  receivedAt: Date;
  bodyText: string;
  isJobRelated: boolean;
  company?: string | null;
  jobTitle?: string | null;
  summary?: string | null;
  // Populated by LLM only when no existing job matches and a new one should be created
  extractedTitle?: string | null;
  extractedCompany?: string | null;
  extractedDescription?: string | null;
  extractedSkills?: string[];
  extractedJobLocation?: string | null;
}

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

/**
 * Fetches unseen emails from IMAP, marks them as seen, and returns raw email
 * data for the calling LLM to classify. AI classification and DB storage are
 * handled separately via storeClassifiedEmails().
 */
export async function runIngestion(): Promise<RawEmail[]> {
  const folders = (process.env.YAHOO_MAIL_FOLDERS ?? 'INBOX')
    .split(',')
    .map((f) => f.trim());
  const maxEmails = parseInt(process.env.YAHOO_MAIL_MAX_EMAILS ?? '50', 10);
  const since = getSearchSince();
  const results: RawEmail[] = [];
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
        const uids =
          (await client.search({ seen: false, since }, { uid: true })) || [];
        const batch = uids.slice(0, maxEmails - results.length);
        const seenUids: number[] = [];

        for (const uid of batch) {
          const { content } = await client.download(
            String(uid),
            null as unknown as string,
            { uid: true },
          );
          const parsed = await simpleParser(content);

          const sender = parsed.from?.text ?? '';

          // Skip ignored sender addresses
          if (sender.toLowerCase().includes('donotreply@match.indeed.com')) {
            seenUids.push(uid as number);
            continue;
          }

          seenUids.push(uid as number);
          results.push({
            subject: parsed.subject ?? '',
            sender,
            receivedAt: parsed.date ?? new Date(),
            bodyText: parsed.text || parsed.html || '',
          });
        }

        if (seenUids.length > 0) {
          await client.messageFlagsAdd(seenUids, ['\\Seen'], { uid: true });
        }
      } finally {
        lock.release();
      }

      if (results.length >= maxEmails) break;
    }
  } finally {
    await client.logout();
  }

  console.log(`[mail-ingestion] Fetched ${results.length} emails`);
  return results;
}

/**
 * Stores LLM-classified emails: matches or creates jobs, inserts jobEmail records.
 */
export async function storeClassifiedEmails(
  emails: ClassifiedEmail[],
): Promise<{ jobRelated: number; matched: number; created: number }> {
  const summary = { jobRelated: 0, matched: 0, created: 0 };

  for (const email of emails) {
    if (!email.isJobRelated) continue;

    summary.jobRelated++;
    const { subject, sender, receivedAt, bodyText, company, jobTitle, summary: emailSummary } = email;
    let matchedJobId: string | null = null;

    if (company && jobTitle && company !== 'Unknown' && jobTitle !== 'Unknown') {
      const [match] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(
          and(
            ilike(jobs.company, `%${company}%`),
            ilike(jobs.title, `%${jobTitle}%`),
          ),
        )
        .orderBy(desc(jobs.createdAt))
        .limit(1);
      matchedJobId = match?.id ?? null;
    }

    if (matchedJobId) {
      summary.matched++;
    } else {
      const [newJob] = await db
        .insert(jobs)
        .values({
          title: email.extractedTitle ?? company ?? 'Unknown',
          company: email.extractedCompany ?? company ?? 'Unknown',
          description: email.extractedDescription ?? bodyText.slice(0, 2000),
          source: 'email',
          status: 'generated-from-email',
          skills: email.extractedSkills ?? [],
          jobLocation: email.extractedJobLocation ?? null,
        })
        .returning();
      matchedJobId = newJob.id;
      summary.created++;
    }

    await db.insert(jobEmails).values({
      jobId: matchedJobId,
      source: 'yahoo',
      emailContent: bodyText,
      emailLlmSummarized: emailSummary ?? '',
      subject,
      sender,
      receivedAt,
    });
  }

  console.log('[mail-ingestion] Store summary:', summary);
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
        const uids =
          (await client.search({ seen: false, since }, { uid: true })) || [];
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
