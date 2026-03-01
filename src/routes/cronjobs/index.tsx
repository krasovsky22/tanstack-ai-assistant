import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Play, Square, List, Zap } from 'lucide-react';

export const Route = createFileRoute('/cronjobs/')({
  component: CronjobsDashboard,
});

type Cronjob = {
  id: string;
  name: string;
  cronExpression: string;
  prompt: string;
  isActive: boolean;
  lastRunAt: string | null;
  lastResult: string | null;
  createdAt: string;
  updatedAt: string;
};

function CronjobsDashboard() {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<Record<string, string | null>>({});
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useQuery<Cronjob[]>({
    queryKey: ['cronjobs'],
    queryFn: async () => {
      const res = await fetch('/api/cronjobs');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await fetch(`/api/cronjobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cronjobs'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/cronjobs/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
    },
  });

  async function handleTest(job: Cronjob) {
    setTestLoading((prev) => ({ ...prev, [job.id]: true }));
    setTestResults((prev) => ({ ...prev, [job.id]: null }));
    try {
      const res = await fetch(`/api/cronjobs/${job.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [job.id]: res.ok ? (data.result ?? '(no result)') : `Error: ${data.error}`,
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [job.id]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    } finally {
      setTestLoading((prev) => ({ ...prev, [job.id]: false }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Automation</h1>
        <Link
          to="/cronjobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          New Job
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No cron jobs yet.{' '}
          <Link to="/cronjobs/new" className="text-blue-600 hover:underline">
            Create your first job
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Schedule</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Run</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((job) => (
                <React.Fragment key={job.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{job.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{job.cronExpression}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate({ id: job.id, isActive: !job.isActive })}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                          job.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {job.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {job.lastRunAt
                        ? new Date(job.lastRunAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleMutation.mutate({ id: job.id, isActive: !job.isActive })}
                          title={job.isActive ? 'Stop' : 'Start'}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors cursor-pointer"
                        >
                          {job.isActive ? <Square size={15} /> : <Play size={15} />}
                        </button>
                        <button
                          onClick={() => handleTest(job)}
                          disabled={testLoading[job.id]}
                          title="Test run"
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Zap size={15} />
                        </button>
                        <Link
                          to="/cronjobs/$id/logs"
                          params={{ id: job.id }}
                          title="View logs"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        >
                          <List size={15} />
                        </Link>
                        <Link
                          to="/cronjobs/$id"
                          params={{ id: job.id }}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </Link>
                        {confirmDelete === job.id ? (
                          <>
                            <button
                              onClick={() => deleteMutation.mutate(job.id)}
                              title="Confirm delete"
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              title="Cancel"
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(job.id)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {(testLoading[job.id] || testResults[job.id] !== undefined) && (
                    <tr key={`${job.id}-result`}>
                      <td colSpan={5} className="px-4 py-3 bg-gray-50 border-t">
                        {testLoading[job.id] ? (
                          <span className="text-xs text-gray-400">Running test...</span>
                        ) : testResults[job.id] ? (
                          <div className="text-xs text-gray-700">
                            <span className="font-medium text-gray-500 mr-2">Test result:</span>
                            <span className="whitespace-pre-wrap">{testResults[job.id]}</span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
