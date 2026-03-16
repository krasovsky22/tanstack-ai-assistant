import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  Mic,
  Paperclip,
  Wrench,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

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
        borderColor="#E5E7EB"
        mb="3"
        h="120px"
      >
        <HStack px="3" py="2" bg="#3D7A28" gap="2">
          <Box w="8px" h="8px" borderRadius="full" bg="rgba(255,255,255,0.4)" />
          <Text fontSize="xs" color="white" fontWeight="medium">
            Create auth API with JWT
          </Text>
        </HStack>
        <Box bg="#FAFAFA" p="3" fontFamily="mono" fontSize="xs" color="#374151">
          <Text color="#6B7280">function</Text>
          <Text color="#1A1A1A">
            {' '}auth() {'{'}
          </Text>
          <Text pl="4" color="#6B7280">
            ...
          </Text>
          <Text color="#1A1A1A">{'}'}</Text>
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
        borderColor="#E5E7EB"
        mb="3"
        h="120px"
        position="relative"
      >
        <Box bg="#FAFAFA" p="3" fontFamily="mono" fontSize="xs" color="#374151" h="full">
          <Text>
            <Text as="span" color="#6B7280">while </Text>
            <Text as="span">(i {'<='} 5) {'{'}</Text>
          </Text>
          <Text pl="4" color="#6B7280">...</Text>
          <Text>{'}'}</Text>
          <Box
            position="absolute"
            right="8px"
            top="50%"
            transform="translateY(-50%)"
            bg="white"
            borderRadius="6px"
            border="1px solid"
            borderColor="#E5E7EB"
            px="2"
            py="1"
            shadow="sm"
          >
            <Text fontSize="xs" color="#374151" fontWeight="medium">
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
      borderColor="#E5E7EB"
      mb="3"
      h="120px"
    >
      <Box bg="#FAFAFA" p="3" fontFamily="mono" fontSize="xs" color="#374151">
        <Text>
          <Text as="span" color="#6B7280">const </Text>
          <Text as="span">res = fetch("/api");</Text>
        </Text>
        <Text>
          <Text as="span" color="#6B7280">const </Text>
          <Text as="span">data = res.json();</Text>
        </Text>
        <Text>
          <Text as="span" color="#6B7280">console</Text>
          <Text as="span">.log(</Text>
          <Text as="span" color="#3D7A28" style={{ textDecoration: 'underline' }}>data.name</Text>
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
      bg="white"
      borderRadius="16px"
      border="1px solid"
      borderColor="#E5E7EB"
      p="4"
      cursor="pointer"
      _hover={{ shadow: 'md', borderColor: '#D1FAE5', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      onClick={() =>
        navigate({ to: '/conversations/new', search: { q: prompt } } as never)
      }
    >
      <CodeSnippetPreview type={type} />
      <Text fontWeight="bold" color="#1A1A1A" fontSize="md" mb="1">
        {title}
      </Text>
      <Text fontSize="sm" color="#6B7280" lineHeight="1.5">
        {description}
      </Text>
    </Box>
  );
}

function VersionDropdown() {
  return (
    <Button
      variant="outline"
      borderRadius="full"
      borderColor="#E5E7EB"
      bg="white"
      color="#1A1A1A"
      _hover={{ bg: '#F9FAFB', borderColor: '#D1D5DB' }}
      size="sm"
      gap="1.5"
      px="4"
    >
      Orin v5.0
      <ChevronDown size={14} />
    </Button>
  );
}

function ChatInput() {
  const [inputValue, setInputValue] = useState('');
  const [deepLearning, setDeepLearning] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    navigate({
      to: '/conversations/new',
      search: { q: inputValue.trim() },
    } as never);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box
      bg="white"
      borderRadius="16px"
      border="2px solid"
      borderColor="#6BBF45"
      p="3"
      shadow="0 4px 24px rgba(61,122,40,0.08)"
    >
      <HStack gap="2" mb="3">
        <Box
          color="brand.500"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"
              fill="currentColor"
            />
          </svg>
        </Box>
        <Input
          flex="1"
          border="none"
          outline="none"
          _focus={{ boxShadow: 'none', outline: 'none' }}
          _focusVisible={{ boxShadow: 'none', outline: 'none' }}
          placeholder="Ask AI anything or make something..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          fontSize="sm"
          color="#1A1A1A"
          _placeholder={{ color: '#9CA3AF' }}
          bg="transparent"
        />
      </HStack>

      <HStack justify="space-between" align="center">
        <HStack gap="2">
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            multiple
          />
          <Button
            variant="ghost"
            size="sm"
            color="#6B7280"
            _hover={{ bg: '#F5F5F5', color: '#374151' }}
            borderRadius="8px"
            gap="1.5"
            fontSize="xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={14} />
            Attach File
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="#6B7280"
            _hover={{ bg: '#F5F5F5', color: '#374151' }}
            borderRadius="8px"
            gap="1.5"
            fontSize="xs"
          >
            <Wrench size={14} />
            Tools
          </Button>

          <HStack gap="2" align="center">
            <Box
              as="button"
              role="switch"
              aria-checked={deepLearning}
              onClick={() => setDeepLearning(!deepLearning)}
              w="36px"
              h="20px"
              borderRadius="full"
              bg={deepLearning ? '#3D7A28' : '#D1D5DB'}
              position="relative"
              transition="background 0.2s"
              cursor="pointer"
            >
              <Box
                position="absolute"
                top="2px"
                left={deepLearning ? '18px' : '2px'}
                w="16px"
                h="16px"
                borderRadius="full"
                bg="white"
                shadow="sm"
                transition="left 0.2s"
              />
            </Box>
            <Text fontSize="xs" color="#6B7280">
              Deep Learning
            </Text>
            <Box
              px="1.5"
              py="0.5"
              bg="#3D7A28"
              borderRadius="4px"
              fontSize="10px"
              fontWeight="bold"
              color="white"
            >
              Pro
            </Box>
          </HStack>
        </HStack>

        <HStack gap="2">
          <IconButton
            aria-label="Voice input"
            variant="ghost"
            size="sm"
            color="#6B7280"
            _hover={{ bg: '#F5F5F5', color: '#374151' }}
            borderRadius="8px"
          >
            <Mic size={16} />
          </IconButton>
          <IconButton
            aria-label="Send message"
            size="sm"
            bg="#3D7A28"
            color="white"
            _hover={{ bg: '#2e5c1e' }}
            borderRadius="8px"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
          >
            <ArrowRight size={16} />
          </IconButton>
        </HStack>
      </HStack>
    </Box>
  );
}

function HomePage() {
  return (
    <Flex
      direction="column"
      minH="100vh"
      bg="#F0F0F0"
      p="6"
      gap="4"
    >
      <Flex justify="flex-start" mb="2">
        <VersionDropdown />
      </Flex>

      <Box
        bg="white"
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
            color="#1A1A1A"
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
        bg="white"
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

        <ChatInput />
      </Box>
    </Flex>
  );
}
