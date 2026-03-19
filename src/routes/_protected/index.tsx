import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Heading,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { ChatInput } from '@/components/ChatInput';
import { MessageSquare, List, Briefcase, Clock, Settings } from 'lucide-react';

export const Route = createFileRoute('/_protected/')({ component: HomePage });

type Conversation = {
  id: string;
  title: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

type Job = {
  id: string;
  title: string;
  company: string;
  status: string;
};

type Cronjob = {
  id: string;
  name: string;
  cronExpression: string;
  isActive: boolean;
  lastRunAt: string | null;
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

function sourceBadgeColor(source: string | null): string {
  if (source === 'telegram') return 'blue';
  if (source === 'cron') return 'green';
  return 'gray';
}

const JOB_STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  processed: 'yellow',
  resume_generated: 'purple',
  applied: 'green',
  answered: 'violet',
  scheduled_for_interview: 'orange',
  offer_received: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  'generated-from-email': 'orange',
};

const JOB_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  processed: 'Processed',
  resume_generated: 'Resume Generated',
  applied: 'Applied',
  answered: 'Answered',
  scheduled_for_interview: 'Interview Scheduled',
  offer_received: 'Offer Received',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  'generated-from-email': 'From Email',
};

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

interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onClick: () => void;
}

function QuickActionCard({ icon, label, subtitle, onClick }: QuickActionCardProps) {
  return (
    <Box
      bg="bg.surface"
      borderRadius="12px"
      border="1px solid"
      borderColor="border.default"
      p="4"
      cursor="pointer"
      _hover={{ shadow: 'md', borderColor: 'brand.300' }}
      transition="all 0.2s"
      onClick={onClick}
    >
      <VStack align="start" gap="2">
        <Box color="brand.600">{icon}</Box>
        <Box>
          <Text fontWeight="bold" color="text.primary" fontSize="sm">
            {label}
          </Text>
          <Text fontSize="xs" color="text.secondary">
            {subtitle}
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}

function RecentConversationsPanel() {
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations');
      return res.json();
    },
    staleTime: 30_000,
  });

  const cardStyle = {
    bg: 'bg.surface' as const,
    borderRadius: '16px',
    border: '1px solid',
    borderColor: 'border.default' as const,
    p: '6',
  };

  return (
    <Box {...cardStyle}>
      <HStack justify="space-between" mb="4">
        <Text fontWeight="bold" color="text.primary">
          Recent Conversations
        </Text>
        <Button asChild variant="ghost" size="sm">
          <Link to="/conversations">View All</Link>
        </Button>
      </HStack>

      {isLoading ? (
        <VStack gap="2" align="stretch">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="52px" borderRadius="md" />
          ))}
        </VStack>
      ) : !conversations || conversations.length === 0 ? (
        <VStack gap="2" py="8" alignItems="center" textAlign="center">
          <Text color="text.secondary" fontSize="sm">
            No conversations yet
          </Text>
          <Box asChild fontSize="sm" color="brand.600" _hover={{ textDecoration: 'underline' }}>
            <Link to="/conversations/new">Start one</Link>
          </Box>
        </VStack>
      ) : (
        <VStack gap="2" align="stretch">
          {[...conversations]
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            )
            .slice(0, 5)
            .map((c) => (
              <Box
                key={c.id}
                asChild
                display="block"
                p="3"
                borderRadius="md"
                border="1px solid"
                borderColor="border.default"
                _hover={{ bg: 'bg.subtle' }}
                transition="all 0.15s ease"
                style={{ textDecoration: 'none' }}
              >
                <Link to="/conversations/$id" params={{ id: c.id }}>
                  <HStack justify="space-between" gap="2">
                    <Text
                      fontWeight="medium"
                      color="text.primary"
                      fontSize="sm"
                      truncate
                      flex="1"
                    >
                      {c.title}
                    </Text>
                    <HStack gap="2" flexShrink="0">
                      {c.source && (
                        <Badge
                          colorPalette={sourceBadgeColor(c.source)}
                          variant="subtle"
                          borderRadius="full"
                          px="2"
                          fontSize="xs"
                          textTransform="capitalize"
                        >
                          {c.source}
                        </Badge>
                      )}
                      <Text fontSize="xs" color="text.secondary" whiteSpace="nowrap">
                        {relativeTime(c.updatedAt)}
                      </Text>
                    </HStack>
                  </HStack>
                </Link>
              </Box>
            ))}
        </VStack>
      )}
    </Box>
  );
}

function JobsOverviewPanel() {
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', 'all', ''],
    queryFn: async () => {
      const res = await fetch('/api/jobs');
      return res.json();
    },
    staleTime: 30_000,
  });

  const cardStyle = {
    bg: 'bg.surface' as const,
    borderRadius: '16px',
    border: '1px solid',
    borderColor: 'border.default' as const,
    p: '6',
  };

  return (
    <Box {...cardStyle}>
      <HStack justify="space-between" mb="4">
        <Text fontWeight="bold" color="text.primary">
          Jobs
        </Text>
        <Button asChild variant="ghost" size="sm">
          <Link to="/jobs">View All</Link>
        </Button>
      </HStack>

      {isLoading ? (
        <VStack gap="2" align="stretch">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="52px" borderRadius="md" />
          ))}
        </VStack>
      ) : !jobs || jobs.length === 0 ? (
        <VStack gap="2" py="8" alignItems="center" textAlign="center">
          <Text color="text.secondary" fontSize="sm">
            No jobs tracked yet
          </Text>
          <Box asChild fontSize="sm" color="brand.600" _hover={{ textDecoration: 'underline' }}>
            <Link to="/jobs">Add job</Link>
          </Box>
        </VStack>
      ) : (
        <VStack gap="2" align="stretch">
          {jobs.slice(0, 4).map((job) => (
            <Box
              key={job.id}
              p="3"
              borderRadius="md"
              border="1px solid"
              borderColor="border.default"
            >
              <HStack justify="space-between" gap="2">
                <Box flex="1" minW="0">
                  <Text
                    fontWeight="medium"
                    color="text.primary"
                    fontSize="sm"
                    truncate
                  >
                    {job.title}
                  </Text>
                  {job.company && (
                    <Text fontSize="xs" color="text.secondary" truncate>
                      {job.company}
                    </Text>
                  )}
                </Box>
                <Badge
                  colorPalette={JOB_STATUS_COLORS[job.status] ?? 'gray'}
                  variant="subtle"
                  borderRadius="full"
                  px="2"
                  fontSize="xs"
                  flexShrink="0"
                >
                  {JOB_STATUS_LABELS[job.status] ?? job.status}
                </Badge>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

function AutomationsPanel() {
  const { data: cronjobs, isLoading } = useQuery<Cronjob[]>({
    queryKey: ['cronjobs'],
    queryFn: async () => {
      const res = await fetch('/api/cronjobs');
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <Box
      bg="bg.surface"
      borderRadius="16px"
      border="1px solid"
      borderColor="border.default"
      p="6"
    >
      <HStack justify="space-between" mb="4">
        <Text fontWeight="bold" color="text.primary">
          Automations
        </Text>
        <Button asChild variant="ghost" size="sm">
          <Link to="/cronjobs">View All</Link>
        </Button>
      </HStack>

      {isLoading ? (
        <VStack gap="2" align="stretch">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="44px" borderRadius="md" />
          ))}
        </VStack>
      ) : !cronjobs || cronjobs.length === 0 ? (
        <VStack gap="2" py="8" alignItems="center" textAlign="center">
          <Text color="text.secondary" fontSize="sm">
            No automations configured
          </Text>
          <Box asChild fontSize="sm" color="brand.600" _hover={{ textDecoration: 'underline' }}>
            <Link to="/cronjobs">Create one</Link>
          </Box>
        </VStack>
      ) : (
        <VStack gap="2" align="stretch">
          {cronjobs.slice(0, 3).map((job) => (
            <Box
              key={job.id}
              p="3"
              borderRadius="md"
              border="1px solid"
              borderColor="border.default"
            >
              <HStack justify="space-between" gap="3">
                <Box flex="1" minW="0">
                  <Text fontWeight="medium" color="text.primary" fontSize="sm" truncate>
                    {job.name}
                  </Text>
                  <Text fontSize="xs" color="text.secondary" fontFamily="mono">
                    {job.cronExpression}
                  </Text>
                </Box>
                <HStack gap="2" flexShrink="0">
                  <Badge
                    colorPalette={job.isActive ? 'green' : 'gray'}
                    variant="subtle"
                    borderRadius="full"
                    px="2"
                    fontSize="xs"
                  >
                    {job.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {job.lastRunAt && (
                    <Text fontSize="xs" color="text.secondary" whiteSpace="nowrap">
                      {relativeTime(job.lastRunAt)}
                    </Text>
                  )}
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

function HomePage() {
  const navigate = useNavigate();

  return (
    <Flex direction="column" minH="100vh" bg="bg.page" p="6" gap="4">
      {/* Zone 1: Chat Input Card */}
      <Box
        bg="bg.surface"
        borderRadius="16px"
        border="1px solid"
        borderColor="border.default"
        p="6"
      >
        <Heading size="md" color="text.primary" mb="4">
          What can I help with today?
        </Heading>
        <HomePageChatInput />
      </Box>

      {/* Zone 2: Quick Actions Row */}
      <Grid templateColumns="repeat(5, 1fr)" gap="3">
        <QuickActionCard
          icon={<MessageSquare size={32} />}
          label="New Chat"
          subtitle="Start a conversation"
          onClick={() => navigate({ to: '/conversations/new' } as never)}
        />
        <QuickActionCard
          icon={<List size={32} />}
          label="Conversations"
          subtitle="View history"
          onClick={() => navigate({ to: '/conversations' } as never)}
        />
        <QuickActionCard
          icon={<Briefcase size={32} />}
          label="Jobs"
          subtitle="Track applications"
          onClick={() => navigate({ to: '/jobs' } as never)}
        />
        <QuickActionCard
          icon={<Clock size={32} />}
          label="Automations"
          subtitle="Schedule AI tasks"
          onClick={() => navigate({ to: '/cronjobs' } as never)}
        />
        <QuickActionCard
          icon={<Settings size={32} />}
          label="Settings"
          subtitle="Configure account"
          onClick={() => navigate({ to: '/settings' } as never)}
        />
      </Grid>

      {/* Zone 3: Activity Dashboard */}
      <Grid templateColumns="repeat(2, 1fr)" gap="4">
        <RecentConversationsPanel />
        <JobsOverviewPanel />
      </Grid>

      <AutomationsPanel />
    </Flex>
  );
}
