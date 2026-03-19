import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Bell } from 'lucide-react';

export const Route = createFileRoute('/_protected/notifications/')({
  component: NotificationsPage,
});

type Notification = {
  id: string;
  title: string;
  content: string;
  source: 'llm' | 'cron' | 'system' | null;
  sourceConversationId: string | null;
  isRead: boolean;
  userId: string;
  createdAt: string;
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .trim();
}

function sourceBadgeColor(source: 'llm' | 'cron' | 'system' | null): string {
  if (source === 'llm') return 'purple';
  if (source === 'cron') return 'green';
  if (source === 'system') return 'blue';
  return 'gray';
}

function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      return res.json();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Container maxW="4xl" py="6" px="6">
      <Flex justify="space-between" align="center" mb="6">
        <HStack gap="3">
          <Heading size="xl">Notifications</Heading>
          {unreadCount > 0 && (
            <Badge
              colorPalette="red"
              variant="solid"
              borderRadius="full"
              px="2"
              py="0.5"
              fontSize="xs"
              fontWeight="bold"
            >
              {unreadCount}
            </Badge>
          )}
        </HStack>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            colorPalette="gray"
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
          >
            Mark All Read
          </Button>
        )}
      </Flex>

      {isLoading ? (
        <VStack gap="3" align="stretch">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="72px" borderRadius="lg" />
          ))}
        </VStack>
      ) : notifications.length === 0 ? (
        <VStack gap={4} py={16} alignItems="center" textAlign="center">
          <Bell size={40} color="var(--chakra-colors-text-muted)" />
          <Heading size="md" color="text.primary">No notifications yet</Heading>
          <Text color="text.secondary" fontSize="sm">
            You'll see notifications from the AI assistant here.
          </Text>
        </VStack>
      ) : (
        <VStack gap="3" align="stretch">
          {notifications.map((notification) => (
            <Box
              key={notification.id}
              p="4"
              borderRadius="lg"
              border="1px solid"
              borderColor={notification.isRead ? 'border.default' : 'brand.200'}
              bg={notification.isRead ? 'bg.surface' : 'bg.surface'}
              cursor="pointer"
              _hover={{ shadow: 'sm', borderColor: 'brand.300' }}
              transition="all 0.15s ease"
              onClick={() =>
                navigate({
                  to: '/notifications/$id',
                  params: { id: notification.id },
                })
              }
            >
              <HStack align="flex-start" gap="3">
                {!notification.isRead && (
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="brand.500"
                    flexShrink={0}
                    mt="1.5"
                  />
                )}
                {notification.isRead && <Box w="8px" flexShrink={0} />}
                <Box flex="1" minW="0">
                  <HStack justify="space-between" align="flex-start" gap="2">
                    <Text
                      fontWeight={notification.isRead ? 'medium' : 'bold'}
                      color="text.primary"
                      fontSize="sm"
                      truncate
                      flex="1"
                    >
                      {notification.title}
                    </Text>
                    <HStack gap="2" flexShrink={0}>
                      {notification.source && (
                        <Badge
                          colorPalette={sourceBadgeColor(notification.source)}
                          variant="subtle"
                          borderRadius="full"
                          px="2"
                          fontSize="xs"
                          textTransform="capitalize"
                        >
                          {notification.source}
                        </Badge>
                      )}
                      <Text fontSize="xs" color="text.secondary" whiteSpace="nowrap">
                        {relativeTime(notification.createdAt)}
                      </Text>
                    </HStack>
                  </HStack>
                  <Text
                    fontSize="xs"
                    color="text.secondary"
                    mt="1"
                    truncate
                    lineClamp={2}
                  >
                    {stripMarkdown(notification.content)}
                  </Text>
                </Box>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Container>
  );
}
