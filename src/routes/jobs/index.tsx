import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, Pencil, Zap } from 'lucide-react';
import { JOB_STATUSES } from '@/lib/job-constants';

export const Route = createFileRoute('/jobs/')({
  component: JobsDashboard,
});

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  source: string;
  link: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  processed: 'Processed',
  applied: 'Applied',
  answered: 'Answered',
  scheduled_for_interview: 'Interview Scheduled',
  offer_received: 'Offer Received',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  processed: 'bg-teal-100 text-teal-700',
  applied: 'bg-blue-100 text-blue-700',
  answered: 'bg-purple-100 text-purple-700',
  scheduled_for_interview: 'bg-amber-100 text-amber-700',
  offer_received: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function JobCard({
  job,
  onDelete,
  onStatusChange,
}: {
  job: Job;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {job.title && (
                <h3 className="font-semibold text-gray-900 truncate">
                  {job.title}
                </h3>
              )}
              <StatusBadge status={job.status} />
            </div>
            {job.company && (
              <p className="text-sm text-gray-600 mt-0.5">{job.company}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {job.source && <span>Source: {job.source} &middot; </span>}
              {new Date(job.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            {job.link && (
              <a
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
              >
                View posting ↗
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/jobs/$id"
              params={{ id: job.id }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              aria-label="Edit job"
            >
              <Pencil size={16} />
            </Link>
            {confirmDelete ? (
              <>
                <button
                  onClick={() => onDelete(job.id)}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                aria-label="Delete job"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="text-xs text-gray-500 font-medium">Status:</label>
          <select
            value={job.status}
            onChange={(e) => onStatusChange(job.id, e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {job.notes && (
          <p className="mt-2 text-sm text-gray-600 italic">
            Note: {job.notes}
          </p>
        )}
      </div>

      <div className="border-t">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span>Job Description</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {expanded && (
          <div className="px-4 pb-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {job.description}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function JobsDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => setDebouncedSearch(val), 300);
    setSearchTimer(t);
  };

  const params = new URLSearchParams();
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (debouncedSearch) params.set('search', debouncedSearch);
  const queryString = params.toString();

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', statusFilter, debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/jobs${queryString ? `?${queryString}` : ''}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/jobs/process', { method: 'POST' });
      if (res.status === 404) throw new Error('No new jobs to process');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Processing failed');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Job Search</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
            title={processMutation.isError ? processMutation.error?.message : 'Process one new job with AI'}
            className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-700 rounded-lg text-sm hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={16} />
            {processMutation.isPending ? 'Processing...' : 'Process'}
          </button>
          <Link
            to="/jobs/new"
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Add Job
          </Link>
        </div>
      </div>
      {processMutation.isError && (
        <p className="text-sm text-red-600 mb-4">{processMutation.error?.message}</p>
      )}
      {processMutation.isSuccess && (
        <p className="text-sm text-teal-600 mb-4">Job processed successfully.</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by title, company, or source..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {jobs.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
        </p>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No jobs found.{' '}
          <Link to="/jobs/new" className="text-blue-600 hover:underline">
            Add your first job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={(id, status) =>
                statusMutation.mutate({ id, status })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
