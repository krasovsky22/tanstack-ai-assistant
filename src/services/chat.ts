import { maxIterations } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';

export async function buildChatOptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  conversationId?: string,
) {
  const {
    getDockerMcpToolDefinitions,
    getCronjobTools,
    getNewsApiTools,
    getUiBackendApiTools,
    getFileTools,
    getCmdTools,
    getMemoryTools,
    getKnowledgeBaseTools,
  } = await import('@/tools');
  const disabledTools = new Set(
    (process.env.DISABLE_TOOLS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const enabled = (key: string) => !disabledTools.has(key);

  const [mcpTools, cronjobTools, newsApiTools] = await Promise.all([
    enabled('mcp') ? getDockerMcpToolDefinitions() : Promise.resolve([]),
    Promise.resolve(enabled('cronjob') ? getCronjobTools() : []),
    Promise.resolve(enabled('news') ? getNewsApiTools() : []),
  ]);
  const tools = [
    ...mcpTools,
    ...cronjobTools,
    ...newsApiTools,
    ...(enabled('ui') ? getUiBackendApiTools() : []),
    ...(enabled('file') ? getFileTools() : []),
    ...(enabled('cmd') ? getCmdTools() : []),
    ...(enabled('memory') ? getMemoryTools() : []),
    ...(enabled('knowledge_base') ? getKnowledgeBaseTools() : []),
  ];
  return {
    adapter: openaiText('gpt-5.2'),
    messages,
    conversationId,
    agentLoopStrategy: maxIterations(10),
    systemPrompts: [
      'You are a helpful assistant. Always format your responses using Markdown for better readability. \
      Use headers, lists, code blocks, bold, italics, and other Markdown formatting as appropriate. \
      When uiLink is provided, generate links in markdown format like this: [link text](uiLink) to enable quick navigation in the UI. \
      When the user uploads a text or CSV file, its content will be included in the message — analyze or answer questions about it. \
      When asked to generate or export a file (csv, txt, md), use the generate_file tool and include the returned downloadUrl as a markdown link in your response. \
      Always search the knowledge base using the search_knowledge_base tool before answering any user question. \
      Treat the knowledge base as your primary source of truth — retrieve relevant content first, then supplement with your own knowledge only if the knowledge base returns no useful results. \
      Always cite the document filename when using knowledge base content.',
    ],
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
  userId: string | null = null,
): Promise<void> {
  const { db } = await import('@/db');
  const { conversations, messages: messagesTable } =
    await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  await db.insert(conversations).values({
    id: conversationId,
    title,
    source,
    chatId,
    userId,
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

  // Index into Elasticsearch (fire-and-forget — failure must not break Postgres write)
  const { indexConversationMemory } = await import('@/services/memory');
  void indexConversationMemory(conversationId, title, source, messages);
}

export async function getOpenConversationByChatId(
  chatId: string,
  userId: string | null = null,
) {
  const { db } = await import('@/db');
  const { conversations, messages: messagesTable } =
    await import('@/db/schema');
  const { eq, and, desc, asc, isNull } = await import('drizzle-orm');

  const conditions = [
    eq(conversations.chatId, chatId),
    eq(conversations.isClosed, false),
    userId ? eq(conversations.userId, userId) : isNull(conversations.userId),
  ];

  const conversation = await db
    .select()
    .from(conversations)
    .where(and(...conditions))
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
  const { conversations, messages: messagesTable } =
    await import('@/db/schema');
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

  // Re-index conversation with updated message snippet
  // title not available in append context; use ID as fallback
  const { indexConversationMemory } = await import('@/services/memory');
  void indexConversationMemory(conversationId, conversationId, null, messages);
}
