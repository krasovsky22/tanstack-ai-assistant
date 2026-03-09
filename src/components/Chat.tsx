import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchHttpStream, useChat, type UIMessage } from '@tanstack/ai-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { marked } from 'marked';
import { generateUUID } from '@/lib/uuid';
import { Code } from './Code';

interface PendingImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

interface PendingFile {
  name: string;
  content: string;
}

type MarkdownSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; language: string; content: string };

function splitMarkdownCodeBlocks(text: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].replace(/\n$/, ''),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}

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

type MessagePart = {
  type: string;
  content?: string;
  id?: string;
  name?: string;
  arguments?: string;
  state?: string;
  toolCallId?: string;
  error?: string;
};

function AssistantMeta({
  parts,
  isStreaming,
}: {
  parts: MessagePart[];
  isStreaming: boolean;
}) {
  const toolCalls = parts.filter((p) => p.type === 'tool-call');
  const toolResults = parts.filter((p) => p.type === 'tool-result');
  const thinkingParts = parts.filter((p) => p.type === 'thinking');
  const hasDebugInfo =
    thinkingParts.length > 0 || toolCalls.length > 0 || toolResults.length > 0;

  if (!hasDebugInfo) return null;

  const toolNames = toolCalls
    .map((p) => p.name)
    .filter(Boolean) as string[];
  const uniqueTools = [...new Set(toolNames)];

  return (
    <details
      className="mt-2 rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-700"
      open={isStreaming}
    >
      <summary className="cursor-pointer select-none px-2 py-1.5 font-semibold text-gray-600 flex items-center gap-2">
        <span>How this was generated</span>
        {uniqueTools.length > 0 && (
          <span className="flex gap-1 flex-wrap">
            {uniqueTools.map((name) => (
              <span
                key={name}
                className="bg-blue-100 text-blue-700 rounded px-1 py-0.5 text-[10px] font-medium"
              >
                {name}
              </span>
            ))}
          </span>
        )}
        {isStreaming && (
          <span className="ml-auto text-[10px] text-gray-400 animate-pulse">
            running…
          </span>
        )}
      </summary>
      <div className="px-2 pb-2 space-y-2 mt-1">
        {thinkingParts.map((part, idx) => (
          <div
            key={`thinking-${idx}`}
            className="rounded border border-gray-200 bg-white px-2 py-1"
          >
            <div className="font-semibold text-gray-500 mb-0.5">Thinking</div>
            <div className="whitespace-pre-wrap text-gray-600">
              {part.content}
            </div>
          </div>
        ))}
        {parts.map((part, idx) => {
          if (part.type === 'tool-call') {
            return (
              <div
                key={`tool-call-${part.id}-${idx}`}
                className="rounded border border-blue-100 bg-white px-2 py-1"
              >
                <div className="font-semibold text-blue-700">
                  Tool: {part.name}
                  <span className="ml-1 font-normal text-gray-400">
                    ({formatToolCallState(part.state ?? '')})
                  </span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-gray-600">
                  {prettifyJsonString(part.arguments ?? '')}
                </pre>
              </div>
            );
          }
          if (part.type === 'tool-result') {
            return (
              <div
                key={`tool-result-${part.toolCallId}-${idx}`}
                className="rounded border border-green-100 bg-white px-2 py-1"
              >
                <div className="font-semibold text-green-700">
                  Result
                  <span className="ml-1 font-normal text-gray-400">
                    ({formatToolResultState(part.state ?? '')})
                  </span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-gray-600">
                  {prettifyJsonString(part.content ?? '')}
                </pre>
                {part.error && (
                  <div className="mt-1 text-red-600">Error: {part.error}</div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </details>
  );
}

interface ChatProps {
  conversationId?: string;
  initialMessages?: Array<UIMessage>;
  initialTitle?: string;
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

export function Chat({
  conversationId: propConversationId,
  initialMessages,
  initialTitle,
}: ChatProps) {
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isNew = propConversationId === undefined;

  const conversationId = useMemo(
    () => propConversationId ?? generateUUID(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, isLoading, error, status } = useChat({
    connection: fetchHttpStream('/api/chat'),
    initialMessages,
    body: { conversationId },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveTitle = async (id: string, newTitle: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
  };

  const startEditingTitle = () => {
    setTitleDraft(title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const commitTitle = async () => {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === title) return;
    setTitle(trimmed);
    await saveTitle(conversationId, trimmed);
  };

  const prevStatus = useRef(status);
  const navigatedRef = useRef(false);
  useEffect(() => {
    if (
      prevStatus.current === 'streaming' &&
      status === 'ready' &&
      messages.length > 0
    ) {
      const firstUserMessage = messages.find((m) => m.role === 'user');
      const derivedTitle =
        firstUserMessage?.parts.find((p) => p.type === 'text')?.content ??
        'New conversation';
      saveConversation(conversationId, messages).then(() => {
        if (isNew) {
          setTitle(derivedTitle as string);
        }
        if (isNew && !navigatedRef.current) {
          navigatedRef.current = true;
          navigate({
            to: '/conversations/$id',
            params: { id: conversationId },
            replace: true,
          });
        }
      });
    }
    prevStatus.current = status;
  }, [status, conversationId, messages, isNew, navigate]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newImages: PendingImage[] = [];
    const newTextFiles: PendingFile[] = [];

    await Promise.all(
      files.map(
        (file) =>
          new Promise<void>((resolve) => {
            const reader = new FileReader();
            if (file.type.startsWith('image/')) {
              reader.onload = () => {
                const result = reader.result as string;
                newImages.push({
                  base64: result.split(',')[1],
                  mimeType: file.type,
                  previewUrl: URL.createObjectURL(file),
                });
                resolve();
              };
              reader.readAsDataURL(file);
            } else {
              reader.onload = () => {
                newTextFiles.push({
                  name: file.name,
                  content: reader.result as string,
                });
                resolve();
              };
              reader.readAsText(file);
            }
          }),
      ),
    );

    if (newImages.length > 0)
      setPendingImages((prev) => [...prev, ...newImages]);
    if (newTextFiles.length > 0)
      setPendingFiles((prev) => [...prev, ...newTextFiles]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasAttachments = pendingImages.length > 0 || pendingFiles.length > 0;
    if ((!input.trim() && !hasAttachments) || isLoading) return;

    if (hasAttachments) {
      const content: Array<Record<string, unknown>> = [];
      if (input.trim()) {
        content.push({ type: 'text', content: input.trim() });
      }
      for (const file of pendingFiles) {
        content.push({
          type: 'text',
          content: `[Attached file: ${file.name}]\n${file.content}`,
        });
      }
      for (const img of pendingImages) {
        content.push({
          type: 'image',
          source: { type: 'data', value: img.base64, mimeType: img.mimeType },
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendMessage({ content } as any);
      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
      setPendingFiles([]);
    } else {
      sendMessage(input);
    }
    setInput('');
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-3xl mx-auto">
      <nav className="flex items-center gap-3 text-sm">
        <Link
          to="/conversations"
          className="text-gray-500 hover:text-gray-900 transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          to="/conversations/new"
          className="text-gray-500 hover:text-gray-900 transition-colors"
        >
          New Chat
        </Link>
      </nav>
      <div className="flex items-center gap-2 min-w-0">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            className="text-lg font-semibold border-b border-gray-400 bg-transparent outline-none w-full"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={startEditingTitle}
            disabled={!title}
            className="text-lg font-semibold text-left truncate hover:text-gray-600 disabled:cursor-default disabled:hover:text-inherit"
            title="Click to edit title"
          >
            {title || 'Chat'}
          </button>
        )}
      </div>

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
                    if (message.role === 'assistant') {
                      const segments = splitMarkdownCodeBlocks(part.content);
                      return (
                        <div key={idx}>
                          {segments.map((seg, segIdx) =>
                            seg.type === 'code' ? (
                              <Code
                                key={segIdx}
                                code={seg.content}
                                language={seg.language}
                              />
                            ) : (
                              <div
                                key={segIdx}
                                className="prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5"
                                dangerouslySetInnerHTML={{
                                  __html: marked.parse(seg.content, {
                                    async: false,
                                  }) as string,
                                }}
                              />
                            ),
                          )}
                        </div>
                      );
                    }
                    return <div key={idx}>{part.content}</div>;
                  }
                  if (part.type === 'image') {
                    const imgPart = part as {
                      type: 'image';
                      source?: {
                        type: string;
                        value?: string;
                        mimeType?: string;
                      };
                    };
                    if (
                      imgPart.source?.type === 'data' &&
                      imgPart.source.value
                    ) {
                      const mimeType = imgPart.source.mimeType ?? 'image/jpeg';
                      return (
                        <img
                          key={idx}
                          src={`data:${mimeType};base64,${imgPart.source.value}`}
                          alt="attached image"
                          className="max-w-sm max-h-64 rounded border mt-1"
                        />
                      );
                    }
                  }
                  return null;
                })}

                {message.role === 'assistant' ? (
                  <AssistantMeta
                    parts={message.parts}
                    isStreaming={
                      showAgentStatus &&
                      message.id === latestAssistantMessage?.id
                    }
                  />
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error ? (
        <div className="text-sm text-red-600">
          {error instanceof Error ? error.message : String(error)}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {(pendingImages.length > 0 || pendingFiles.length > 0) && (
          <div className="flex gap-2 flex-wrap">
            {pendingImages.map((img, i) => (
              <div key={`img-${i}`} className="relative">
                <img
                  src={img.previewUrl}
                  alt="pending"
                  className="w-16 h-16 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            {pendingFiles.map((file, i) => (
              <div
                key={`file-${i}`}
                className="relative flex items-center gap-1 px-2 py-1 rounded border bg-gray-50 text-xs text-gray-700 max-w-40"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-1 text-gray-400 hover:text-black leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.csv,.md,text/plain,text/csv,text/markdown"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Attach file"
          >
            📎
          </button>
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
            disabled={
              (!input.trim() &&
                pendingImages.length === 0 &&
                pendingFiles.length === 0) ||
              isLoading
            }
            className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
