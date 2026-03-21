import { createFileRoute, useNavigate, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Text,
} from '@chakra-ui/react';
import { PageContainer } from '@/components/PageContainer';
import MarkdownContent from '@/components/MarkdownRenderer';
import { isValidUUID } from '@/lib/uuid';

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

const getNotification = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    if (!isValidUUID(id)) throw notFound();
    const res = await fetch(
      `${process.env['APP_URL'] ?? 'http://localhost:3000'}/api/notifications/${id}`,
    );
    if (!res.ok) throw notFound();
    return res.json() as Promise<Notification>;
  });

export const Route = createFileRoute('/_protected/notifications/$id')({
  loader: ({ params }) => getNotification({ data: params.id }),
  component: NotificationDetailPage,
});

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

function sourceBadgeColor(source: 'llm' | 'cron' | 'system' | null): string {
  if (source === 'llm') return 'purple';
  if (source === 'cron') return 'green';
  if (source === 'system') return 'blue';
  return 'gray';
}

function NotificationDetailPage() {
  const loaderData = Route.useLoaderData() as Notification;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: notification = loaderData } = useQuery<Notification>({
    queryKey: ['notifications', loaderData.id],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/${loaderData.id}`);
      return res.json();
    },
    initialData: loaderData,
  });

  const patchMutation = useMutation({
    mutationFn: async (isRead: boolean) => {
      await fetch(`/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', notification.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/notifications/${notification.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      navigate({ to: '/notifications' });
    },
  });

  useEffect(() => {
    if (!notification.isRead) {
      patchMutation.mutate(true);
    }
  }, []);

  return (
    <PageContainer maxW="3xl">
      <Box
        asChild
        display="inline-flex"
        alignItems="center"
        gap="1"
        fontSize="sm"
        color="text.secondary"
        mb="4"
        _hover={{ color: 'text.primary' }}
        style={{ textDecoration: 'none' }}
      >
        <a href="/notifications">← Notifications</a>
      </Box>

      <Box
        bg="bg.surface"
        borderRadius="lg"
        border="1px solid"
        borderColor="border.default"
        overflow="hidden"
      >
        <Box px="6" py="5" borderBottomWidth="1px" borderColor="border.default">
          <Heading size="lg" color="text.primary" mb="2">
            {notification.title}
          </Heading>
          <HStack gap="3" flexWrap="wrap">
            <Text fontSize="sm" color="text.secondary">
              {relativeTime(notification.createdAt)}
            </Text>
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
            {!notification.isRead && (
              <Badge
                colorPalette="blue"
                variant="subtle"
                borderRadius="full"
                px="2"
                fontSize="xs"
              >
                Unread
              </Badge>
            )}
          </HStack>
        </Box>

        <Box px="6" py="5">
          <MarkdownContent content={notification.content} />
        </Box>

        <Box px="6" py="4" borderTopWidth="1px" borderColor="border.default" bg="gray.50">
          <Flex justify="space-between" align="center" gap="3" flexWrap="wrap">
            <HStack gap="2">
              <Button
                size="sm"
                variant="outline"
                colorPalette="gray"
                onClick={() => patchMutation.mutate(!notification.isRead)}
                loading={patchMutation.isPending}
              >
                {notification.isRead ? 'Mark as Unread' : 'Mark as Read'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                colorPalette="brand"
                onClick={() =>
                  navigate({
                    to: '/conversations/new',
                    search: { from_notification_id: notification.id } as never,
                  })
                }
              >
                Convert to Conversation
              </Button>
            </HStack>

            <Box>
              {confirmDelete ? (
                <HStack gap="2">
                  <Button
                    size="sm"
                    colorPalette="red"
                    onClick={() => deleteMutation.mutate()}
                    loading={deleteMutation.isPending}
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="gray"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </HStack>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  color="red.600"
                  _hover={{ bg: 'red.50' }}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Flex>
        </Box>
      </Box>

      {notification.sourceConversationId && (
        <Box mt="4">
          <Box
            asChild
            fontSize="sm"
            color="brand.600"
            _hover={{ textDecoration: 'underline' }}
          >
            <a href={`/conversations/${notification.sourceConversationId}`}>
              View source conversation →
            </a>
          </Box>
        </Box>
      )}
    </PageContainer>
  );
}
