import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchHttpStream, useChat, type UIMessage } from '@tanstack/ai-react';

function prettifyJsonString(input: string) {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}

function formatToolCallState(state: string) {
  switch (state) {
    case 'awaiting-input':
      return 'awaiting input';
    case 'input-streaming':
      return 'receiving arguments';
    case 'input-complete':
      return 'ready';
    case 'approval-requested':
      return 'awaiting approval';
    case 'approval-responded':
      return 'approval received';
    default:
      return state;
  }
}

function formatToolResultState(state: string) {
  switch (state) {
    case 'streaming':
      return 'streaming result';
    case 'complete':
      return 'completed';
    case 'error':
      return 'error';
    default:
      return state;
  }
}

interface ChatProps {
  conversationId?: string;
  initialMessages?: Array<UIMessage>;
}

async function saveConversation(
  conversationId: string,
  messages: Array<UIMessage>,
) {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const title =
    firstUserMessage?.parts.find((p) => p.type === 'text')?.content ??
    'New conversation';

  await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: conversationId, title, messages }),
  });
}

export function Chat({ conversationId: propConversationId, initialMessages }: ChatProps) {
  const [input, setInput] = useState('');

  const conversationId = useMemo(
    () => propConversationId ?? crypto.randomUUID(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, isLoading, error, status } = useChat({
    connection: fetchHttpStream('/api/chat'),
    initialMessages,
    body: { conversationId },
    onChunk: (chunk) => {
      console.log('[chat:onChunk]', chunk);
    },
  });

  const prevStatus = useRef(status);
  useEffect(() => {
    if (
      prevStatus.current === 'streaming' &&
      status === 'ready' &&
      messages.length > 0
    ) {
      saveConversation(conversationId, messages);
    }
    prevStatus.current = status;
  }, [status, conversationId, messages]);

  const latestAssistantMessage = useMemo(
    () =>
      [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages],
  );

  const isAgentThinking =
    status === 'submitted' ||
    (status === 'streaming' &&
      latestAssistantMessage?.parts.some((part) => part.type === 'thinking'));

  const showAgentStatus =
    isLoading || status === 'submitted' || status === 'streaming';
  const agentStatusText = isAgentThinking ? 'Agent thinking…' : 'Agent typing…';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-3xl mx-auto">
      <div className="text-lg font-semibold">Chat</div>

      {showAgentStatus ? (
        <div className="rounded-lg border px-3 py-2 text-sm bg-gray-50 text-gray-700">
          <span className="font-medium">Status:</span> {agentStatusText}
        </div>
      ) : null}

      <div className="border rounded-lg p-4 h-[60vh] overflow-y-auto bg-white">
        {messages.length === 0 ? (
          <div className="text-gray-500">Say hi to start.</div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-1">
                {message.role === 'assistant' ? 'Assistant' : 'You'}
              </div>
              <div className="text-gray-900">
                {message.parts.map((part, idx) => {
                  if (part.type === 'text') {
                    return <div key={idx}>{part.content}</div>;
                  }
                  return null;
                })}

                {message.role === 'assistant' ? (
                  <>
                    {message.parts.some(
                      (part) =>
                        part.type === 'thinking' ||
                        part.type === 'tool-call' ||
                        part.type === 'tool-result',
                    ) ? (
                      <details className="mt-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700">
                        <summary className="cursor-pointer select-none font-semibold text-gray-600">
                          Execution log (debug)
                        </summary>
                        <div className="mt-2 space-y-2">
                          {message.parts.map((part, idx) => {
                            if (part.type === 'thinking') {
                              return (
                                <div
                                  key={`thinking-${idx}`}
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600"
                                >
                                  <div className="font-semibold">
                                    Thinking step
                                  </div>
                                  <div className="whitespace-pre-wrap">
                                    {part.content}
                                  </div>
                                </div>
                              );
                            }

                            if (part.type === 'tool-call') {
                              return (
                                <div
                                  key={`tool-call-${part.id}-${idx}`}
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
                                >
                                  <div className="font-semibold">
                                    Tool call: {part.name} (
                                    {formatToolCallState(part.state)})
                                  </div>
                                  <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-[11px] text-gray-600">
                                    {prettifyJsonString(part.arguments)}
                                  </pre>
                                </div>
                              );
                            }

                            if (part.type === 'tool-result') {
                              return (
                                <div
                                  key={`tool-result-${part.toolCallId}-${idx}`}
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
                                >
                                  <div className="font-semibold">
                                    Tool result (
                                    {formatToolResultState(part.state)})
                                  </div>
                                  <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-[11px] text-gray-600">
                                    {prettifyJsonString(part.content)}
                                  </pre>
                                  {part.error ? (
                                    <div className="mt-1 text-red-600">
                                      Error: {part.error}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            }

                            return null;
                          })}
                        </div>
                      </details>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? (
        <div className="text-sm text-red-600">
          {error instanceof Error ? error.message : String(error)}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
