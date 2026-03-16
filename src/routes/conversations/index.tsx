import { createFileRoute, Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { useEffect, useState } from 'react';
import { conversationsCollection } from '@/collections/conversations';
import { queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/Badge';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';

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
      {mounted ? <ConversationList /> : null}
    </Container>
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
      <Text color="gray.500" textAlign="center" py="12">
        No conversations yet.{' '}
        <Box asChild color="blue.600" _hover={{ textDecoration: 'underline' }}>
          <Link to="/conversations/new">Start chatting</Link>
        </Box>
      </Text>
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
                _hover={{ bg: 'gray.50' }}
                transition="background 0.15s"
                pr="12"
              >
                <Text fontWeight="medium" color="gray.900" truncate>{c.title}</Text>
                <Text fontSize="xs" color="gray.400" mt="1">
                  {new Date(c.updatedAt).toLocaleString()}
                </Text>
                {c.source && (
                  <Box mt="1.5">
                    <Badge label={c.source} />
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
