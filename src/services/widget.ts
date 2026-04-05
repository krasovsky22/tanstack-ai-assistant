import { CONVERSATION_SOURCES } from '@/lib/conversation-sources';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-widget-api-key',
};

function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function resolveUserId(username: string): Promise<string | null> {
  const { db } = await import('@/db');
  const { users } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  return rows[0]?.id ?? null;
}

export async function handleWidgetPost(request: Request, configuredKey: string): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const apiKey = request.headers.get('x-widget-api-key');
  if (!configuredKey || apiKey !== configuredKey) {
    return corsJson({ error: 'Unauthorized' }, 401);
  }

  let body: { chatId?: string; message?: string; username?: string };
  try {
    body = await request.json() as { chatId?: string; message?: string; username?: string };
  } catch {
    return corsJson({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.chatId || !body.message) {
    return corsJson({ error: 'Missing chatId or message' }, 400);
  }

  const { chatId, message, username } = body;

  try {
    const {
      buildChatOptions,
      runChatWithToolCollection,
      getOpenConversationByChatId,
      saveConversationToDb,
      appendMessagesToConversation,
    } = await import('@/services/chat');
    const { getUserSettings, toJiraSettings, toGitHubSettings } = await import('@/services/user-settings');

    // Resolve username → userId (UUID) if provided
    const userId = username ? await resolveUserId(username) : null;

    // Find or prepare conversation context
    const openConversation = await getOpenConversationByChatId(chatId, userId);
    const previousMessages = openConversation
      ? openConversation.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: (m.parts as Array<{ type: string; content: string }>)
            .filter((p) => p.type === 'text')
            .map((p) => p.content)
            .join('\n'),
        }))
      : [];
    const allMessages = [...previousMessages, { role: 'user' as const, content: message }];

    // Run LLM
    const userSettingsRecord = userId ? await getUserSettings(userId) : null;
    const options = await buildChatOptions(
      allMessages,
      openConversation?.id,
      userId,
      toJiraSettings(userSettingsRecord),
      toGitHubSettings(userSettingsRecord),
    );
    const { text, assistantParts } = await runChatWithToolCollection(options);

    // Persist conversation
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      parts: [{ type: 'text', content: message }],
    };
    const assistantMsg = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      parts: assistantParts,
    };

    let conversationId: string;
    if (openConversation) {
      conversationId = openConversation.id;
      await appendMessagesToConversation(conversationId, [userMsg, assistantMsg]);
    } else {
      conversationId = crypto.randomUUID();
      await saveConversationToDb(
        conversationId,
        `widget: ${message.slice(0, 60)}`,
        [userMsg, assistantMsg],
        CONVERSATION_SOURCES.WIDGET,
        chatId,
        userId,
      );
    }

    return corsJson({ conversationId, text });
  } catch (err) {
    console.error('[widget] Error:', err);
    return corsJson({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
}
