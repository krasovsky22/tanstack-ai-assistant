import { createFileRoute, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useEffect, useState } from 'react';
import { conversationsCollection } from '@/collections/conversations';

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
          to="/"
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
        <Link to="/" className="text-blue-600 hover:underline">
          Start chatting
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((c) => {
        return (
          <li key={c.id}>
            <Link
              to="/conversations/$id"
              params={{ id: c.id }}
              className="block p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900 truncate">
                {c.title}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(c.updatedAt).toLocaleString()}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
