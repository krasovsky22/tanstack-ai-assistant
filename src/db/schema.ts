import { pgTable, text, timestamp, uuid, jsonb, integer, boolean, unique } from 'drizzle-orm/pg-core';
export { JOB_STATUSES, type JobStatus } from '@/lib/job-constants';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  source: text('source'),
  chatId: text('chat_id'),
  userId: text('user_id'),
  isClosed: boolean('is_closed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  description: text('description').notNull(),
  source: text('source').notNull(),
  status: text('status').notNull().default('new'),
  link: text('link'),
  notes: text('notes'),
  salary: text('salary'),
  skills: jsonb('skills').$type<string[]>(),
  jobLocation: text('job_location'),
  matchScore: integer('match_score'),
  resumePath: text('resume_path'),
  resumePdfPath: text('resume_pdf_path'),
  coverLetterPath: text('cover_letter_path'),
  retryCount: integer('retry_count').notNull().default(0),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  errorMessage: text('error_message'),
  failedAt: timestamp('failed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: jsonb('parts').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cronjobs = pgTable('cronjobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  cronExpression: text('cron_expression').notNull(),
  prompt: text('prompt').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastRunAt: timestamp('last_run_at'),
  lastResult: text('last_result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
});

export const cronjobLogs = pgTable('cronjob_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  cronjobId: uuid('cronjob_id').notNull().references(() => cronjobs.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  result: text('result'),
  error: text('error'),
  durationMs: integer('duration_ms'),
  ranAt: timestamp('ran_at').defaultNow().notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
});

export const generatedFiles = pgTable('generated_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const knowledgebaseFiles = pgTable('knowledgebase_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  categories: jsonb('categories').$type<string[]>().notNull().default([]),
  summary: text('summary'),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
  filePath: text('file_path').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  jiraBaseUrl: text('jira_base_url'),
  jiraEmail: text('jira_email'),
  jiraPat: text('jira_pat'),
  jiraDefaultProject: text('jira_default_project'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  source: text('source'),
  sourceConversationId: uuid('source_conversation_id')
    .references(() => conversations.id, { onDelete: 'set null' }),
  isRead: boolean('is_read').notNull().default(false),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobEmails = pgTable('job_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  source: text('source').notNull(),
  emailContent: text('email_content').notNull(),
  emailLlmSummarized: text('email_llm_summarized').notNull(),
  subject: text('subject').notNull(),
  sender: text('sender').notNull(),
  receivedAt: timestamp('received_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const linkingCodes = pgTable('linking_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gatewayIdentities = pgTable('gateway_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  externalChatId: text('external_chat_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkedAt: timestamp('linked_at').defaultNow().notNull(),
}, (t) => [unique().on(t.provider, t.externalChatId)]);

export const remoteChats = pgTable('remote_chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: text('chat_id').notNull(),
  provider: text('provider').notNull(),
  name: text('name').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [unique('remote_chats_chat_provider_key').on(t.chatId, t.provider)]);

export const outboundMessages = pgTable('outbound_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  remoteChatId: uuid('remote_chat_id').notNull().references(() => remoteChats.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  status: text('status').notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
});
