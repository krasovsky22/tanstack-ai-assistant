import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Upload, FolderEdit, FileText, Search, Eye, X, Tag } from 'lucide-react';

export const Route = createFileRoute('/knowledge-base/')({
  component: KnowledgeBaseDashboard,
});

type KnowledgeBaseFile = {
  id: string;
  filename: string;
  originalName: string;
  categories: string[];
  summary: string | null;
  mimeType: string;
  sizeBytes: number | null;
  filePath: string;
  createdAt: string;
  updatedAt: string;
};

type PreviewData = KnowledgeBaseFile & { content: string };

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'text/csv') return '📊';
  if (mimeType.startsWith('text/')) return '📝';
  return '📁';
}

const BADGE_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

function categoryColor(cat: string): string {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) & 0xffff;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

// ─── Tag editor ────────────────────────────────────────────────────────────────

function TagEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  function addTag() {
    const tag = input.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center border border-gray-300 rounded-lg px-2 py-1.5 min-h-9 focus-within:ring-2 focus-within:ring-indigo-400 bg-white">
      {value.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(tag)}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="hover:opacity-70 cursor-pointer"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
          if (e.key === 'Backspace' && !input && value.length > 0) onChange(value.slice(0, -1));
        }}
        onBlur={addTag}
        placeholder={value.length === 0 ? 'Type category, press Enter…' : ''}
        className="flex-1 min-w-24 text-xs outline-none bg-transparent"
      />
    </div>
  );
}

// ─── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { data, isLoading, error } = useQuery<PreviewData>({
    queryKey: ['knowledge-base-preview', fileId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${fileId}`);
      if (!res.ok) throw new Error('Failed to load preview');
      return res.json();
    },
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{data ? mimeIcon(data.mimeType) : ''}</span>
                  <h2 className="font-semibold text-gray-900 truncate">{data?.originalName}</h2>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data?.categories.map((cat) => (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(cat)}`}
                    >
                      <Tag size={10} />
                      {cat}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary */}
        {(isLoading || data?.summary) && (
          <div className="px-6 py-3 bg-amber-50 border-b">
            {isLoading ? (
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-amber-200 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-amber-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-gray-700">{data?.summary}</p>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`h-3 bg-gray-100 rounded animate-pulse ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
              ))}
            </div>
          ) : error ? (
            <p className="text-red-600 text-sm">Failed to load content.</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Content Preview
                <span className="ml-2 font-normal normal-case text-gray-400">
                  {data && `${formatBytes(data.sizeBytes)} · ${new Date(data.createdAt).toLocaleDateString()}`}
                </span>
              </p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {data?.content?.slice(0, 12000)}
                {(data?.content?.length ?? 0) > 12000 && (
                  <span className="text-gray-400">\n\n[Content truncated — showing first 12,000 characters]</span>
                )}
              </pre>
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function KnowledgeBaseDashboard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [recategorizeId, setRecategorizeId] = useState<string | null>(null);
  const [recategorizeValue, setRecategorizeValue] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set('search', searchQuery);

  const { data: files = [], isLoading } = useQuery<KnowledgeBaseFile[]>({
    queryKey: ['knowledge-base', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base?${queryParams.toString()}`);
      return res.json();
    },
  });

  // Client-side category filter (categories is now an array)
  const filteredFiles = categoryFilter
    ? files.filter((f) => f.categories.includes(categoryFilter))
    : files;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge-base/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
    },
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });

  const recategorizeMutation = useMutation({
    mutationFn: async ({ id, categories }: { id: string; categories: string[] }) => {
      const res = await fetch(`/api/knowledge-base/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      });
      if (!res.ok) throw new Error('Recategorize failed');
      return res.json();
    },
    onSuccess: () => {
      setRecategorizeId(null);
      setRecategorizeValue([]);
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/knowledge-base', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Upload failed');
      }
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function startRecategorize(file: KnowledgeBaseFile) {
    setRecategorizeId(file.id);
    setRecategorizeValue([...file.categories]);
  }

  // All unique categories across all files
  const allCategories = [...new Set(files.flatMap((f) => f.categories))].sort();

  return (
    <div className="max-w-5xl mx-auto p-6">
      {previewId && (
        <PreviewModal fileId={previewId} onClose={() => setPreviewId(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload documents — the AI auto-categorizes them and uses their content when answering questions.
          </p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors cursor-pointer">
          <Upload size={16} />
          {uploading ? 'Analysing…' : 'Upload File'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.csv,.md,text/plain,text/csv,text/markdown,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      </div>

      {uploading && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Uploading and analysing document with AI — this may take a moment…
        </div>
      )}

      {uploadError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {uploadError}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by filename…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All categories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(searchQuery || categoryFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading…</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <FileText size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">{files.length === 0 ? 'No documents yet.' : 'No documents match your filter.'}</p>
          <p className="text-sm mt-1">Upload a PDF, TXT, CSV, or Markdown file to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Summary</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categories</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Size</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredFiles.map((file) => (
                <React.Fragment key={file.id}>
                  <tr className="hover:bg-gray-50 transition-colors align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{mimeIcon(file.mimeType)}</span>
                        <span
                          className="font-medium text-gray-900 truncate max-w-[200px]"
                          title={file.originalName}
                        >
                          {file.originalName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5 ml-6">
                        {file.mimeType.split('/').pop()?.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                        {file.summary ?? <span className="italic text-gray-300">No summary</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {file.categories.map((cat) => (
                          <span
                            key={cat}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${categoryColor(cat)}`}
                            onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                            title="Filter by this category"
                          >
                            <Tag size={9} />
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewId(file.id)}
                          title="Preview"
                          className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => startRecategorize(file)}
                          title="Edit categories"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        >
                          <FolderEdit size={15} />
                        </button>
                        {confirmDelete === file.id ? (
                          <>
                            <button
                              onClick={() => deleteMutation.mutate(file.id)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(file.id)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {recategorizeId === file.id && (
                    <tr key={`${file.id}-recategorize`}>
                      <td colSpan={6} className="px-4 py-3 bg-indigo-50 border-t">
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-gray-600 font-medium mt-2 whitespace-nowrap">
                            Edit categories:
                          </span>
                          <div className="flex-1">
                            <TagEditor
                              value={recategorizeValue}
                              onChange={setRecategorizeValue}
                            />
                            <p className="text-xs text-gray-400 mt-1">Type a category and press Enter or comma to add</p>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() =>
                                recategorizeMutation.mutate({
                                  id: file.id,
                                  categories: recategorizeValue,
                                })
                              }
                              disabled={recategorizeValue.length === 0 || recategorizeMutation.isPending}
                              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setRecategorizeId(null); setRecategorizeValue([]); }}
                              className="text-xs px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Supported formats: PDF, TXT, CSV, Markdown · Categories and summaries are generated by AI on upload · Click a category badge to filter
      </p>
    </div>
  );
}
