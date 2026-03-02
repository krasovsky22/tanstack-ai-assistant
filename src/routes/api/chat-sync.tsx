import { chat, maxIterations } from '@tanstack/ai';
import { createFileRoute } from '@tanstack/react-router';
import {
  buildChatOptions,
  saveConversationToDb,
  getOpenConversationByChatId,
  closeConversation,
  appendMessagesToConversation,
} from '@/services/chat';

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
        const { messages, title, source, chatId, userId } =
          await request.json();

        console.log('Recieved Request', messages, title);

        // Non-gateway flow (no chatId): create conversation immediately
        if (!chatId) {
          try {
            const conversationId = crypto.randomUUID();
            const options = await buildChatOptions(messages, conversationId);
            const text = await chat({
              ...options,
              agentLoopStrategy: maxIterations(10),
              stream: false,
            });

            await saveConversationToDb(
              conversationId,
              title ?? 'Chat',
              [
                {
                  id: crypto.randomUUID(),
                  role: 'user',
                  parts: [{ type: 'text', content: messages[0].content }],
                },
                {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  parts: [{ type: 'text', content: text }],
                },
              ],
              source ?? null,
            );

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

          // Single LLM call: determine action + generate response (with all tools)
          const gatewayOptions = await buildChatOptions(allMessages);
          const rawDecision = await chat({
            ...gatewayOptions,
            systemPrompts: [GATEWAY_SYSTEM_PROMPT],
            agentLoopStrategy: maxIterations(10),
            stream: false,
          });

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
            parts: [{ type: 'text', content: messages[0].content }],
          };
          const assistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            parts: [{ type: 'text', content: responseText }],
          };

          const conversationTitle =
            title ??
            `${source ?? 'Gateway'}: ${messages[0].content.slice(0, 60)}`;

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
