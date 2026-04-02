import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Dialog,
  Flex,
  Spinner,
  Text,
  IconButton,
  Collapsible,
} from '@chakra-ui/react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface Tool {
  name: string;
  description: string;
}

interface ToolsModalProps {
  open: boolean;
  onClose: () => void;
}

const GROUP_RULES: Array<{ label: string; match: (name: string) => boolean }> =
  [
    { label: 'Jira', match: (n) => n.startsWith('jira_') },
    { label: 'GitHub', match: (n) => n.startsWith('github_') || n.includes('github') },
    { label: 'Cronjobs', match: (n) => n.includes('cronjob') },
    { label: 'Jobs', match: (n) => n.includes('_job') || n === 'list_jobs' },
    {
      label: 'Email',
      match: (n) =>
        n.includes('email') ||
        n === 'ingest_emails' ||
        n === 'store_classified_emails',
    },
    { label: 'Files', match: (n) => n.includes('file') },
    { label: 'Conversations', match: (n) => n.includes('conversation') },
    { label: 'Knowledge Base', match: (n) => n.includes('knowledge_base') },
    { label: 'Memory', match: (n) => n.includes('memory') },
    { label: 'News', match: (n) => n.includes('news') },
    { label: 'System', match: (n) => n === 'execute_command' },
  ];

function groupTools(tools: Tool[]): Array<{ label: string; tools: Tool[] }> {
  const assigned = new Set<string>();
  const groups: Array<{ label: string; tools: Tool[] }> = [];

  for (const rule of GROUP_RULES) {
    const matched = tools.filter(
      (t) => !assigned.has(t.name) && rule.match(t.name),
    );
    if (matched.length > 0) {
      matched.forEach((t) => assigned.add(t.name));
      groups.push({ label: rule.label, tools: matched });
    }
  }

  const others = tools.filter((t) => !assigned.has(t.name));
  if (others.length > 0) {
    groups.push({ label: 'Other', tools: others });
  }

  return groups;
}

export function ToolsModal({ open, onClose }: ToolsModalProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch('/api/tools')
      .then((r) => r.json())
      .then((data) => setTools(data.tools ?? []))
      .catch(() => setError('Failed to load tools.'))
      .finally(() => setLoading(false));
  }, [open]);

  const groups = groupTools(tools);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size="md"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content borderRadius="16px" overflow="hidden">
          <Dialog.Header
            borderBottom="1px solid"
            borderColor="gray.100"
            px="6"
            py="4"
            position="relative"
          >
            <Box>
              <Dialog.Title fontSize="md" fontWeight="600" color="text.primary">
                Available Tools
              </Dialog.Title>
              {!loading && tools.length > 0 && (
                <Text fontSize="xs" color="text.muted" mt="0.5">
                  {tools.length} tool{tools.length !== 1 ? 's' : ''} across{' '}
                  {groups.length} group{groups.length !== 1 ? 's' : ''}
                </Text>
              )}
            </Box>
            <IconButton
              aria-label="Close Available Tools"
              variant="ghost"
              size="sm"
              onClick={onClose}
              color="text.muted"
              _hover={{ bg: 'gray.100' }}
              position="absolute"
              top="3"
              right="4"
            >
              <X size={16} />
            </IconButton>
          </Dialog.Header>

          <Dialog.Body px="6" py="4" maxH="520px" overflowY="auto">
            {loading && (
              <Flex justify="center" align="center" py="8">
                <Spinner size="md" color="brand.500" />
              </Flex>
            )}
            {error && (
              <Text color="red.500" fontSize="sm" textAlign="center" py="4">
                {error}
              </Text>
            )}
            {!loading && !error && tools.length === 0 && (
              <Text color="text.muted" fontSize="sm" textAlign="center" py="4">
                No tools loaded.
              </Text>
            )}
            {!loading && !error && groups.length > 0 && (
              <Flex direction="column" gap="2">
                {groups.map((group) => (
                  <Collapsible.Root key={group.label}>
                    <Collapsible.Trigger asChild>
                      <Flex
                        align="center"
                        gap="1.5"
                        px="2"
                        py="1.5"
                        borderRadius="8px"
                        cursor="pointer"
                        _hover={{ bg: 'bg.subtle' }}
                        userSelect="none"
                      >
                        <Collapsible.Context>
                          {({ open }) =>
                            open ? (
                              <ChevronDown
                                size={13}
                                color="var(--chakra-colors-text-muted)"
                              />
                            ) : (
                              <ChevronRight
                                size={13}
                                color="var(--chakra-colors-text-muted)"
                              />
                            )
                          }
                        </Collapsible.Context>
                        <Text
                          fontSize="xs"
                          fontWeight="600"
                          color="text.muted"
                          textTransform="uppercase"
                          letterSpacing="0.06em"
                        >
                          {group.label}
                        </Text>
                        <Badge
                          ml="1"
                          bg="gray.100"
                          color="text.muted"
                          fontSize="10px"
                          borderRadius="full"
                          px="1.5"
                          py="0"
                          fontWeight="500"
                        >
                          {group.tools.length}
                        </Badge>
                      </Flex>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <Flex direction="column" gap="2" pt="1" pb="3" pl="2">
                        {group.tools.map((tool) => (
                          <Box
                            key={tool.name}
                            bg="bg.subtle"
                            borderRadius="10px"
                            px="4"
                            py="3"
                            border="1px solid"
                            borderColor="gray.100"
                          >
                            <Badge
                              bg="brand.50"
                              color="brand.700"
                              fontSize="xs"
                              fontFamily="mono"
                              borderRadius="6px"
                              px="2"
                              py="0.5"
                              mb={tool.description ? '1.5' : '0'}
                            >
                              {tool.name}
                            </Badge>
                            {tool.description && (
                              <Text
                                fontSize="xs"
                                color="text.secondary"
                                lineHeight="1.5"
                              >
                                {tool.description}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Flex>
                    </Collapsible.Content>
                  </Collapsible.Root>
                ))}
              </Flex>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
