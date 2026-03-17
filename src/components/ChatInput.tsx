import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Textarea,
} from '@chakra-ui/react';
import { ArrowUp, Paperclip, Sparkles, Wrench } from 'lucide-react';
import { ToolsModal } from './ToolsModal';

interface ChatInputProps {
  onSubmit: (value: string) => void;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
  placeholder?: string;
  fillValue?: string;
  onFillConsumed?: () => void;
}

export function ChatInput({
  onSubmit,
  onFileChange,
  isLoading = false,
  placeholder = 'Ask AI anything or make something...',
  fillValue,
  onFillConsumed,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (fillValue !== undefined && fillValue !== '') {
      setInputValue(fillValue);
      onFillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [fillValue, onFillConsumed]);

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
      bg="bg.surface"
      borderRadius="16px"
      border="1px solid"
      borderColor="border.default"
      p="3"
      _focusWithin={{
        border: '2px solid',
        borderColor: 'brand.600',
        shadow: '0 4px 24px rgba(61,122,40,0.08)',
      }}
    >
      <HStack gap="2" mb="3">
        <Box
          color="brand.500"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Sparkles size={18} aria-hidden="true" />
        </Box>
        <Textarea
          ref={textareaRef}
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
          resize="none"
          minH="40px"
          maxH="200px"
          rows={1}
          overflowY="auto"
        />
      </HStack>

      <HStack justify="space-between" align="center">
        <HStack gap="2">
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            multiple
            accept="image/*,.txt,.csv,.md,text/plain,text/csv,text/markdown"
            onChange={onFileChange}
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
            onClick={() => setToolsOpen(true)}
            disabled={isLoading}
          >
            <Wrench size={14} />
            Tools
          </Button>
          <ToolsModal open={toolsOpen} onClose={() => setToolsOpen(false)} />
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
