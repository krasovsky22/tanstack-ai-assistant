import { createFileRoute } from '@tanstack/react-router';
// import { CONVERSATION_SOURCES } from '@/lib/conversation-sources';

type GatewayAction = 'continue' | 'new_conversation' | 'close_conversation';

interface GatewayDecision {
  action: GatewayAction;
  response: string;
}

const GATEWAY_SYSTEM_PROMPT = `You are a helpful assistant accessible through a messaging gateway (e.g., Telegram).

You must respond with ONLY valid JSON — no markdown, no code blocks, no extra text.

Format:
{"action":"<action>","response":"<your response to the user>"}

Choose the action based on the user's message. The possible actions are:
- "continue": user is continuing the current conversation
- "new_conversation": close the current conversation and start a new one (user says "start new", "new topic", "let's start over", or finishes and immediately starts something new)
- "close_conversation": user wants to end the current conversation without starting a new one (says "goodbye", "done", "thanks, that's all", etc.)

Respond naturally and helpfully in the "response" field.`;

function parseGatewayDecision(
  raw: string,
  hasOpenConversation: boolean,
): GatewayDecision {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const action: GatewayAction =
      parsed.action ?? (hasOpenConversation ? 'continue' : 'new_conversation');
    const response: string = parsed.response ?? raw;
    return { action, response };
  } catch {
    return {
      action: hasOpenConversation ? 'continue' : 'new_conversation',
      response: raw,
    };
  }
}

export const Route = createFileRoute('/api/chat-sync')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          buildChatOptions,
          runChatWithToolCollection,
          saveConversationToDb,
          getOpenConversationByChatId,
          closeConversation,
          appendMessagesToConversation,
        } = await import('@/services/chat');
        const { getUserSettings, toJiraSettings, toGitHubSettings } = await import('@/services/user-settings');

        const { messages, title, source, chatId, userId, agentId } =
          await request.json();

        console.log('Received Request', messages, title, chatId);

        // Non-gateway flow (no chatId): run chat, optionally persist conversation
        if (!chatId) {
          try {
            const conversationId = crypto.randomUUID();
            const resolvedUserId = userId ? String(userId) : null;
            const userSettingsRecord = resolvedUserId ? await getUserSettings(resolvedUserId) : null;
            const jiraSettings = toJiraSettings(userSettingsRecord);
            const githubSettings = toGitHubSettings(userSettingsRecord);
            const { getAgentById, getDefaultAgent } = await import('@/services/agents');
            const agentConfig = agentId
              ? await getAgentById(agentId)
              : await getDefaultAgent();
            const options = await buildChatOptions(messages, conversationId, resolvedUserId, jiraSettings, githubSettings, agentConfig);
            const { text } = await runChatWithToolCollection(options);

            // Cronjob source: do not persist — only return the response for cronjob logs
            // if (source === CONVERSATION_SOURCES.CRONJOB) {
            return new Response(JSON.stringify({ text }), {
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (err) {
            console.error('[chat-sync] Error:', err);
            return new Response(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Internal error',
              }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            );
          }
        }

        // Gateway flow (has chatId): LLM decides how to manage conversation state
        try {
          const openConversation = await getOpenConversationByChatId(
            String(chatId),
            userId ? String(userId) : null,
          );

          console.log(
            `[chat-sync] chatId=${chatId} openConv=${openConversation?.id ?? 'none'}`,
          );

          // Build context: previous messages from DB + incoming message
          const previousMessages = openConversation
            ? openConversation.messages.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: (m.parts as Array<{ type: string; content: string }>)
                  .filter((p) => p.type === 'text')
                  .map((p) => p.content)
                  .join('\n'),
              }))
            : [];

          const allMessages = [
            ...previousMessages,
            { role: 'user' as const, content: messages[0].content },
          ];

          // Extract text for title/logging (content may be string or ContentPart[])
          const firstMessageText = Array.isArray(messages[0].content)
            ? (messages[0].content as Array<{ type: string; content?: string }>)
                .filter((p) => p.type === 'text')
                .map((p) => p.content ?? '')
                .join(' ')
            : String(messages[0].content);

          // Single LLM call: determine action + generate response (with all tools)
          const resolvedUserId = userId ? String(userId) : null;
          const userSettingsRecord = resolvedUserId ? await getUserSettings(resolvedUserId) : null;
          const jiraSettings = toJiraSettings(userSettingsRecord);
          const githubSettings = toGitHubSettings(userSettingsRecord);
          const { getAgentById, getDefaultAgent } = await import('@/services/agents');
          const agentConfig = agentId
            ? await getAgentById(agentId)
            : await getDefaultAgent();
          const gatewayOptions = await buildChatOptions(allMessages, undefined, resolvedUserId, jiraSettings, githubSettings, agentConfig);
          const { text: rawDecision, assistantParts } =
            await runChatWithToolCollection(gatewayOptions, [
              GATEWAY_SYSTEM_PROMPT,
            ]);

          const { action, response: responseText } = parseGatewayDecision(
            rawDecision,
            !!openConversation,
          );

          console.log(
            `[chat-sync] chatId=${chatId} action=${action} openConv=${openConversation?.id ?? 'none'}`,
          );

          const userMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            parts: Array.isArray(messages[0].content)
              ? messages[0].content
              : [{ type: 'text', content: messages[0].content }],
          };
          const assistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            parts: assistantParts,
          };

          const conversationTitle =
            title ?? `${source ?? 'Gateway'}: ${firstMessageText.slice(0, 60)}`;

          switch (action) {
            case 'new_conversation': {
              if (openConversation) {
                await closeConversation(openConversation.id);
              }
              const newConvId = crypto.randomUUID();
              await saveConversationToDb(
                newConvId,
                conversationTitle,
                [userMessage, assistantMessage],
                source ?? null,
                String(chatId),
                userId ? String(userId) : null,
              );
              break;
            }
            case 'continue': {
              if (openConversation) {
                await appendMessagesToConversation(openConversation.id, [
                  userMessage,
                  assistantMessage,
                ]);
              } else {
                // No open conversation exists, create a new one
                const newConvId = crypto.randomUUID();
                await saveConversationToDb(
                  newConvId,
                  conversationTitle,
                  [userMessage, assistantMessage],
                  source ?? null,
                  String(chatId),
                  userId ? String(userId) : null,
                );
              }
              break;
            }
            case 'close_conversation': {
              if (openConversation) {
                await closeConversation(openConversation.id);
              }
              break;
            }
            default: {
              console.log(
                `[chat-sync] Unknown action "${action}", not modifying conversations. Returning response only.`,
              );
              // Respond without touching the DB
              break;
            }
          }

          return new Response(JSON.stringify({ text: responseText }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          console.error('[chat-sync] Gateway error:', err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Internal error',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
