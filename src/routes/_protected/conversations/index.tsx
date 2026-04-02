import { createFileRoute, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useEffect, useRef, useState } from 'react';

// useLiveQuery uses useSyncExternalStore without getServerSnapshot — client-only
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : null;
}
import { conversationsCollection } from '@/collections/conversations';
import { queryClient } from '@/lib/queryClient';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import Loader from '@/components/Loader';
import { toaster } from '@/components/ui/toaster';
import { MessageSquare, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/_protected/conversations/')({
  component: ConversationsDashboard,
});

function sourceBadgeColor(source: string): string {
  if (source === 'telegram') return 'blue';
  if (source === 'cron') return 'green';
  return 'gray';
}

function ConversationsDashboard() {
  return (
    <Container maxW="2xl" py="6" px="6">
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="xl">Conversations</Heading>
      </Flex>
      <ClientOnly>
        <ConversationList />
      </ClientOnly>
    </Container>
  );
}

function ConversationList() {
  const { data: conversations } = useLiveQuery((q) =>
    q.from({ c: conversationsCollection }),
  );
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (conversations === undefined) {
    return <Loader text="Loading conversations..." />;
  }

  const sorted = [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const filtered = debouncedSearch.trim()
    ? sorted.filter((c) =>
        c.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : sorted;

  async function handleDelete(
    id: string,
    title: string,
    e: React.MouseEvent,
  ) {
    e.preventDefault();

    const snapshot = conversations?.find((c) => c.id === id);

    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });

    let undone = false;

    toaster.create({
      title: 'Conversation deleted',
      description: `"${title}" was removed.`,
      type: 'info',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          undone = true;
          if (snapshot) {
            await fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: snapshot.id,
                title: snapshot.title,
                messages: [],
              }),
            });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        },
      },
      onStatusChange: ({ status }) => {
        if (status === 'unmounted' && !undone) {
          // Dismissed without undo — nothing more needed
        }
      },
    });
  }

  if (sorted.length === 0) {
    return (
      <VStack gap={4} py={16} alignItems="center" textAlign="center">
        <MessageSquare size={40} color="var(--chakra-colors-text-muted)" />
        <Heading size="md" color="text.primary">
          No conversations yet
        </Heading>
        <Text color="text.secondary" fontSize="sm">
          Start a conversation with the AI assistant.
        </Text>
        <Button asChild colorPalette="gray" variant="solid" size="sm">
          <Link to="/conversations/new">Start a conversation</Link>
        </Button>
      </VStack>
    );
  }

  return (
    <>
      <Box mb="4">
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={handleSearchChange}
          size="sm"
          borderRadius="md"
        />
      </Box>

      {filtered.length === 0 && (
        <Text color="text.muted" fontSize="sm" textAlign="center" py="8">
          No conversations match your search.
        </Text>
      )}

      <VStack as="ul" gap="2" align="stretch" listStyleType="none" p="0">
        {filtered.map((c) => (
          <Box as="li" key={c.id} position="relative" role="group">
            <Box asChild>
              <Link
                to="/conversations/$id"
                params={{ id: c.id }}
                style={{ textDecoration: 'none' }}
              >
                <Box
                  p="4"
                  borderRadius="lg"
                  borderWidth="1px"
                  bg="bg.surface"
                  _hover={{ bg: 'bg.subtle', borderColor: 'border.default' }}
                  _focusVisible={{
                    outline: '2px solid',
                    outlineColor: 'brand.500',
                    outlineOffset: '2px',
                    borderRadius: '8px',
                  }}
                  transition="all 0.15s ease"
                  pr="12"
                >
                  <Text
                    fontWeight="semibold"
                    color="text.primary"
                    truncate
                  >
                    {c.title}
                  </Text>
                  <Text
                    fontSize="10px"
                    color="gray.300"
                    mt="1"
                  >
                    {new Date(c.updatedAt).toLocaleString()}
                  </Text>
                  {c.source && (
                    <Box mt="1.5">
                      <Badge
                        colorPalette={sourceBadgeColor(c.source)}
                        variant="subtle"
                        borderRadius="full"
                        px="2"
                        py="0.5"
                        fontSize="xs"
                        fontWeight="medium"
                        textTransform="capitalize"
                      >
                        {c.source}
                      </Badge>
                    </Box>
                  )}
                </Box>
              </Link>
            </Box>
            <IconButton
              aria-label={`Delete "${c.title}"`}
              variant="ghost"
              size="sm"
              color="gray.400"
              _hover={{ color: 'red.600', bg: 'red.50' }}
              position="absolute"
              right="3"
              top="3"
              opacity="0.4"
              _groupHover={{ opacity: 1 }}
              _groupFocusWithin={{ opacity: 1 }}
              transition="opacity 0.15s"
              onClick={(e) => handleDelete(c.id, c.title, e)}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ))}
      </VStack>
    </>
  );
}
