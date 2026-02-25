import { createFileRoute, Link } from '@tanstack/react-router';
import { useChat, fetchHttpStream } from '@tanstack/ai-react';
import { useState, useEffect } from 'react';
import { Globe, Search, Zap, ChevronDown, ChevronUp } from 'lucide-react';

export const Route = createFileRoute('/jobs/extract-from-url')({
  component: ReportsPage,
});

type ScrapedJob = {
  title: string;
  company: string;
  link: string | null;
  description: string;
};

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

function ScrapedJobCard({ job }: { job: ScrapedJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">
          {job.title || 'Untitled Position'}
        </h3>
        {job.company && (
          <p className="text-sm text-gray-600 mt-0.5">{job.company}</p>
        )}
        {job.link && (
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >
            View posting ↗
          </a>
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
          <div className="px-4 pb-4 max-h-96 overflow-y-auto">
            <div
              className="text-sm text-gray-700 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsPage() {
  const [urlInput, setUrlInput] = useState('');
  const [extractedJobs, setExtractedJobs] = useState<ScrapedJob[] | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [processedAll, setProcessedAll] = useState(false);

  const { messages, sendMessage, clear, status, error } = useChat({
    connection: fetchHttpStream('/api/reports/scrape-jobs'),
  });

  // When stream completes, parse the last assistant message as a JSON array
  useEffect(() => {
    if (status !== 'ready' || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;

    const parts = (lastMsg.parts ?? []) as Array<{
      type: string;
      content?: string;
    }>;
    const text = parts
      .filter((p) => p.type === 'text')
      .map((p) => p.content ?? '')
      .join('');

    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const jobs = JSON.parse(match[0]);
        setExtractedJobs(Array.isArray(jobs) ? jobs : []);
        setParseError(null);
      } else {
        setParseError(
          'Could not find job data in the response. The page may not contain job listings or access was blocked.',
        );
      }
    } catch {
      setParseError('Failed to parse job data from the response.');
    }
  }, [status, messages]);

  const handleGetJobs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    clear();
    setExtractedJobs(null);
    setParseError(null);
    setSavedCount(0);
    setProcessingCount(0);
    setProcessedAll(false);
    await sendMessage(urlInput);
  };

  const handleProcessAll = async () => {
    if (!extractedJobs?.length) return;
    setIsSaving(true);
    setSavedCount(0);

    const hostname = (() => {
      try {
        return new URL(urlInput).hostname;
      } catch {
        return 'scraped';
      }
    })();

    // Save all jobs to the database
    const createdIds: string[] = [];
    for (const job of extractedJobs) {
      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: job.title || 'Unknown',
            company: job.company || 'Unknown',
            description: job.description,
            source: hostname,
            status: 'new',
            link: job.link ?? null,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          createdIds.push(created.id);
        }
        setSavedCount((n) => n + 1);
      } catch {
        // continue with remaining jobs
      }
    }

    setIsSaving(false);
    setProcessingCount(createdIds.length);

    // Process each saved job with AI extraction
    for (const id of createdIds) {
      try {
        await fetch(`/api/jobs/process?id=${id}`, { method: 'POST' });
      } catch {
        // continue with remaining
      }
      setProcessingCount((n) => Math.max(0, n - 1));
    }

    setProcessedAll(true);
  };

  const isStreaming = status === 'streaming' || status === 'submitted';
  const isProcessing = isSaving || processingCount > 0;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Job Scraper</h1>
        <p className="text-sm text-gray-500">
          Enter a job board URL to extract all listings using AI and playwright
        </p>
      </div>

      <form onSubmit={handleGetJobs} className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Globe
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://jobs.example.com/..."
            required
            disabled={isStreaming}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <button
          type="submit"
          disabled={isStreaming || !urlInput.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search size={16} />
          {isStreaming ? 'Extracting...' : 'Get Jobs'}
        </button>
      </form>

      {isStreaming && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <p className="text-sm text-blue-700">
            Navigating to the page and extracting job listings with
            playwright…
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mb-4">Error: {error.message}</p>
      )}
      {parseError && (
        <p className="text-sm text-amber-600 mb-4">{parseError}</p>
      )}

      {extractedJobs !== null && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {extractedJobs.length} job
              {extractedJobs.length !== 1 ? 's' : ''} found
            </p>
            {extractedJobs.length > 0 && !processedAll && (
              <button
                onClick={handleProcessAll}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Spinner /> : <Zap size={16} />}
                {isSaving
                  ? `Saving… (${savedCount}/${extractedJobs.length})`
                  : processingCount > 0
                    ? `Processing… (${processingCount} left)`
                    : 'Process All'}
              </button>
            )}
          </div>

          {processedAll && (
            <p className="text-sm text-teal-600 mb-4">
              ✓ All jobs saved and processed. Check the{' '}
              <Link to="/jobs" className="underline font-medium">
                Job Search
              </Link>{' '}
              page.
            </p>
          )}

          <div className="space-y-3">
            {extractedJobs.map((job, i) => (
              <ScrapedJobCard key={i} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
