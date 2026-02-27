import { maxIterations } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';

export async function buildChatOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  conversationId?: string,
) {
  const { getMcpToolDefinitions } = await import('@/tools');
  const tools = await getMcpToolDefinitions();
  return {
    adapter: openaiText('gpt-5.2'),
    messages,
    conversationId,
    agentLoopStrategy: maxIterations(10),
    systemPrompts: ['You are a helpful assistant.'],
    tools,
  };
}

interface MessageToSave {
  id: string;
  role: string;
  parts: unknown;
}

export async function saveConversationToDb(
  conversationId: string,
  title: string,
  messages: MessageToSave[],
  source: string | null = null,
): Promise<void> {
  const { db } = await import('@/db');
  const { conversations, messages: messagesTable } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  await db.insert(conversations).values({
    id: conversationId,
    title,
    source,
    updatedAt: new Date(),
  });

  if (messages.length > 0) {
    await db.insert(messagesTable).values(
      messages.map((m) => ({
        id: m.id,
        conversationId,
        role: m.role,
        parts: m.parts,
      })),
    );
  }

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}
