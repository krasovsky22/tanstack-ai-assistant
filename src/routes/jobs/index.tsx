import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, Pencil, Zap, X, FileText, Mail } from 'lucide-react';
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
  matchScore: number | null;
  resumePath: string | null;
  resumePdfPath: string | null;
  coverLetterPath: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  processed: 'Processed',
  resume_generated: 'Resume Generated',
  applied: 'Applied',
  answered: 'Answered',
  scheduled_for_interview: 'Interview Scheduled',
  offer_received: 'Offer Received',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  'generated-from-email': 'From Email',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  processed: 'bg-teal-100 text-teal-700',
  resume_generated: 'bg-indigo-100 text-indigo-700',
  applied: 'bg-blue-100 text-blue-700',
  answered: 'bg-purple-100 text-purple-700',
  scheduled_for_interview: 'bg-amber-100 text-amber-700',
  offer_received: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-slate-100 text-slate-600',
  'generated-from-email': 'bg-orange-100 text-orange-700',
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

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function PdfModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: '85vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="font-semibold text-gray-800 truncate">{title} — Resume</span>
          <div className="flex items-center gap-3">
            <a
              href={url}
              download
              className="text-xs text-indigo-600 hover:underline"
            >
              Download PDF
            </a>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 rounded">
              <X size={18} />
            </button>
          </div>
        </div>
        <iframe
          src={url}
          className="flex-1 w-full rounded-b-lg"
          title="Resume PDF"
        />
      </div>
    </div>
  );
}

function JobCard({
  job,
  onDelete,
  onStatusChange,
  onProcess,
  onGenerateResume,
}: {
  job: Job;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onProcess: (id: string) => Promise<void>;
  onGenerateResume: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // Pitfall 5 mitigation: staleTime 60s + initialData prevents N+1 request storm on page load
  const { data: emailCountData } = useQuery({
    queryKey: ['email-count', job.id],
    queryFn: async () => {
      const res = await fetch(`/api/mail/email-count?jobId=${job.id}`);
      return res.json() as Promise<{ count: number }>;
    },
    staleTime: 60_000,
    initialData: { count: 0 },
  });
  const emailCount = emailCountData?.count ?? 0;

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
              {emailCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Mail size={12} />
                  {emailCount}
                </span>
              )}
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

        {job.status === 'new' && (
          <button
            onClick={async () => {
              setIsProcessing(true);
              try { await onProcess(job.id); } finally { setIsProcessing(false); }
            }}
            disabled={isProcessing}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 border border-teal-600 text-teal-700 rounded-lg text-xs hover:bg-teal-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isProcessing ? <Spinner /> : <Zap size={13} />}
            {isProcessing ? 'Processing...' : 'Process'}
          </button>
        )}

        {job.status === 'processed' && (
          <button
            onClick={async () => {
              setIsGenerating(true);
              try { await onGenerateResume(job.id); } finally { setIsGenerating(false); }
            }}
            disabled={isGenerating}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 border border-indigo-600 text-indigo-700 rounded-lg text-xs hover:bg-indigo-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isGenerating ? <Spinner /> : <Zap size={13} />}
            {isGenerating ? 'Generating...' : 'Generate Resume'}
          </button>
        )}

        {job.matchScore != null && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                job.matchScore >= 75
                  ? 'bg-green-100 text-green-700'
                  : job.matchScore >= 50
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              Match: {job.matchScore}%
            </span>
            {job.resumePdfPath && (
              <button
                onClick={() => setShowPdf(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                <FileText size={12} />
                View Resume
              </button>
            )}
            {job.coverLetterPath && (
              <a
                href={job.coverLetterPath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline"
              >
                Cover Letter ↗
              </a>
            )}
          </div>
        )}
        {showPdf && job.resumePdfPath && (
          <PdfModal
            url={job.resumePdfPath}
            title={`${job.title} at ${job.company}`}
            onClose={() => setShowPdf(false)}
          />
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
    mutationFn: async (id?: string) => {
      const url = id ? `/api/jobs/process?id=${id}` : '/api/jobs/process';
      const res = await fetch(url, { method: 'POST' });
      if (res.status === 404) throw new Error('No new jobs to process');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Processing failed');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const generateResumeMutation = useMutation({
    mutationFn: async (id?: string) => {
      const url = id
        ? `/api/jobs/generate-resume?id=${id}`
        : '/api/jobs/generate-resume';
      const res = await fetch(url, { method: 'POST' });
      if (res.status === 404) throw new Error('No processed jobs to generate resume for');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Resume generation failed');
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
            onClick={() => processMutation.mutate(undefined)}
            disabled={processMutation.isPending}
            title={processMutation.isError ? processMutation.error?.message : 'Process one new job with AI'}
            className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-700 rounded-lg text-sm hover:bg-teal-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Zap size={16} />
            {processMutation.isPending ? 'Processing...' : 'Process'}
          </button>
          <button
            onClick={() => generateResumeMutation.mutate(undefined)}
            disabled={generateResumeMutation.isPending}
            title={generateResumeMutation.isError ? generateResumeMutation.error?.message : 'Generate tailored resume for next processed job'}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-600 text-indigo-700 rounded-lg text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Zap size={16} />
            {generateResumeMutation.isPending ? 'Generating...' : 'Generate Resume'}
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
      {generateResumeMutation.isError && (
        <p className="text-sm text-red-600 mb-4">{generateResumeMutation.error?.message}</p>
      )}
      {generateResumeMutation.isSuccess && (
        <p className="text-sm text-indigo-600 mb-4">Resume generated successfully.</p>
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
              onProcess={(id) => processMutation.mutateAsync(id)}
              onGenerateResume={(id) => generateResumeMutation.mutateAsync(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
