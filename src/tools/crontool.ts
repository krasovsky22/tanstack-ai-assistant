import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getCronjobTools() {
  return [
    toolDefinition({
      name: 'list_cronjobs',
      description:
        'List all cronjobs with their schedule, active status, and last run result.',
      inputSchema: z.object({}),
    }).server(async () => {
      const { db } = await import('@/db');
      const { cronjobs } = await import('@/db/schema');

      const rows = await db.select().from(cronjobs);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        cronExpression: r.cronExpression,
        prompt: r.prompt,
        isActive: r.isActive,
        lastRunAt: r.lastRunAt?.toISOString() ?? null,
        lastResult: r.lastResult ?? null,
      }));
    }),

    toolDefinition({
      name: 'create_cronjob',
      description:
        'Create a new cronjob that fires an AI prompt on a cron schedule. ' +
        'Use standard 5-field cron expressions (e.g. "0 9 * * *" = daily at 09:00).',
      inputSchema: z.object({
        name: z.string().describe('Human-readable name for the cronjob'),
        cronExpression: z
          .string()
          .describe('Standard 5-field cron expression, e.g. "0 9 * * 1-5"'),
        prompt: z
          .string()
          .describe('The prompt the AI agent will receive when the job fires'),
        isActive: z
          .boolean()
          .optional()
          .describe('Whether to activate the job immediately (default: true)'),
      }),
    }).server(async ({ name, cronExpression, prompt, isActive = true }) => {
      const { db } = await import('@/db');
      const { cronjobs } = await import('@/db/schema');

      const [row] = await db
        .insert(cronjobs)
        .values({ name, cronExpression, prompt, isActive })
        .returning();

      return { success: true, id: row.id, name: row.name };
    }),

    toolDefinition({
      name: 'update_cronjob',
      description:
        'Update an existing cronjob. Can change its name, cron expression, prompt, ' +
        'or toggle it on/off without deleting it. ' +
        'IMPORTANT: Always call list_cronjobs first to retrieve current field values. ' +
        'Only pass fields the user explicitly asked to change; omit all others so they are preserved as-is.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the cronjob to update'),
        name: z.string().optional().describe('New name (omit to keep existing)'),
        cronExpression: z
          .string()
          .optional()
          .describe('New cron expression (omit to keep existing)'),
        prompt: z
          .string()
          .optional()
          .describe('New prompt (omit to keep existing)'),
        isActive: z
          .boolean()
          .optional()
          .describe('true to activate, false to deactivate (omit to keep existing)'),
      }),
    }).server(async ({ id, ...fields }) => {
      const { db } = await import('@/db');
      const { cronjobs } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      // Fetch existing record so we can merge — never overwrite with empty/undefined
      const existing = await db
        .select()
        .from(cronjobs)
        .where(eq(cronjobs.id, id))
        .then((rows) => rows[0] ?? null);

      if (!existing)
        return { success: false, error: `No cronjob found with id ${id}` };

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        name: fields.name !== undefined ? fields.name : existing.name,
        cronExpression:
          fields.cronExpression !== undefined
            ? fields.cronExpression
            : existing.cronExpression,
        prompt: fields.prompt !== undefined ? fields.prompt : existing.prompt,
        isActive:
          fields.isActive !== undefined ? fields.isActive : existing.isActive,
      };

      const [row] = await db
        .update(cronjobs)
        .set(updates)
        .where(eq(cronjobs.id, id))
        .returning();

      if (!row)
        return { success: false, error: `Failed to update cronjob ${id}` };
      return {
        success: true,
        id: row.id,
        name: row.name,
        isActive: row.isActive,
      };
    }),

    toolDefinition({
      name: 'delete_cronjob',
      description: 'Permanently delete a cronjob and all its logs.',
      inputSchema: z.object({
        id: z.string().describe('UUID of the cronjob to delete'),
      }),
    }).server(async ({ id }) => {
      const { db } = await import('@/db');
      const { cronjobs } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      const [row] = await db
        .delete(cronjobs)
        .where(eq(cronjobs.id, id))
        .returning();

      if (!row)
        return { success: false, error: `No cronjob found with id ${id}` };
      return { success: true, deleted: row.name };
    }),
  ];
}
