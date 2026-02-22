import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
export { JOB_STATUSES, type JobStatus } from '@/lib/job-constants';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
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
