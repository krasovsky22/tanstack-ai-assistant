import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import AsyncButton from '@/components/AsyncButton';

export const Route = createFileRoute('/mail/')({
  component: MailDashboard,
});

type Email = {
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  subject: string;
  sender: string;
  receivedAt: string;
  emailLlmSummarized: string;
  emailContent: string;
  source: string;
  createdAt: string;
};

type IngestResult = {
  fetched: number;
  jobRelated: number;
  matched: number;
  created: number;
};

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function EmailRow({ email, onDelete }: { email: Email; onDelete: (id: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const receivedDate = new Date(email.receivedAt);
  const dateStr = receivedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = receivedDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-start gap-3 flex-1 min-w-0 text-left"
        >
          <Mail size={16} className="mt-0.5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium text-gray-900 truncate">{email.subject || '(no subject)'}</span>
              <span className="text-xs text-gray-400 shrink-0">
                {dateStr} {timeStr}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm text-gray-500 truncate">{email.sender}</span>
              {email.jobTitle && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 truncate">
                    {email.jobTitle}
                    {email.jobCompany ? ` @ ${email.jobCompany}` : ''}
                  </span>
                </>
              )}
              {!email.jobId && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    unmatched
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 text-gray-400 mt-0.5">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AsyncButton
          onClick={() => onDelete(email.id)}
          spinnerSize={13}
          className="flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors shrink-0"
          title="Delete email"
        >
          <Trash2 size={14} />
        </AsyncButton>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          {email.jobId && (
            <a
              href={`/jobs/${email.jobId}`}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-800 font-medium"
            >
              <ExternalLink size={12} />
              View job
            </a>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              AI Summary
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {email.emailLlmSummarized || 'No summary available.'}
            </p>
          </div>
          <button
            onClick={() => setShowRaw((r) => !r)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            {showRaw ? 'Hide full email' : 'Show full email'}
          </button>
          {showRaw && (
            <pre className="text-xs text-gray-600 bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {email.emailContent}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function MailDashboard() {
  const queryClient = useQueryClient();
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [ingestError, setIngestError] = useState(false);

  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ['mail-all'],
    queryFn: () => fetch('/api/mail/all').then((r) => r.json()),
  });

  async function handleIngest() {
    setIngestResult(null);
    setIngestError(false);
    const res = await fetch('/api/mail/ingest', { method: 'POST' });
    if (!res.ok) {
      setIngestError(true);
      throw new Error('Ingest failed');
    }
    const data: IngestResult = await res.json();
    setIngestResult(data);
    queryClient.invalidateQueries({ queryKey: ['mail-all'] });
    queryClient.invalidateQueries({ queryKey: ['email-count'] });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/mail/${id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['mail-all'] });
    queryClient.invalidateQueries({ queryKey: ['email-count'] });
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mail Inbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading...' : `${emails.length} email${emails.length === 1 ? '' : 's'} ingested`}
          </p>
        </div>
        <AsyncButton
          onClick={handleIngest}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-60 transition-colors font-medium text-sm"
        >
          <RefreshCw size={14} />
          Fetch from Yahoo
        </AsyncButton>
      </div>

      {ingestResult && (
        <div className="mb-4 flex items-center gap-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <span>✓ Fetch complete</span>
          <span>Fetched: <strong>{ingestResult.fetched}</strong></span>
          <span>Job-related: <strong>{ingestResult.jobRelated}</strong></span>
          <span>Matched: <strong>{ingestResult.matched}</strong></span>
          <span>New: <strong>{ingestResult.created}</strong></span>
        </div>
      )}

      {ingestError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to fetch emails. Check your Yahoo credentials in .env.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Spinner />
          <span className="ml-2 text-sm">Loading emails...</span>
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Mail size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No emails yet</p>
          <p className="text-sm mt-1">Click "Fetch from Yahoo" to pull your inbox.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
