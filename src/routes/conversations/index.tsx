import { createFileRoute, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useEffect, useState } from 'react';
import { conversationsCollection } from '@/collections/conversations';
import { queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/Badge';

export const Route = createFileRoute('/conversations/')({
  component: ConversationsDashboard,
});

function ConversationsDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <Link
          to="/conversations/new"
          className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
        >
          New Chat
        </Link>
      </div>
      {mounted ? <ConversationList /> : null}
    </div>
  );
}

function ConversationList() {
  const { data: conversations } = useLiveQuery((q) =>
    q.from({ c: conversationsCollection }),
  );

  const sorted = [...(conversations ?? [])].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="text-gray-500 text-center py-12">
        No conversations yet.{' '}
        <Link to="/conversations/new" className="text-blue-600 hover:underline">
          Start chatting
        </Link>
      </div>
    );
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }

  return (
    <ul className="space-y-2">
      {sorted.map((c) => {
        return (
          <li key={c.id} className="relative group">
            <Link
              to="/conversations/$id"
              params={{ id: c.id }}
              className="block p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors pr-12"
            >
              <div className="font-medium text-gray-900 truncate">{c.title}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(c.updatedAt).toLocaleString()}
              </div>
              {c.source && (
                <div className="mt-1.5">
                  <Badge label={c.source} />
                </div>
              )}
            </Link>
            <button
              onClick={(e) => handleDelete(c.id, e)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
              aria-label="Delete conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
