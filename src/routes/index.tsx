import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  MessageSquare,
  Briefcase,
  Mail,
  Clock,
  ArrowRight,
  Plus,
  BookOpen,
} from 'lucide-react';

export const Route = createFileRoute('/')({ component: Dashboard });

type Job = { id: string; status: string };
type Conversation = { id: string; isClosed: boolean };
type Cronjob = { id: string; isActive: boolean };
type Email = { id: string };
type KbFile = { id: string; categories: string[] };

function StatValue({ value, label }: { value: number; label: string }) {
  return (
    <VStack gap="0" align="center">
      <Text fontSize="2xl" fontWeight="bold" color="gray.900">{value}</Text>
      <Text fontSize="xs" color="gray.500">{label}</Text>
    </VStack>
  );
}

function SectionCard({
  icon,
  iconColorPalette,
  title,
  description,
  href,
  stats,
  action,
}: {
  icon: React.ReactNode;
  iconColorPalette: string;
  title: string;
  description: string;
  href: string;
  stats: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card.Root shadow="sm" _hover={{ shadow: 'md' }} transition="box-shadow 0.2s">
      <Card.Body gap="4" display="flex" flexDirection="column">
        <HStack justify="space-between" align="flex-start">
          <Box p="3" borderRadius="lg" bg={`${iconColorPalette}.50`} color={`${iconColorPalette}.600`}>
            {icon}
          </Box>
          {action}
        </HStack>

        <Box>
          <Heading size="md" color="gray.900">{title}</Heading>
          <Text fontSize="sm" color="gray.500" mt="1">{description}</Text>
        </Box>

        <HStack gap="6" py="2" borderTopWidth="1px" borderColor="gray.100">
          {stats}
        </HStack>

        <Box asChild>
          <Link to={href} style={{ textDecoration: 'none' }}>
            <HStack gap="1.5" color="gray.700" _hover={{ color: 'gray.900' }} fontSize="sm" fontWeight="medium">
              <Text>Go to {title}</Text>
              <ArrowRight size={14} />
            </HStack>
          </Link>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}

function AiCard() {
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations');
      return res.json();
    },
  });

  const total = conversations.length;
  const open = conversations.filter((c) => !c.isClosed).length;

  return (
    <SectionCard
      icon={<MessageSquare size={22} />}
      iconColorPalette="cyan"
      title="AI"
      description="Persistent chat conversations powered by GPT-5.2 with tool-calling."
      href="/conversations"
      action={
        <Button asChild size="xs" colorPalette="cyan">
          <Link to="/conversations">
            <Plus size={12} /> New Chat
          </Link>
        </Button>
      }
      stats={
        isLoading ? (
          <Spinner size="sm" color="gray.400" />
        ) : (
          <>
            <StatValue value={total} label="Total" />
            <StatValue value={open} label="Open" />
          </>
        )
      }
    />
  );
}

function JobsCard() {
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', 'all', ''],
    queryFn: async () => {
      const res = await fetch('/api/jobs');
      return res.json();
    },
  });

  const newJobs = jobs.filter((j) => j.status === 'new').length;
  const applied = jobs.filter((j) => j.status === 'applied').length;
  const interviews = jobs.filter((j) => j.status === 'scheduled_for_interview').length;
  const offers = jobs.filter((j) => j.status === 'offer_received').length;

  return (
    <SectionCard
      icon={<Briefcase size={22} />}
      iconColorPalette="purple"
      title="Job Search"
      description="Track applications, generate AI-tailored resumes, and manage your pipeline."
      href="/jobs"
      action={
        <Button asChild size="xs" colorPalette="purple">
          <Link to="/jobs/new">
            <Plus size={12} /> Add Job
          </Link>
        </Button>
      }
      stats={
        isLoading ? (
          <Spinner size="sm" color="gray.400" />
        ) : (
          <>
            <StatValue value={jobs.length} label="Total" />
            <StatValue value={newJobs} label="New" />
            <StatValue value={applied} label="Applied" />
            {interviews > 0 && <StatValue value={interviews} label="Interviews" />}
            {offers > 0 && <StatValue value={offers} label="Offers" />}
          </>
        )
      }
    />
  );
}

function MailCard() {
  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ['mail-all'],
    queryFn: async () => {
      const res = await fetch('/api/mail/emails');
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <SectionCard
      icon={<Mail size={22} />}
      iconColorPalette="orange"
      title="Mail"
      description="Emails ingested and linked to job applications automatically."
      href="/mail"
      stats={
        isLoading ? (
          <Spinner size="sm" color="gray.400" />
        ) : (
          <StatValue value={emails.length} label="Emails" />
        )
      }
    />
  );
}

function AutomationCard() {
  const { data: cronjobs = [], isLoading } = useQuery<Cronjob[]>({
    queryKey: ['cronjobs'],
    queryFn: async () => {
      const res = await fetch('/api/cronjobs');
      return res.json();
    },
  });

  const active = cronjobs.filter((j) => j.isActive).length;

  return (
    <SectionCard
      icon={<Clock size={22} />}
      iconColorPalette="green"
      title="Automation"
      description="Scheduled AI tasks that run on a cron schedule and log results."
      href="/cronjobs"
      action={
        <Button asChild size="xs" colorPalette="green">
          <Link to="/cronjobs/new">
            <Plus size={12} /> New Job
          </Link>
        </Button>
      }
      stats={
        isLoading ? (
          <Spinner size="sm" color="gray.400" />
        ) : (
          <>
            <StatValue value={cronjobs.length} label="Total" />
            <StatValue value={active} label="Active" />
          </>
        )
      }
    />
  );
}

function KnowledgeBaseCard() {
  const { data: files = [], isLoading } = useQuery<KbFile[]>({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge-base');
      return res.json();
    },
  });

  const uniqueCategories = [
    ...new Set(files.flatMap((f) => f.categories ?? [])),
  ].length;

  return (
    <SectionCard
      icon={<BookOpen size={22} />}
      iconColorPalette="violet"
      title="Knowledge Base"
      description="Documents uploaded for AI context. Searched automatically before every response."
      href="/knowledge-base"
      action={
        <Button asChild size="xs" colorPalette="purple" variant="subtle">
          <Link to="/knowledge-base">
            <Plus size={12} /> Upload
          </Link>
        </Button>
      }
      stats={
        isLoading ? (
          <Spinner size="sm" color="gray.400" />
        ) : (
          <>
            <StatValue value={files.length} label="Documents" />
            <StatValue value={uniqueCategories} label="Categories" />
          </>
        )
      }
    />
  );
}

function Dashboard() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="5xl" py="10" px="6">
        <Box mb="8">
          <Heading size="2xl" color="gray.900">Dashboard</Heading>
          <Text color="gray.500" mt="1">Overview of your AI assistant workspace.</Text>
        </Box>

        <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap="6">
          <AiCard />
          <JobsCard />
          <MailCard />
          <AutomationCard />
          <KnowledgeBaseCard />
        </Grid>
      </Container>
    </Box>
  );
}
