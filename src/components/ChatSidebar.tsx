import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
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

  // Start of current week (Monday)
  const weekStart = new Date(todayStart);
  const dayOfWeek = todayStart.getDay(); // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(todayStart.getDate() - daysToMonday);

  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(todayStart.getDate() - 30);

  const today: typeof conversations = [];
  const yesterday: typeof conversations = [];
  const thisWeek: typeof conversations = [];
  const last30Days: typeof conversations = [];
  const older: typeof conversations = [];

  for (const c of conversations) {
    const date = new Date(c.updatedAt);
    if (date >= todayStart) {
      today.push(c);
    } else if (date >= yesterdayStart) {
      yesterday.push(c);
    } else if (date >= weekStart) {
      thisWeek.push(c);
    } else if (date >= thirtyDaysAgo) {
      last30Days.push(c);
    } else {
      older.push(c);
    }
  }

  const groups: ConversationGroup[] = [];
  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'Earlier this week', items: thisWeek });
  if (last30Days.length > 0) groups.push({ label: 'Last 30 days', items: last30Days });
  if (older.length > 0) groups.push({ label: 'Older', items: older });

  return groups;
}

function ConversationGroupSection({
  group,
  activeId,
}: {
  group: ConversationGroup;
  activeId: string | undefined;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Box>
      <HStack
        px="3"
        py="1.5"
        cursor="pointer"
        onClick={() => setOpen(!open)}
        _hover={{ bg: 'bg.subtle' }}
        borderRadius="6px"
        gap="1.5"
      >
        {open ? (
          <ChevronDown size={14} color="var(--chakra-colors-text-muted)" />
        ) : (
          <ChevronRight size={14} color="var(--chakra-colors-text-muted)" />
        )}
        <Text fontSize="xs" fontWeight="semibold" color="text.muted" letterSpacing="0.02em">
          {group.label}
        </Text>
      </HStack>

      {open && (
        <VStack gap="0" align="stretch" pl="2">
          {group.items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <Link
                key={item.id}
                to="/conversations/$id"
                params={{ id: item.id }}
                aria-current={isActive ? 'page' : undefined}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <Box
                  px="3"
                  py="2"
                  borderRadius="6px"
                  bg={isActive ? 'brand.50' : 'transparent'}
                  _hover={{ bg: isActive ? 'brand.50' : 'bg.subtle' }}
                  _focusVisible={{
                    outline: '2px solid',
                    outlineColor: 'brand.500',
                    outlineOffset: '2px',
                    borderRadius: '6px',
                  }}
                  transition="background 0.1s"
                  borderLeft={isActive ? '2px solid' : '2px solid transparent'}
                  borderColor={isActive ? 'brand.500' : 'transparent'}
                >
                  <Text
                    fontSize="sm"
                    color={isActive ? 'brand.700' : 'text.secondary'}
                    fontWeight={isActive ? 'medium' : 'normal'}
                    truncate
                  >
                    {item.title}
                  </Text>
                </Box>
              </Link>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}

function ConversationListMounted({ activeId }: { activeId: string | undefined }) {
  const { data: conversations } = useLiveQuery((q) =>
    q.from({ c: conversationsCollection }),
  );

  const sorted = [...(conversations ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const groups = groupConversations(sorted);

  if (groups.length === 0) {
    return (
      <Text fontSize="sm" color="text.muted" textAlign="center" py="6" px="3">
        No conversations yet.
      </Text>
    );
  }

  return (
    <VStack gap="1" align="stretch">
      {groups.map((group) => (
        <ConversationGroupSection key={group.label} group={group} activeId={activeId} />
      ))}
    </VStack>
  );
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const conversationMatch = pathname.match(/^\/conversations\/([^/]+)$/);
  const activeConversationId =
    conversationMatch && conversationMatch[1] !== 'new'
      ? conversationMatch[1]
      : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) {
    return (
      <Flex
        direction="column"
        align="center"
        w="48px"
        minH="100vh"
        bg="bg.surface"
        borderRight="1px solid"
        borderColor="border.default"
        flexShrink={0}
        position="fixed"
        top={0}
        left="60px"
        bottom={0}
        zIndex={99}
        pt="4"
        transition="width 0.2s ease"
      >
        <IconButton
          aria-label="Open sidebar"
          variant="ghost"
          size="sm"
          color="text.muted"
          _hover={{ bg: 'bg.subtle', color: 'text.primary' }}
          onClick={onToggle}
        >
          <PanelLeft size={18} />
        </IconButton>
      </Flex>
    );
  }

  const isNewChatActive = pathname === '/conversations/new';

  return (
    <Flex
      direction="column"
      w="280px"
      minH="100vh"
      bg="bg.surface"
      borderRight="1px solid"
      borderColor="border.default"
      flexShrink={0}
      position="fixed"
      top={0}
      left="60px"
      bottom={0}
      zIndex={99}
      transition="width 0.2s ease"
    >
      <HStack px="4" py="4" justify="space-between" align="center">
        <Text fontSize="lg" fontWeight="bold" color="text.primary">
          All Chats
        </Text>
        <IconButton
          aria-label="Toggle sidebar"
          variant="ghost"
          size="sm"
          color="text.muted"
          _hover={{ bg: 'bg.subtle', color: 'text.primary' }}
          onClick={onToggle}
        >
          <PanelLeft size={18} />
        </IconButton>
      </HStack>

      <Box px="3" mb="3">
        <Button
          w="full"
          bg={isNewChatActive ? 'brand.600' : 'text.primary'}
          color="white"
          borderRadius="10px"
          _hover={{ bg: isNewChatActive ? 'brand.700' : 'gray.700' }}
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
        {mounted ? <ConversationListMounted activeId={activeConversationId} /> : null}
      </Box>
    </Flex>
  );
}
