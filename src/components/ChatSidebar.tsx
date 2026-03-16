import { Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { conversationsCollection } from '@/collections/conversations';
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text,
  VStack,
  Progress,
} from '@chakra-ui/react';
import { ChevronDown, ChevronRight, PanelLeft, Plus } from 'lucide-react';

type ConversationGroup = {
  label: string;
  items: Array<{ id: string; title: string; updatedAt: string }>;
};

function groupConversations(
  conversations: Array<{ id: string; title: string; updatedAt: string }>,
): ConversationGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);

  const today: typeof conversations = [];
  const yesterday: typeof conversations = [];
  const earlier: typeof conversations = [];

  for (const c of conversations) {
    const date = new Date(c.updatedAt);
    if (date >= todayStart) {
      today.push(c);
    } else if (date >= yesterdayStart) {
      yesterday.push(c);
    } else {
      earlier.push(c);
    }
  }

  const groups: ConversationGroup[] = [];
  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
  if (earlier.length > 0) groups.push({ label: 'Earlier this week', items: earlier });

  return groups;
}

function ConversationGroupSection({ group }: { group: ConversationGroup }) {
  const [open, setOpen] = useState(true);

  return (
    <Box>
      <HStack
        px="3"
        py="1.5"
        cursor="pointer"
        onClick={() => setOpen(!open)}
        _hover={{ bg: '#F5F5F5' }}
        borderRadius="6px"
        gap="1.5"
      >
        {open ? (
          <ChevronDown size={14} color="#6B7280" />
        ) : (
          <ChevronRight size={14} color="#6B7280" />
        )}
        <Text fontSize="xs" fontWeight="semibold" color="#6B7280" letterSpacing="0.02em">
          {group.label}
        </Text>
      </HStack>

      {open && (
        <VStack gap="0" align="stretch" pl="2">
          {group.items.map((item) => (
            <Link
              key={item.id}
              to="/conversations/$id"
              params={{ id: item.id }}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <Box
                px="3"
                py="2"
                borderRadius="6px"
                _hover={{ bg: '#F5F5F5' }}
                transition="background 0.1s"
              >
                <Text fontSize="sm" color="#374151" truncate>
                  {item.title}
                </Text>
              </Box>
            </Link>
          ))}
        </VStack>
      )}
    </Box>
  );
}

function ConversationListMounted() {
  const { data: conversations } = useLiveQuery((q) =>
    q.from({ c: conversationsCollection }),
  );

  const sorted = [...(conversations ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const groups = groupConversations(sorted);

  if (groups.length === 0) {
    return (
      <Text fontSize="sm" color="#9CA3AF" textAlign="center" py="6" px="3">
        No conversations yet.
      </Text>
    );
  }

  return (
    <VStack gap="1" align="stretch">
      {groups.map((group) => (
        <ConversationGroupSection key={group.label} group={group} />
      ))}
    </VStack>
  );
}

function UsageSummary() {
  const credits = 8;
  const maxCredits = 10;
  const percentage = (credits / maxCredits) * 100;

  return (
    <Box
      mx="3"
      mb="3"
      p="3"
      borderRadius="12px"
      border="1px solid"
      borderColor="#E5E7EB"
      bg="white"
    >
      <Text fontSize="sm" fontWeight="semibold" color="#1A1A1A" mb="2">
        Usage Summary
      </Text>
      <HStack justify="space-between" mb="1.5">
        <HStack gap="1" align="baseline">
          <Text fontSize="2xl" fontWeight="bold" color="#1A1A1A" lineHeight="1">
            {credits}
          </Text>
          <Text fontSize="xs" color="#6B7280">
            /{maxCredits}
          </Text>
        </HStack>
        <Text fontSize="xs" color="#6B7280">
          Credits Left
        </Text>
      </HStack>
      <Progress.Root value={percentage} size="sm" mb="2" colorPalette="green">
        <Progress.Track borderRadius="full" bg="#E5E7EB">
          <Progress.Range borderRadius="full" bg="brand.600" />
        </Progress.Track>
      </Progress.Root>
      <Text fontSize="xs" color="#6B7280" mb="2">
        Upgrade your plan to get more AI credits.
      </Text>
      <Button
        size="sm"
        w="full"
        bg="#3D7A28"
        color="white"
        borderRadius="8px"
        _hover={{ bg: '#2e5c1e' }}
        fontSize="xs"
        fontWeight="semibold"
      >
        Upgrade Now
      </Button>
    </Box>
  );
}

interface ChatSidebarProps {
  onToggle?: () => void;
}

export default function ChatSidebar({ onToggle }: ChatSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Flex
      direction="column"
      w="280px"
      minH="100vh"
      bg="white"
      borderRight="1px solid"
      borderColor="#E5E7EB"
      flexShrink={0}
      position="fixed"
      top={0}
      left="60px"
      bottom={0}
      zIndex={99}
    >
      <HStack px="4" py="4" justify="space-between" align="center">
        <Text fontSize="lg" fontWeight="bold" color="#1A1A1A">
          All Chats
        </Text>
        <IconButton
          aria-label="Toggle sidebar"
          variant="ghost"
          size="sm"
          color="#6B7280"
          _hover={{ bg: '#F5F5F5', color: '#1A1A1A' }}
          onClick={onToggle}
        >
          <PanelLeft size={18} />
        </IconButton>
      </HStack>

      <Box px="3" mb="3">
        <Button
          w="full"
          bg="#1A1A1A"
          color="white"
          borderRadius="10px"
          _hover={{ bg: '#2D2D2D' }}
          fontSize="sm"
          fontWeight="semibold"
          gap="1.5"
          onClick={() => navigate({ to: '/conversations/new' })}
        >
          <Plus size={16} />
          New Chat
        </Button>
      </Box>

      <Box flex="1" overflowY="auto" px="1">
        {mounted ? <ConversationListMounted /> : null}
      </Box>

      <UsageSummary />
    </Flex>
  );
}
