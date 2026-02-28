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
  chatId: string | null = null,
): Promise<void> {
  const { db } = await import('@/db');
  const { conversations, messages: messagesTable } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  await db.insert(conversations).values({
    id: conversationId,
    title,
    source,
    chatId,
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

export async function getOpenConversationByChatId(chatId: string) {
  const { db } = await import('@/db');
  const { conversations, messages: messagesTable } = await import('@/db/schema');
  const { eq, and, desc, asc } = await import('drizzle-orm');

  const conversation = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.chatId, chatId), eq(conversations.isClosed, false)))
    .orderBy(desc(conversations.updatedAt))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!conversation) return null;

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(asc(messagesTable.createdAt));

  return { ...conversation, messages: msgs };
}

export async function closeConversation(conversationId: string): Promise<void> {
  const { db } = await import('@/db');
  const { conversations } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  await db
    .update(conversations)
    .set({ isClosed: true, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function appendMessagesToConversation(
  conversationId: string,
  messages: MessageToSave[],
): Promise<void> {
  const { db } = await import('@/db');
  const { conversations, messages: messagesTable } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

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
