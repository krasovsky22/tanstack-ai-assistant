import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { useChat, fetchHttpStream } from '@tanstack/ai-react';
import { useState, useEffect } from 'react';
import { Globe, Search, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/jobs/extract-from-url')({
  component: ReportsPage,
});

type ScrapedJob = {
  title: string;
  company: string;
  link: string | null;
  description: string;
};

function ScrapedJobCard({ job }: { job: ScrapedJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card.Root overflow="hidden">
      <Card.Body p="4">
        <Text fontWeight="semibold" color="text.primary">
          {job.title || 'Untitled Position'}
        </Text>
        {job.company && (
          <Text fontSize="sm" color="text.secondary" mt="0.5">
            {job.company}
          </Text>
        )}
        {job.link && (
          <Box
            as="a"
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="xs"
            color="blue.600"
            mt="1"
            display="inline-block"
            _hover={{ textDecoration: 'underline' }}
          >
            View posting ↗
          </Box>
        )}
      </Card.Body>
      <Box borderTopWidth="1px">
        <Button
          type="button"
          variant="ghost"
          width="full"
          onClick={() => setExpanded((v) => !v)}
          px="4"
          py="2"
          height="auto"
          fontSize="xs"
          color="text.secondary"
          _hover={{ bg: 'bg.page' }}
          justifyContent="space-between"
        >
          <Text>Job Description</Text>
          <Icon as={expanded ? ChevronUp : ChevronDown} boxSize="3.5" />
        </Button>
        {expanded && (
          <Box px="4" pb="4" maxH="96" overflowY="auto">
            <Box
              fontSize="sm"
              color="text.primary"
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </Box>
        )}
      </Box>
    </Card.Root>
  );
}

function ReportsPage() {
  const [urlInput, setUrlInput] = useState('');
  const [extractedJobs, setExtractedJobs] = useState<ScrapedJob[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [processedAll, setProcessedAll] = useState(false);

  const { messages, sendMessage, clear, status, error } = useChat({
    connection: fetchHttpStream('/api/reports/scrape-jobs'),
  });

  useEffect(() => {
    if (status !== 'ready' || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;

    const parts = (lastMsg.parts ?? []) as Array<{
      type: string;
      content?: string;
    }>;
    const text = parts
      .filter((p) => p.type === 'text')
      .map((p) => p.content ?? '')
      .join('');

    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const jobs = JSON.parse(match[0]);
        setExtractedJobs(Array.isArray(jobs) ? jobs : []);
        setParseError(null);
      } else {
        setParseError(
          'Could not find job data in the response. The page may not contain job listings or access was blocked.',
        );
      }
    } catch {
      setParseError('Failed to parse job data from the response.');
    }
  }, [status, messages]);

  const handleGetJobs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    clear();
    setExtractedJobs(null);
    setParseError(null);
    setSavedCount(0);
    setProcessingCount(0);
    setProcessedAll(false);
    await sendMessage(urlInput);
  };

  const handleProcessAll = async () => {
    if (!extractedJobs?.length) return;
    setIsSaving(true);
    setSavedCount(0);

    const hostname = (() => {
      try {
        return new URL(urlInput).hostname;
      } catch {
        return 'scraped';
      }
    })();

    const createdIds: string[] = [];
    for (const job of extractedJobs) {
      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: job.title || 'Unknown',
            company: job.company || 'Unknown',
            description: job.description,
            source: hostname,
            status: 'new',
            link: job.link ?? null,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          createdIds.push(created.id);
        }
        setSavedCount((n) => n + 1);
      } catch {
        // continue with remaining jobs
      }
    }

    setIsSaving(false);
    setProcessingCount(createdIds.length);

    for (const id of createdIds) {
      try {
        await fetch(`/api/jobs/process?id=${id}`, { method: 'POST' });
      } catch {
        // continue with remaining
      }
      setProcessingCount((n) => Math.max(0, n - 1));
    }

    setProcessedAll(true);
  };

  const isStreaming = status === 'streaming' || status === 'submitted';
  const isProcessing = isSaving || processingCount > 0;

  return (
    <PageContainer maxW="3xl">
      <PageHeader
        title="Job Scraper"
        subtitle="Enter a job board URL to extract all listings using AI and playwright"
      />

      <Box as="form" onSubmit={handleGetJobs}>
        <HStack gap="3" mb="8">
          <InputGroup flex="1" startElement={<Icon as={Globe} boxSize="4" color="text.muted" />}>
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://jobs.example.com/..."
              required
              disabled={isStreaming}
            />
          </InputGroup>
          <Button
            type="submit"
            disabled={isStreaming || !urlInput.trim()}
            colorPalette="brand"
          >
            <Icon as={Search} boxSize="4" />
            {isStreaming ? 'Extracting...' : 'Get Jobs'}
          </Button>
        </HStack>
      </Box>

      {isStreaming && (
        <HStack
          mb="6"
          p="4"
          bg="blue.50"
          borderWidth="1px"
          borderColor="blue.200"
          borderRadius="lg"
          gap="3"
        >
          <Box w="2" h="2" borderRadius="full" bg="blue.500" animation="pulse" flexShrink={0} />
          <Text fontSize="sm" color="blue.700">
            Navigating to the page and extracting job listings with playwright…
          </Text>
        </HStack>
      )}

      {error && (
        <Text fontSize="sm" color="red.600" mb="4">
          Error: {error.message}
        </Text>
      )}
      {parseError && (
        <Text fontSize="sm" color="orange.600" mb="4">
          {parseError}
        </Text>
      )}

      {extractedJobs !== null && (
        <Box>
          <Flex alignItems="center" justifyContent="space-between" mb="4">
            <Text fontSize="sm" color="text.secondary">
              {extractedJobs.length} job{extractedJobs.length !== 1 ? 's' : ''} found
            </Text>
            {extractedJobs.length > 0 && !processedAll && (
              <Button
                onClick={handleProcessAll}
                disabled={isProcessing}
                colorPalette="teal"
                loading={isProcessing}
              >
                {!isProcessing && <Icon as={Zap} boxSize="4" />}
                {isSaving
                  ? `Saving… (${savedCount}/${extractedJobs.length})`
                  : processingCount > 0
                    ? `Processing… (${processingCount} left)`
                    : 'Process All'}
              </Button>
            )}
          </Flex>

          {processedAll && (
            <Text fontSize="sm" color="teal.600" mb="4">
              All jobs saved and processed. Check the{' '}
              <Box asChild fontWeight="medium" textDecoration="underline">
                <Link to="/jobs">Job Search</Link>
              </Box>{' '}
              page.
            </Text>
          )}

          <Stack gap="3">
            {extractedJobs.map((job, i) => (
              <ScrapedJobCard key={i} job={job} />
            ))}
          </Stack>
        </Box>
      )}
    </PageContainer>
  );
}
