import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useState } from 'react';

const getCronjobLogs = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import('@/db');
    const { cronjobs, cronjobLogs } = await import('@/db/schema');
    const { eq, desc } = await import('drizzle-orm');

    const [job] = await db
      .select({ id: cronjobs.id, name: cronjobs.name })
      .from(cronjobs)
      .where(eq(cronjobs.id, id));

    if (!job) throw new Error('Cronjob not found');

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
      .where(eq(cronjobLogs.cronjobId, id))
      .orderBy(desc(cronjobLogs.ranAt))
      .limit(50);

    return { job, logs };
  });

export const Route = createFileRoute('/cronjobs/$id/logs')({
  loader: ({ params }) => getCronjobLogs({ data: params.id }),
  component: CronjobLogsPage,
});

type Log = {
  id: string;
  status: string;
  result: string | null;
  error: string | null;
  durationMs: number | null;
  ranAt: string | Date;
};

function LogRow({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false);
  const content = log.status === 'success' ? log.result : log.error;
  const truncated = content && content.length > 120 ? content.slice(0, 120) + '…' : content;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        {new Date(log.ranAt).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            log.status === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {log.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {log.durationMs != null ? `${log.durationMs}ms` : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-700 max-w-sm">
        {content ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-left hover:text-gray-900 transition-colors"
          >
            <span className="whitespace-pre-wrap">{expanded ? content : truncated}</span>
            {content.length > 120 && (
              <span className="ml-1 text-blue-500">{expanded ? 'less' : 'more'}</span>
            )}
          </button>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}

function CronjobLogsPage() {
  const { job, logs } = Route.useLoaderData();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cronjobs" className="text-sm text-gray-500 hover:text-gray-700">
          ← Automation
        </Link>
        <h1 className="text-2xl font-bold">Logs — {job.name}</h1>
      </div>

      {logs.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No logs yet. This job hasn't run yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Ran At</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Result / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <LogRow key={log.id} log={log as Log} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
