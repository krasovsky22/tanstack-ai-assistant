import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Box,
  Flex,
  Grid,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { ChatInput } from '@/components/ChatInput';

export const Route = createFileRoute('/')({ component: HomePage });

function GreenOrb() {
  return (
    <Box
      position="relative"
      w="100px"
      h="100px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      mb="2"
    >
      <Box
        position="absolute"
        inset="-20px"
        borderRadius="full"
        background="radial-gradient(circle, rgba(90,158,58,0.3) 0%, rgba(90,158,58,0.1) 50%, transparent 70%)"
      />
      <Box
        w="80px"
        h="80px"
        borderRadius="full"
        background="radial-gradient(circle at 35% 35%, #7ACC50, #3D7A28)"
        boxShadow="0 8px 32px rgba(61,122,40,0.4)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
      >
        <Box
          position="absolute"
          top="8px"
          right="10px"
          w="8px"
          h="8px"
          borderRadius="full"
          bg="rgba(255,255,255,0.6)"
        />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"
            fill="white"
          />
        </svg>
      </Box>
    </Box>
  );
}

function CodeSnippetPreview({ type }: { type: 'generator' | 'explain' | 'debug' }) {
  if (type === 'generator') {
    return (
      <Box
        borderRadius="8px"
        overflow="hidden"
        border="1px solid"
        borderColor="border.default"
        mb="3"
        h="120px"
      >
        <HStack px="3" py="2" bg="brand.600" gap="2">
          <Box w="8px" h="8px" borderRadius="full" bg="rgba(255,255,255,0.4)" />
          <Text fontSize="xs" color="white" fontWeight="medium">
            Create auth API with JWT
          </Text>
        </HStack>
        <Box bg="#FAFAFA" p="3" fontFamily="mono" fontSize="xs" color="text.subtle">
          <Text color="text.secondary">function</Text>
          <Text color="text.primary">
            {' '}auth() {'{'}
          </Text>
          <Text pl="4" color="text.secondary">
            ...
          </Text>
          <Text color="text.primary">{'}'}</Text>
        </Box>
      </Box>
    );
  }

  if (type === 'explain') {
    return (
      <Box
        borderRadius="8px"
        overflow="hidden"
        border="1px solid"
        borderColor="border.default"
        mb="3"
        h="120px"
        position="relative"
      >
        <Box bg="#FAFAFA" p="3" fontFamily="mono" fontSize="xs" color="text.subtle" h="full">
          <Text>
            <Text as="span" color="text.secondary">while </Text>
            <Text as="span">(i {'<='} 5) {'{'}</Text>
          </Text>
          <Text pl="4" color="text.secondary">...</Text>
          <Text>{'}'}</Text>
          <Box
            position="absolute"
            right="8px"
            top="50%"
            transform="translateY(-50%)"
            bg="bg.surface"
            borderRadius="6px"
            border="1px solid"
            borderColor="border.default"
            px="2"
            py="1"
            shadow="sm"
          >
            <Text fontSize="xs" color="text.subtle" fontWeight="medium">
              Prevents infinite loop
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      borderRadius="8px"
      overflow="hidden"
      border="1px solid"
      borderColor="border.default"
      mb="3"
      h="120px"
    >
      <Box bg="#FAFAFA" p="3" fontFamily="mono" fontSize="xs" color="text.subtle">
        <Text>
          <Text as="span" color="text.secondary">const </Text>
          <Text as="span">res = fetch("/api");</Text>
        </Text>
        <Text>
          <Text as="span" color="text.secondary">const </Text>
          <Text as="span">data = res.json();</Text>
        </Text>
        <Text>
          <Text as="span" color="text.secondary">console</Text>
          <Text as="span">.log(</Text>
          <Text as="span" color="brand.600" style={{ textDecoration: 'underline' }}>data.name</Text>
          <Text as="span">);</Text>
        </Text>
      </Box>
    </Box>
  );
}

interface FeatureCardProps {
  type: 'generator' | 'explain' | 'debug';
  title: string;
  description: string;
  prompt: string;
}

function FeatureCard({ type, title, description, prompt }: FeatureCardProps) {
  const navigate = useNavigate();

  return (
    <Box
      bg="bg.surface"
      borderRadius="16px"
      border="1px solid"
      borderColor="border.default"
      p="4"
      cursor="pointer"
      _hover={{ shadow: 'md', borderColor: '#D1FAE5', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      onClick={() =>
        navigate({ to: '/conversations/new', search: { q: prompt } } as never)
      }
    >
      <CodeSnippetPreview type={type} />
      <Text fontWeight="bold" color="text.primary" fontSize="md" mb="1">
        {title}
      </Text>
      <Text fontSize="sm" color="text.secondary" lineHeight="1.5">
        {description}
      </Text>
    </Box>
  );
}

function HomePageChatInput() {
  const navigate = useNavigate();

  const handleSubmit = (value: string) => {
    navigate({
      to: '/conversations/new',
      search: { q: value },
    } as never);
  };

  return (
    <ChatInput
      onSubmit={handleSubmit}
      placeholder="Ask AI anything or make something..."
    />
  );
}

function HomePage() {
  return (
    <Flex
      direction="column"
      minH="100vh"
      bg="bg.page"
      p="6"
      gap="4"
    >
      <Box
        bg="bg.surface"
        borderRadius="20px"
        p="8"
        flex="1"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minH="300px"
        mb="2"
      >
        <VStack gap="3" align="center" mb="0">
          <GreenOrb />
          <Text
            fontSize="4xl"
            fontWeight="extrabold"
            color="text.primary"
            textAlign="center"
            lineHeight="1.1"
          >
            Built to think clearly.
          </Text>
          <Text
            fontSize="3xl"
            fontWeight="bold"
            color="#C4C4C4"
            textAlign="center"
            lineHeight="1.2"
          >
            Helping you write better code.
          </Text>
        </VStack>
      </Box>

      <Box
        bg="bg.surface"
        borderRadius="20px"
        p="6"
      >
        <Grid templateColumns="repeat(3, 1fr)" gap="4" mb="6">
          <FeatureCard
            type="generator"
            title="Code Generator"
            description="Generate clean code from simple prompts."
            prompt="Generate clean code for me"
          />
          <FeatureCard
            type="explain"
            title="Explain My Code"
            description="Understand complex code with clear explanations."
            prompt="Explain this code to me"
          />
          <FeatureCard
            type="debug"
            title="Debug Code"
            description="Identify and resolve code errors in seconds."
            prompt="Help me debug this code"
          />
        </Grid>

        <HomePageChatInput />
      </Box>
    </Flex>
  );
}
