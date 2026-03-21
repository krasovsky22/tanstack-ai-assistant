import { Link } from '@tanstack/react-router';
import { Box, VStack, Text, Button, HStack } from '@chakra-ui/react';

export function NotFoundPage() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="bg.canvas">
      <VStack gap={6} textAlign="center" maxW="360px">
        <Box
          fontSize="200px"
          fontWeight="900"
          lineHeight="1"
          color="fg.subtle"
          opacity={0.12}
          userSelect="none"
          letterSpacing="-8px"
          aria-hidden="true"
        >
          404
        </Box>
        <VStack gap={2} mt="-80px">
          <Text fontSize="xl" fontWeight="600" color="fg.default">
            Page not found
          </Text>
          <Text fontSize="sm" color="fg.muted" lineHeight="tall">
            The page you're looking for doesn't exist or may have been moved.
          </Text>
        </VStack>
        <HStack gap={3}>
          <Button variant="subtle" size="sm" onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Go home</Link>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
