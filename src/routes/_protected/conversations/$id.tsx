import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { type UIMessage } from '@tanstack/ai-react';
import { Box } from '@chakra-ui/react';
import { Chat } from '@/components/Chat';

const getConversationData = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import('@/db');
    const { conversations, messages } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conversation) throw new Error('Conversation not found');
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id));
    return { conversation, messages: msgs };
  });

export const Route = createFileRoute('/_protected/conversations/$id')({
  loader: ({ params }) => getConversationData({ data: params.id }),
  component: ConversationPage,
});

function ConversationPage() {
  const data = Route.useLoaderData() as {
    conversation: { id: string; title: string };
    messages: UIMessage[];
  };

  return (
    <Box h="100vh" bg="bg.page" display="flex" flexDirection="column">
      <Chat
        conversationId={data.conversation.id}
        initialMessages={data.messages}
        initialTitle={data.conversation.title}
      />
    </Box>
  );
}
