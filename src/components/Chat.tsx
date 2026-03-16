import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchHttpStream, useChat, type UIMessage } from '@tanstack/ai-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { marked } from 'marked';
import { generateUUID } from '@/lib/uuid';
import { Code } from './Code';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
} from '@chakra-ui/react';

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
    case 'awaiting-input': return 'awaiting input';
    case 'input-streaming': return 'receiving arguments';
    case 'input-complete': return 'ready';
    case 'approval-requested': return 'awaiting approval';
    case 'approval-responded': return 'approval received';
    default: return state;
  }
}

function formatToolResultState(state: string) {
  switch (state) {
    case 'streaming': return 'streaming result';
    case 'complete': return 'completed';
    case 'error': return 'error';
    default: return state;
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

  const toolNames = toolCalls.map((p) => p.name).filter(Boolean) as string[];
  const uniqueTools = [...new Set(toolNames)];

  return (
    <details
      style={{ marginTop: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '11px', color: '#374151' }}
      open={isStreaming}
    >
      <summary style={{ cursor: 'pointer', padding: '6px 8px', fontWeight: 600, color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>How this was generated</span>
        {uniqueTools.length > 0 && (
          <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {uniqueTools.map((name) => (
              <Badge key={name} colorPalette="blue" size="sm" variant="subtle">{name}</Badge>
            ))}
          </span>
        )}
        {isStreaming && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#9ca3af' }}>running…</span>
        )}
      </summary>
      <Box px="2" pb="2" spaceY="2" mt="1">
        {thinkingParts.map((part, idx) => (
          <Box key={`thinking-${idx}`} borderRadius="md" borderWidth="1px" borderColor="gray.200" bg="white" px="2" py="1">
            <Text fontWeight="semibold" color="gray.500" mb="0.5" fontSize="xs">Thinking</Text>
            <Text whiteSpace="pre-wrap" color="gray.600" fontSize="xs">{part.content}</Text>
          </Box>
        ))}
        {parts.map((part, idx) => {
          if (part.type === 'tool-call') {
            return (
              <Box key={`tool-call-${part.id}-${idx}`} borderRadius="md" borderWidth="1px" borderColor="blue.100" bg="white" px="2" py="1">
                <Text fontWeight="semibold" color="blue.700" fontSize="xs">
                  Tool: {part.name}{' '}
                  <Text as="span" fontWeight="normal" color="gray.400">({formatToolCallState(part.state ?? '')})</Text>
                </Text>
                <Box as="pre" mt="1" whiteSpace="pre-wrap" style={{ wordBreak: 'break-word' }} color="gray.600" fontSize="xs">
                  {prettifyJsonString(part.arguments ?? '')}
                </Box>
              </Box>
            );
          }
          if (part.type === 'tool-result') {
            return (
              <Box key={`tool-result-${part.toolCallId}-${idx}`} borderRadius="md" borderWidth="1px" borderColor="green.100" bg="white" px="2" py="1">
                <Text fontWeight="semibold" color="green.700" fontSize="xs">
                  Result{' '}
                  <Text as="span" fontWeight="normal" color="gray.400">({formatToolResultState(part.state ?? '')})</Text>
                </Text>
                <Box as="pre" mt="1" whiteSpace="pre-wrap" style={{ wordBreak: 'break-word' }} color="gray.600" fontSize="xs">
                  {prettifyJsonString(part.content ?? '')}
                </Box>
                {part.error && (
                  <Text mt="1" color="red.600" fontSize="xs">Error: {part.error}</Text>
                )}
              </Box>
            );
          }
          return null;
        })}
      </Box>
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

    if (newImages.length > 0) setPendingImages((prev) => [...prev, ...newImages]);
    if (newTextFiles.length > 0) setPendingFiles((prev) => [...prev, ...newTextFiles]);
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
    <Flex flexDir="column" gap="4" p="4" maxW="3xl" mx="auto">
      {/* Breadcrumb */}
      <HStack fontSize="sm" gap="2">
        <Box asChild color="gray.500" _hover={{ color: 'gray.900' }}>
          <Link to="/conversations">Dashboard</Link>
        </Box>
        <Text color="gray.300">/</Text>
        <Box asChild color="gray.500" _hover={{ color: 'gray.900' }}>
          <Link to="/conversations/new">New Chat</Link>
        </Box>
      </HStack>

      {/* Title */}
      <Box>
        {editingTitle ? (
          <Input
            ref={titleInputRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            fontSize="lg"
            fontWeight="semibold"
            variant="flushed"
            autoFocus
          />
        ) : (
          <Button
            variant="ghost"
            size="lg"
            fontWeight="semibold"
            onClick={startEditingTitle}
            disabled={!title}
            px="0"
            _hover={{ color: 'gray.600' }}
            title="Click to edit title"
          >
            {title || 'Chat'}
          </Button>
        )}
      </Box>

      {/* Status */}
      {showAgentStatus && (
        <HStack
          borderRadius="lg"
          borderWidth="1px"
          px="3"
          py="2"
          fontSize="sm"
          bg="gray.50"
          color="gray.700"
          gap="2"
        >
          <Spinner size="xs" />
          <Text fontWeight="medium">Status:</Text>
          <Text>{agentStatusText}</Text>
        </HStack>
      )}

      {/* Messages */}
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p="4"
        h="60vh"
        overflowY="auto"
        bg="white"
      >
        {messages.length === 0 ? (
          <Text color="gray.500">Say hi to start.</Text>
        ) : (
          messages.map((message) => (
            <Box key={message.id} mb="4">
              <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb="1">
                {message.role === 'assistant' ? 'Assistant' : 'You'}
              </Text>
              <Box color="gray.900">
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
                    if (imgPart.source?.type === 'data' && imgPart.source.value) {
                      const mimeType = imgPart.source.mimeType ?? 'image/jpeg';
                      return (
                        <img
                          key={idx}
                          src={`data:${mimeType};base64,${imgPart.source.value}`}
                          alt="attached image"
                          style={{ maxWidth: '24rem', maxHeight: '16rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
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
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Error */}
      {error && (
        <Text fontSize="sm" color="red.600">
          {error instanceof Error ? error.message : String(error)}
        </Text>
      )}

      {/* Input form */}
      <Box as="form" onSubmit={handleSubmit} display="flex" flexDir="column" gap="2">
        {(pendingImages.length > 0 || pendingFiles.length > 0) && (
          <HStack gap="2" flexWrap="wrap">
            {pendingImages.map((img, i) => (
              <Box key={`img-${i}`} position="relative">
                <img
                  src={img.previewUrl}
                  alt="pending"
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
                <Button
                  type="button"
                  onClick={() => removeImage(i)}
                  position="absolute"
                  top="-1.5"
                  right="-1.5"
                  w="5"
                  h="5"
                  minW="unset"
                  p="0"
                  bg="black"
                  color="white"
                  borderRadius="full"
                  fontSize="xs"
                  lineHeight="none"
                >
                  ×
                </Button>
              </Box>
            ))}
            {pendingFiles.map((file, i) => (
              <HStack
                key={`file-${i}`}
                position="relative"
                px="2"
                py="1"
                borderRadius="md"
                borderWidth="1px"
                bg="gray.50"
                fontSize="xs"
                color="gray.700"
                maxW="40"
                gap="1"
              >
                <Text truncate>{file.name}</Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => removeFile(i)}
                  color="gray.400"
                  _hover={{ color: 'black' }}
                  ml="1"
                  minW="unset"
                  p="0"
                >
                  ×
                </Button>
              </HStack>
            ))}
          </HStack>
        )}

        <HStack gap="2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.csv,.md,text/plain,text/csv,text/markdown"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            px="3"
            title="Attach file"
          >
            📎
          </Button>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            flex="1"
          />
          <Button
            type="submit"
            disabled={
              (!input.trim() &&
                pendingImages.length === 0 &&
                pendingFiles.length === 0) ||
              isLoading
            }
            colorPalette="gray"
            variant="solid"
          >
            Send
          </Button>
        </HStack>
      </Box>
    </Flex>
  );
}
