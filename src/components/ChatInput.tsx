import { useRef, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
} from '@chakra-ui/react';
import { ArrowUp, Paperclip, Wrench } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Ask AI anything or make something...',
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return;
    onSubmit(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = inputValue.trim().length > 0 && !isLoading;

  return (
    <Box
      bg="white"
      borderRadius="16px"
      border="2px solid"
      borderColor="brand.600"
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
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          fontSize="sm"
          color="text.primary"
          _placeholder={{ color: 'text.subtle' }}
          bg="transparent"
          disabled={isLoading}
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
            color="text.muted"
            _hover={{ bg: 'bg.page', color: 'text.secondary' }}
            borderRadius="8px"
            gap="1.5"
            fontSize="xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip size={14} />
            Attach File
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="text.muted"
            _hover={{ bg: 'bg.page', color: 'text.secondary' }}
            borderRadius="8px"
            gap="1.5"
            fontSize="xs"
            disabled={isLoading}
          >
            <Wrench size={14} />
            Tools
          </Button>
        </HStack>

        <IconButton
          aria-label="Send message"
          size="sm"
          bg={canSend ? 'brand.600' : 'gray.200'}
          color={canSend ? 'white' : 'gray.400'}
          _hover={canSend ? { bg: 'brand.700' } : {}}
          borderRadius="8px"
          onClick={handleSubmit}
          disabled={!canSend}
          loading={isLoading}
        >
          <ArrowUp size={16} />
        </IconButton>
      </HStack>
    </Box>
  );
}
