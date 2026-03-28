import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

function getBaseUrl() {
  return process.env.APP_URL ?? 'http://localhost:3000';
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${getBaseUrl()}${path}`, init);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function withUiLink<T extends object>(data: T, uiPath: string): T & { uiLink: string } {
  return { ...data, uiLink: `${getBaseUrl()}${uiPath}` };
}

function withUiLinks<T extends object>(items: T[], uiPathFn: (item: T) => string): Array<T & { uiLink: string }> {
  return items.map((item) => ({ ...item, uiLink: `${getBaseUrl()}${uiPathFn(item)}` }));
}

function requireUserId(userId: string | null, toolName: string) {
  if (!userId) {
    throw new Error(`${toolName} requires an authenticated user.`);
  }
  return userId;
}

export function getUiBackendApiTools(userId: string | null) {
  return [
    // ── Jobs ──────────────────────────────────────────────────────────────────

    toolDefinition({
      name: 'list_jobs',
      description:
        'List all jobs. Optionally filter by status or search query (matches title, company, source).',
      inputSchema: z.object({
        status: z
          .string()
          .optional()
          .default('')
          .describe(
            'Filter by status: new, processed, applied, rejected, etc. Omit or use "all" for all statuses.',
          ),
        search: z
          .string()
          .optional()
          .default('')
          .describe('Search term to filter by title, company, or source.'),
      }),
    }).server(async ({ status, search }) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const qs = params.toString();
      const data = await apiFetch(`/api/jobs/${qs ? `?${qs}` : ''}`);
      return Array.isArray(data)
        ? withUiLinks(data, (job: any) => `/jobs/${job.id}`)
        : data;
    }),

    toolDefinition({
      name: 'get_job',
      description: 'Get a single job by its UUID.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the job'),
      }),
    }).server(async ({ id }) => {
      const data = await apiFetch(`/api/jobs/${id}`);
      return data && typeof data === 'object' ? withUiLink(data, `/jobs/${id}`) : data;
    }),

    toolDefinition({
      name: 'create_job',
      description: 'Create a new job listing.',
      inputSchema: z.object({
        title: z.string().describe('Job title'),
        company: z.string().describe('Company name'),
        description: z.string().describe('Full job description'),
        source: z
          .string()
          .optional()
          .describe('Source of the job listing (e.g. LinkedIn, Indeed)'),
        status: z
          .string()
          .optional()
          .describe('Initial status (default: "new")'),
        link: z
          .string()
          .optional()
          .default('')
          .describe('URL to the original job posting'),
        notes: z.string().optional().default('').describe('Additional notes'),
      }),
    }).server(async (body) => {
      requireUserId(userId, 'create_job');
      const data = await apiFetch('/api/jobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return data?.id ? withUiLink(data, `/jobs/${data.id}`) : data;
    }),

    toolDefinition({
      name: 'update_job',
      description:
        'Update fields on an existing job (title, company, description, status, notes, etc.).',
      inputSchema: z.object({
        id: z.string().describe('UUID of the job to update'),
        title: z.string().optional().default(''),
        company: z.string().optional().default(''),
        description: z.string().optional().default(''),
        source: z.string().optional().default(''),
        status: z.string().optional().default('').describe('New status value'),
        link: z.string().nullable().optional().default(null),
        notes: z.string().nullable().optional().default(null),
      }),
    }).server(async ({ id, ...fields }) => {
      const data = await apiFetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      return data && typeof data === 'object' ? withUiLink(data, `/jobs/${id}`) : data;
    }),

    toolDefinition({
      name: 'delete_job',
      description: 'Permanently delete a job by its UUID.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the job to delete'),
      }),
    }).server(async ({ id }) => {
      return apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });
    }),

    toolDefinition({
      name: 'process_job',
      description:
        'Trigger AI processing on a job (extracts skills, sets match score, updates status to "processed"). If no id is provided, processes the next unprocessed job.',
      inputSchema: z.object({
        id: z
          .string()
          .optional()
          .describe(
            'UUID of the job to process. Omit to process the next new job.',
          ),
      }),
    }).server(async ({ id }) => {
      const data = await apiFetch('/api/jobs/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
      });
      const jobId = id ?? data?.id;
      return data && typeof data === 'object' && jobId ? withUiLink(data, `/jobs/${jobId}`) : data;
    }),

    toolDefinition({
      name: 'generate_resume_for_job',
      description:
        'Generate a tailored resume for a job. If no id is provided, generates for the next processed job without a resume.',
      inputSchema: z.object({
        id: z
          .string()
          .optional()
          .describe(
            'UUID of the job to generate a resume for. Omit to pick the next eligible job.',
          ),
      }),
    }).server(async ({ id }) => {
      const data = await apiFetch('/api/jobs/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
      });
      const jobId = id ?? data?.id;
      return data && typeof data === 'object' && jobId ? withUiLink(data, `/jobs/${jobId}`) : data;
    }),

    // ── Conversations ─────────────────────────────────────────────────────────

    toolDefinition({
      name: 'list_conversations',
      description:
        'List all saved conversations ordered by most recently updated.',
      inputSchema: z.object({}),
    }).server(async () => {
      const data = await apiFetch('/api/conversations/');
      return Array.isArray(data)
        ? withUiLinks(data, (conv: any) => `/conversations/${conv.id}`)
        : data;
    }),

    toolDefinition({
      name: 'get_conversation',
      description: 'Get a conversation with its full message history.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the conversation'),
      }),
    }).server(async ({ id }) => {
      const data = await apiFetch(`/api/conversations/${id}`);
      return data && typeof data === 'object' ? withUiLink(data, `/conversations/${id}`) : data;
    }),

    toolDefinition({
      name: 'delete_conversation',
      description: 'Permanently delete a conversation and all its messages.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the conversation to delete'),
      }),
    }).server(async ({ id }) => {
      return apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
    }),

    // ── Mail ──────────────────────────────────────────────────────────────────

    toolDefinition({
      name: 'list_all_emails',
      description:
        'List all ingested job-related emails with associated job title and company.',
      inputSchema: z.object({}),
    }).server(async () => {
      const data = await apiFetch('/api/mail/all');
      return Array.isArray(data)
        ? withUiLinks(data, (email: any) => (email.jobId ? `/jobs/${email.jobId}` : '/mail'))
        : data;
    }),

    toolDefinition({
      name: 'get_emails_by_job',
      description: 'Get all emails associated with a specific job.',
      inputSchema: z.object({
        jobId: z.string().describe('UUID of the job'),
      }),
    }).server(async ({ jobId }) => {
      const data = await apiFetch(
        `/api/mail/emails-by-job?jobId=${encodeURIComponent(jobId)}`,
      );
      return Array.isArray(data)
        ? withUiLinks(data, () => `/jobs/${jobId}`)
        : data;
    }),

    toolDefinition({
      name: 'get_email_count_for_job',
      description: 'Get the number of emails associated with a specific job.',
      inputSchema: z.object({
        jobId: z.string().describe('UUID of the job'),
      }),
    }).server(async ({ jobId }) => {
      const data = await apiFetch(
        `/api/mail/email-count?jobId=${encodeURIComponent(jobId)}`,
      );
      return data && typeof data === 'object'
        ? withUiLink(data, `/jobs/${jobId}`)
        : { count: data, uiLink: `${getBaseUrl()}/jobs/${jobId}` };
    }),

    toolDefinition({
      name: 'delete_email',
      description: 'Delete a job email by its UUID.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the email to delete'),
      }),
    }).server(async ({ id }) => {
      return apiFetch(`/api/mail/${id}`, { method: 'DELETE' });
    }),

    toolDefinition({
      name: 'ingest_emails',
      description:
        'Fetch unseen emails from the mail source and return them as raw data. You must classify each email (is it job-related? extract company, job title, summary) and then call store_classified_emails with your classifications.',
      inputSchema: z.object({}),
    }).server(async () => {
      return apiFetch('/api/mail/ingest', { method: 'POST' });
    }),

    toolDefinition({
      name: 'store_classified_emails',
      description:
        'Store your email classifications from ingest_emails. For each job-related email, provide company, jobTitle, summary and optionally extracted job fields (extractedTitle, extractedCompany, extractedDescription, extractedSkills, extractedJobLocation) for emails that need a new job record created.',
      inputSchema: z.object({
        emails: z.array(
          z.object({
            subject: z.string(),
            sender: z.string(),
            receivedAt: z.string().describe('ISO date string'),
            bodyText: z.string(),
            isJobRelated: z.boolean(),
            company: z.string().nullable().optional(),
            jobTitle: z.string().nullable().optional(),
            summary: z.string().nullable().optional().describe('1-3 sentence summary'),
            extractedTitle: z.string().nullable().optional(),
            extractedCompany: z.string().nullable().optional(),
            extractedDescription: z.string().nullable().optional(),
            extractedSkills: z.array(z.string()).optional(),
            extractedJobLocation: z.string().nullable().optional(),
          }),
        ),
      }),
    }).server(async ({ emails }) => {
      const payload = emails.map((e) => ({
        ...e,
        receivedAt: new Date(e.receivedAt),
      }));
      const data = await apiFetch('/api/mail/store-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data && typeof data === 'object' ? withUiLink(data, '/mail') : data;
    }),

    // ── Generated Files ───────────────────────────────────────────────────────

    toolDefinition({
      name: 'list_generated_files',
      description:
        'List all AI-generated files (csv, txt, md) stored on the server. Optionally filter by filename.',
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .default('')
          .describe('Optional filename search filter.'),
      }),
    }).server(async ({ search }) => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiFetch(`/api/generated-files/${qs}`);
      if (!Array.isArray(data)) return data;
      return data.map((f: { id: string; filename: string }) => ({
        ...f,
        downloadUrl: `/api/files/${encodeURIComponent(f.filename)}`,
      }));
    }),

    toolDefinition({
      name: 'get_generated_file',
      description: 'Get metadata for a single generated file by its UUID.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the generated file record'),
      }),
    }).server(async ({ id }) => {
      const data = await apiFetch(`/api/generated-files/${id}`);
      if (data && typeof data === 'object' && !data.error) {
        return {
          ...data,
          downloadUrl: `/api/files/${encodeURIComponent((data as { filename: string }).filename)}`,
        };
      }
      return data;
    }),

    toolDefinition({
      name: 'delete_generated_file',
      description:
        'Delete a generated file by its UUID. Removes the DB record and the file from disk.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the generated file record to delete'),
      }),
    }).server(async ({ id }) => {
      return apiFetch(`/api/generated-files/${id}`, { method: 'DELETE' });
    }),

    // ── Notifications ─────────────────────────────────────────────────────────

    toolDefinition({
      name: 'create_notification',
      description:
        'Create a new notification for the current user. ' +
        'Use this to surface important information, reminders, or alerts to the user.',
      inputSchema: z.object({
        title: z.string().describe('Short title for the notification'),
        content: z.string().describe('Full notification content or message body'),
      }),
    }).server(async ({ title, content }) => {
      const uid = requireUserId(userId, 'create_notification');
      const { db } = await import('@/db');
      const { notifications } = await import('@/db/schema');

      const [row] = await db
        .insert(notifications)
        .values({ title, content, source: 'llm', userId: uid })
        .returning();

      return { success: true, id: row.id, title: row.title };
    }),

    toolDefinition({
      name: 'list_notifications',
      description:
        'List recent notifications for the current user. ' +
        'Optionally filter to show only unread notifications.',
      inputSchema: z.object({
        unreadOnly: z
          .boolean()
          .optional()
          .describe('If true, return only unread notifications'),
      }),
    }).server(async ({ unreadOnly }) => {
      const { db } = await import('@/db');
      const { notifications } = await import('@/db/schema');
      const { desc, eq, and } = await import('drizzle-orm');

      const conditions = [
        ...(userId ? [eq(notifications.userId, userId)] : []),
        ...(unreadOnly ? [eq(notifications.isRead, false)] : []),
      ];

      const rows = await db
        .select()
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notifications.createdAt))
        .limit(20);

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        source: r.source ?? null,
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

    toolDefinition({
      name: 'list_remote_chats',
      description:
        'List remote chat sources (e.g. Telegram chats) the user has messaged from. Returns chat names and IDs needed to send messages back.',
      inputSchema: z.object({}),
    }).server(async () => {
      const uid = requireUserId(userId, 'list_remote_chats');
      const { db } = await import('@/db');
      const { remoteChats } = await import('@/db/schema');
      const { eq, desc } = await import('drizzle-orm');

      const rows = await db
        .select()
        .from(remoteChats)
        .where(eq(remoteChats.userId, uid))
        .orderBy(desc(remoteChats.updatedAt));

      return rows.map((r) => ({
        id: r.id,
        chatId: r.chatId,
        provider: r.provider,
        name: r.name,
        metadata: r.metadata,
        updatedAt: r.updatedAt.toISOString(),
      }));
    }),

    toolDefinition({
      name: 'send_remote_message',
      description:
        'Send a message to a remote chat (e.g. a Telegram user). Use list_remote_chats first to get the remoteChatId. The message is queued and delivered by the gateway.',
      inputSchema: z.object({
        remoteChatId: z
          .string()
          .uuid()
          .describe('UUID of the remote chat from list_remote_chats'),
        text: z.string().describe('The message text to send'),
      }),
    }).server(async ({ remoteChatId, text }) => {
      const uid = requireUserId(userId, 'send_remote_message');
      const { db } = await import('@/db');
      const { remoteChats, outboundMessages } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      const [chat] = await db
        .select()
        .from(remoteChats)
        .where(eq(remoteChats.id, remoteChatId));

      if (!chat) throw new Error('Remote chat not found');
      if (chat.userId !== uid) throw new Error('Forbidden');

      const [inserted] = await db
        .insert(outboundMessages)
        .values({ remoteChatId, text })
        .returning({ id: outboundMessages.id });

      return { ok: true, messageId: inserted.id };
    }),
  ];
}
