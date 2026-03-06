import { pgTable, text, timestamp, uuid, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
export { JOB_STATUSES, type JobStatus } from '@/lib/job-constants';

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
});

export const cronjobLogs = pgTable('cronjob_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  cronjobId: uuid('cronjob_id').notNull().references(() => cronjobs.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  result: text('result'),
  error: text('error'),
  durationMs: integer('duration_ms'),
  ranAt: timestamp('ran_at').defaultNow().notNull(),
});

export const generatedFiles = pgTable('generated_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
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
