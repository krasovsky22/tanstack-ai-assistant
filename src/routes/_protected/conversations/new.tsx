import { createFileRoute } from '@tanstack/react-router';
import { Box } from '@chakra-ui/react';
import { Chat } from '@/components/Chat';

export const Route = createFileRoute('/_protected/conversations/new')({
  component: NewConversation,
});

function NewConversation() {
  return (
    <Box h="100vh" bg="bg.page" display="flex" flexDirection="column">
      <Chat />
    </Box>
  );
}
