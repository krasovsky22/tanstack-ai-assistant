import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Chat } from '@/components/Chat';

type SearchParams = {
  q?: string;
  from_notification_id?: string;
};

export const Route = createFileRoute('/_protected/conversations/new')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search['q'] === 'string' ? search['q'] : undefined,
    from_notification_id:
      typeof search['from_notification_id'] === 'string'
        ? search['from_notification_id']
        : undefined,
  }),
  component: NewConversation,
});

function NewConversation() {
  const { q, from_notification_id } = Route.useSearch();
  // null = still loading notification content; string = ready to render Chat
  const [initialPrompt, setInitialPrompt] = useState<string | null>(
    from_notification_id ? null : (q ?? ''),
  );

  useEffect(() => {
    if (!from_notification_id) return;
    fetch(`/api/notifications/${from_notification_id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((notification) => {
        setInitialPrompt(notification?.content ?? '');
      })
      .catch(() => setInitialPrompt(''));
  }, [from_notification_id]);

  // Don't mount Chat until we have the pre-fill content — Chat's suggestedPrompt
  // is consumed via useState initializer and won't react to later prop changes.
  if (initialPrompt === null) return null;

  return (
    <Box h="100vh" bg="bg.page" display="flex" flexDirection="column">
      <Chat suggestedPrompt={initialPrompt} />
    </Box>
  );
}
