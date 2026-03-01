import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/cronjobs/$id/logs')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { db } = await import('@/db');
        const { cronjobLogs } = await import('@/db/schema');
        const { eq, desc } = await import('drizzle-orm');

        const logs = await db
          .select({
            id: cronjobLogs.id,
            status: cronjobLogs.status,
            result: cronjobLogs.result,
            error: cronjobLogs.error,
            durationMs: cronjobLogs.durationMs,
            ranAt: cronjobLogs.ranAt,
          })
          .from(cronjobLogs)
          .where(eq(cronjobLogs.cronjobId, params.id))
          .orderBy(desc(cronjobLogs.ranAt))
          .limit(50);

        return new Response(JSON.stringify(logs), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
