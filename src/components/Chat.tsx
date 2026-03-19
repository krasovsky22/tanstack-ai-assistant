import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchHttpStream, useChat, type UIMessage } from '@tanstack/ai-react';
import { ChevronRight, Pencil } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateUUID } from '@/lib/uuid';
import { Code } from './Code';
import { ChatInput } from './ChatInput';
import { markdownComponents } from './MarkdownRenderer';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
  Wrap,
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
    <Box
      as="details"
      mt="2"
      borderRadius="6px"
      border="1px solid"
      borderColor="border.default"
      bg="bg.surface"
      fontSize="11px"
      color="text.primary"
      open={isStreaming}
    >
      <Box
        as="summary"
        cursor="pointer"
        px="2"
        py="1.5"
        fontWeight="semibold"
        color="text.muted"
        display="flex"
        alignItems="center"
        gap="2"
      >
        <Text as="span">How this was generated</Text>
        {uniqueTools.length > 0 && (
          <HStack gap="1" flexWrap="wrap">
            {uniqueTools.map((name) => (
              <Badge key={name} colorPalette="blue" size="sm" variant="subtle">{name}</Badge>
            ))}
          </HStack>
        )}
        {isStreaming && (
          <Text as="span" ml="auto" fontSize="10px" color="text.subtle">running…</Text>
        )}
      </Box>
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
                <Box as="pre" mt="1" whiteSpace="pre-wrap" wordBreak="break-word" color="gray.600" fontSize="xs">
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
                <Box as="pre" mt="1" whiteSpace="pre-wrap" wordBreak="break-word" color="gray.600" fontSize="xs">
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
    </Box>
  );
}

interface ChatProps {
  conversationId?: string;
  initialMessages?: Array<UIMessage>;
  initialTitle?: string;
  suggestedPrompt?: string;
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
  suggestedPrompt: initialSuggestedPrompt,
}: ChatProps) {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState(initialSuggestedPrompt ?? '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isNew = propConversationId === undefined;

  const conversationId = useMemo(
    () => propConversationId ?? generateUUID(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, isLoading, error, status, stop } = useChat({
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

  const handleChatInputSubmit = (value: string) => {
    const hasAttachments = pendingImages.length > 0 || pendingFiles.length > 0;

    if (hasAttachments) {
      const content: Array<Record<string, unknown>> = [];
      if (value) {
        content.push({ type: 'text', content: value });
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
      sendMessage(value);
    }
  };

  return (
    <Flex flexDir="column" h="100%" minH="0">
      {/* Header bar */}
      <Box
        px="6"
        py="4"
        borderBottom="1px solid"
        borderColor="border.default"
        bg="bg.surface"
        flexShrink={0}
      >
        <HStack justify="space-between" align="center">
          {/* Breadcrumb */}
          <HStack fontSize="sm" gap="2">
            <Box asChild color="text.muted" _hover={{ color: 'text.primary' }}>
              <Link to="/conversations">Dashboard</Link>
            </Box>
            <ChevronRight size={12} color="var(--chakra-colors-text-subtle)" />
            <Text color="text.primary" fontWeight="medium">New Chat</Text>
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
                fontSize="sm"
                fontWeight="semibold"
                variant="flushed"
                autoFocus
                size="sm"
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                fontWeight="semibold"
                onClick={startEditingTitle}
                px="2"
                color="text.primary"
                _hover={{ color: 'text.secondary' }}
                title="Click to edit title"
                gap="1.5"
                role="group"
              >
                {title || 'New Chat'}
                <Box
                  as="span"
                  opacity={0.35}
                  _groupHover={{ opacity: 1 }}
                  transition="opacity 0.15s"
                  display="flex"
                  alignItems="center"
                >
                  <Pencil size={14} />
                </Box>
              </Button>
            )}
          </Box>
        </HStack>

        {/* Agent status */}
        {showAgentStatus && (
          <HStack
            mt="2"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="border.default"
            px="3"
            py="2"
            fontSize="sm"
            bg="bg.page"
            color="text.secondary"
            gap="2"
          >
            <Spinner size="xs" />
            <Text fontWeight="medium">Status:</Text>
            <Text flex="1">{agentStatusText}</Text>
            {(status === 'streaming' || status === 'submitted') && (
              <Button
                size="xs"
                variant="ghost"
                color="text.muted"
                _hover={{ bg: 'bg.surface', color: 'text.primary' }}
                borderRadius="6px"
                onClick={() => stop()}
                fontSize="xs"
              >
                Stop generating
              </Button>
            )}
          </HStack>
        )}
      </Box>

      {/* Messages area */}
      <Box flex="1" overflowY="auto" px="6" py="4" minH="0">
        {messages.length === 0 ? (
          <Flex h="full" align="center" justify="center">
            <VStack gap="4" textAlign="center">
              <Text color="text.subtle">Say hi to start a conversation.</Text>
              <Wrap gap="2" justify="center">
                {[
                  'What can you do?',
                  'Help me write an email',
                  'Create a cronjob',
                  'Summarize a document',
                ].map((chip) => (
                  <Button
                    key={chip}
                    variant="outline"
                    size="sm"
                    borderRadius="full"
                    fontSize="xs"
                    color="text.secondary"
                    borderColor="border.default"
                    _hover={{ bg: 'bg.surface', borderColor: 'brand.400', color: 'text.primary' }}
                    onClick={() => setSuggestedPrompt(chip)}
                  >
                    {chip}
                  </Button>
                ))}
              </Wrap>
            </VStack>
          </Flex>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <Flex
                key={message.id}
                mb="4"
                justifyContent={isUser ? 'flex-end' : 'flex-start'}
              >
                <Box
                  bg={isUser ? 'brand.600' : 'bg.surface'}
                  color={isUser ? 'white' : 'text.primary'}
                  border={isUser ? 'none' : '1px solid'}
                  borderColor="border.default"
                  borderRadius={isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'}
                  px={4}
                  py={3}
                  maxW={isUser ? '70%' : '85%'}
                >
                  {message.parts.map((part, idx) => {
                    if (part.type === 'text') {
                      if (isUser) {
                        return (
                          <Text key={idx} fontSize="sm" whiteSpace="pre-wrap">
                            {part.content}
                          </Text>
                        );
                      }
                      // Assistant text — check for fenced code blocks first
                      const hasFencedCode = /```[\s\S]*?```/.test(part.content);
                      if (hasFencedCode) {
                        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
                        const segments: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
                        let lastIndex = 0;
                        let match: RegExpExecArray | null;
                        const regex = new RegExp(codeBlockRegex.source, 'g');
                        while ((match = regex.exec(part.content)) !== null) {
                          if (match.index > lastIndex) {
                            segments.push({ type: 'text', content: part.content.slice(lastIndex, match.index) });
                          }
                          segments.push({ type: 'code', content: match[2].replace(/\n$/, ''), language: match[1] || 'text' });
                          lastIndex = match.index + match[0].length;
                        }
                        if (lastIndex < part.content.length) {
                          segments.push({ type: 'text', content: part.content.slice(lastIndex) });
                        }
                        return (
                          <Box key={idx}>
                            {segments.map((seg, segIdx) =>
                              seg.type === 'code' ? (
                                <Code key={segIdx} code={seg.content} language={seg.language ?? 'text'} />
                              ) : (
                                <ReactMarkdown key={segIdx} remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {seg.content}
                                </ReactMarkdown>
                              )
                            )}
                          </Box>
                        );
                      }
                      return (
                        <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {part.content}
                        </ReactMarkdown>
                      );
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
                          <Box
                            key={idx}
                            as="img"
                            src={`data:${mimeType};base64,${imgPart.source.value}`}
                            alt="attached image"
                            maxW="24rem"
                            maxH="16rem"
                            borderRadius="6px"
                            border="1px solid"
                            borderColor="border.default"
                            mt="1"
                            display="block"
                          />
                        );
                      }
                    }
                    return null;
                  })}

                  {message.role === 'assistant' && (
                    <AssistantMeta
                      parts={message.parts}
                      isStreaming={
                        showAgentStatus &&
                        message.id === latestAssistantMessage?.id
                      }
                    />
                  )}
                </Box>
              </Flex>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Error */}
      {error && (
        <Box px="6" pb="2" flexShrink={0}>
          <Text fontSize="sm" color="red.600">
            {error instanceof Error ? error.message : String(error)}
          </Text>
        </Box>
      )}

      {/* Pending attachments preview */}
      {(pendingImages.length > 0 || pendingFiles.length > 0) && (
        <Box px="6" pb="2" flexShrink={0}>
          <HStack gap="2" flexWrap="wrap">
            {pendingImages.map((img, i) => (
              <Box key={`img-${i}`} position="relative">
                <Box
                  as="img"
                  src={img.previewUrl}
                  alt="pending"
                  w="16"
                  h="16"
                  objectFit="cover"
                  borderRadius="6px"
                  border="1px solid"
                  borderColor="border.default"
                  display="block"
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
                px="2"
                py="1"
                borderRadius="md"
                borderWidth="1px"
                bg="bg.surface"
                borderColor="border.default"
                fontSize="xs"
                color="text.secondary"
                maxW="40"
                gap="1"
              >
                <Text truncate>{file.name}</Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => removeFile(i)}
                  color="text.muted"
                  _hover={{ color: 'text.primary' }}
                  ml="1"
                  minW="unset"
                  p="0"
                >
                  ×
                </Button>
              </HStack>
            ))}
          </HStack>
        </Box>
      )}

      {/* Input area */}
      <Box px="6" pb="6" pt="2" flexShrink={0}>
        <ChatInput
          onSubmit={handleChatInputSubmit}
          onFileChange={handleFileChange}
          isLoading={isLoading}
          placeholder="Type a message..."
          fillValue={suggestedPrompt}
          onFillConsumed={() => setSuggestedPrompt('')}
        />
      </Box>
    </Flex>
  );
}
