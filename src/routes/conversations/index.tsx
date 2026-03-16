import { createFileRoute, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useEffect, useState } from 'react';
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
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { MessageSquare, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/conversations/')({
  component: ConversationsDashboard,
});

function ConversationsDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Container maxW="2xl" py="6" px="6">
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="xl">Conversations</Heading>
        <Button asChild colorPalette="gray" variant="solid" size="sm">
          <Link to="/conversations/new">New Chat</Link>
        </Button>
      </Flex>
      {mounted ? <ConversationList /> : <ConversationListSkeleton />}
    </Container>
  );
}

function ConversationListSkeleton() {
  return (
    <VStack gap="2" align="stretch">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height="72px" borderRadius="lg" />
      ))}
    </VStack>
  );
}

function ConversationList() {
  const { data: conversations } = useLiveQuery((q) =>
    q.from({ c: conversationsCollection }),
  );

  const sorted = [...(conversations ?? [])].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <VStack gap={4} py={16} alignItems="center" textAlign="center">
        <MessageSquare size={40} color="var(--chakra-colors-text-muted)" />
        <Heading size="md" color="text.primary">No conversations yet</Heading>
        <Text color="text.secondary" fontSize="sm">Start a conversation with the AI assistant.</Text>
        <Button asChild colorPalette="gray" variant="solid" size="sm">
          <Link to="/conversations/new">Start a conversation</Link>
        </Button>
      </VStack>
    );
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }

  return (
    <VStack gap="2" align="stretch">
      {sorted.map((c) => (
        <Box key={c.id} position="relative" role="group">
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
                bg="white"
                _hover={{ bg: 'gray.50', borderColor: 'border.default' }}
                transition="all 0.15s ease"
                pr="12"
              >
                <Text fontWeight="medium" color="gray.900" truncate>{c.title}</Text>
                <Text fontSize="xs" color="gray.400" mt="1">
                  {new Date(c.updatedAt).toLocaleString()}
                </Text>
                {c.source && (
                  <Box mt="1.5">
                    <Badge
                      colorPalette="blue"
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
            aria-label="Delete conversation"
            variant="ghost"
            size="sm"
            color="gray.400"
            _hover={{ color: 'red.600', bg: 'red.50' }}
            position="absolute"
            right="3"
            top="50%"
            transform="translateY(-50%)"
            opacity="0"
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.15s"
            onClick={(e) => handleDelete(c.id, e)}
          >
            <Trash2 size={16} />
          </IconButton>
        </Box>
      ))}
    </VStack>
  );
}
