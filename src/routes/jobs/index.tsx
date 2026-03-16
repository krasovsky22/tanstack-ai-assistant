import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, Pencil, Zap, X, FileText, Mail } from 'lucide-react';
import { JOB_STATUSES } from '@/lib/job-constants';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  IconButton,
  Input,
  NativeSelect,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';

export const Route = createFileRoute('/jobs/')({
  component: JobsDashboard,
});

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  source: string;
  link: string | null;
  status: string;
  notes: string | null;
  matchScore: number | null;
  resumePath: string | null;
  resumePdfPath: string | null;
  coverLetterPath: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLOR_PALETTES: Record<string, string> = {
  new: 'gray',
  processed: 'teal',
  resume_generated: 'purple',
  applied: 'blue',
  answered: 'violet',
  scheduled_for_interview: 'orange',
  offer_received: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  'generated-from-email': 'orange',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      colorPalette={STATUS_COLOR_PALETTES[status] ?? 'gray'}
      variant="subtle"
      borderRadius="full"
      px="2.5"
      py="1"
      fontSize="xs"
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function PdfModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex="50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="blackAlpha.600"
      onClick={onClose}
    >
      <Box
        position="relative"
        bg="white"
        borderRadius="lg"
        shadow="2xl"
        display="flex"
        flexDir="column"
        style={{ width: '85vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Flex px="4" py="3" borderBottomWidth="1px" align="center" justify="space-between" flexShrink="0">
          <Text fontWeight="semibold" color="gray.800" truncate>{title} — Resume</Text>
          <HStack gap="3">
            <Box asChild fontSize="xs" color="indigo.600" _hover={{ textDecoration: 'underline' }}>
              <a href={url} download>Download PDF</a>
            </Box>
            <IconButton
              aria-label="Close"
              variant="ghost"
              size="sm"
              color="gray.500"
              _hover={{ color: 'gray.900' }}
              onClick={onClose}
            >
              <X size={18} />
            </IconButton>
          </HStack>
        </Flex>
        <iframe src={url} style={{ flex: 1, width: '100%', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }} title="Resume PDF" />
      </Box>
    </Box>
  );
}

function JobCard({
  job,
  onDelete,
  onStatusChange,
  onProcess,
  onGenerateResume,
}: {
  job: Job;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onProcess: (id: string) => Promise<void>;
  onGenerateResume: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const { data: emailCountData } = useQuery({
    queryKey: ['email-count', job.id],
    queryFn: async () => {
      const res = await fetch(`/api/mail/email-count?jobId=${job.id}`);
      return res.json() as Promise<{ count: number }>;
    },
    staleTime: 60_000,
    initialData: { count: 0 },
  });
  const emailCount = emailCountData?.count ?? 0;

  return (
    <Box borderWidth="1px" borderRadius="lg" bg="white" shadow="sm" overflow="hidden">
      <Box p="4">
        <Flex align="flex-start" justify="space-between" gap="3">
          <Box flex="1" minW="0">
            <HStack gap="2" flexWrap="wrap">
              {job.title && (
                <Text fontWeight="semibold" color="gray.900" truncate>{job.title}</Text>
              )}
              <StatusBadge status={job.status} />
              {emailCount > 0 && (
                <HStack gap="1" fontSize="xs" color="gray.500">
                  <Mail size={12} />
                  <Text>{emailCount}</Text>
                </HStack>
              )}
            </HStack>
            {job.company && (
              <Text fontSize="sm" color="gray.600" mt="0.5">{job.company}</Text>
            )}
            <Text fontSize="xs" color="gray.400" mt="1">
              {job.source && <span>Source: {job.source} · </span>}
              {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            {job.link && (
              <Box asChild fontSize="xs" color="blue.600" _hover={{ textDecoration: 'underline' }} mt="0.5" display="inline-block">
                <a href={job.link} target="_blank" rel="noopener noreferrer">View posting ↗</a>
              </Box>
            )}
          </Box>
          <HStack gap="2" flexShrink="0">
            <IconButton
              aria-label="Edit job"
              variant="ghost"
              size="sm"
              color="gray.400"
              _hover={{ color: 'blue.600', bg: 'blue.50' }}
              asChild
            >
              <Link to="/jobs/$id" params={{ id: job.id }}>
                <Pencil size={16} />
              </Link>
            </IconButton>
            {confirmDelete ? (
              <HStack gap="1">
                <Button size="xs" colorPalette="red" onClick={() => onDelete(job.id)}>Confirm</Button>
                <Button size="xs" variant="subtle" colorPalette="gray" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </HStack>
            ) : (
              <IconButton
                aria-label="Delete job"
                variant="ghost"
                size="sm"
                color="gray.400"
                _hover={{ color: 'red.600', bg: 'red.50' }}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
              </IconButton>
            )}
          </HStack>
        </Flex>

        <HStack mt="3" gap="3" flexWrap="wrap" align="center">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">Status:</Text>
          <NativeSelect.Root size="xs">
            <NativeSelect.Field
              value={job.status}
              onChange={(e) => onStatusChange(job.id, e.target.value)}
              bg="white"
              color="gray.700"
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </HStack>

        {job.notes && (
          <Text mt="2" fontSize="sm" color="gray.600" fontStyle="italic">
            Note: {job.notes}
          </Text>
        )}

        {job.status === 'new' && (
          <Button
            mt="3"
            size="xs"
            variant="outline"
            colorPalette="teal"
            loading={isProcessing}
            loadingText="Processing..."
            onClick={async () => {
              setIsProcessing(true);
              try { await onProcess(job.id); } finally { setIsProcessing(false); }
            }}
          >
            <Zap size={13} />
            Process
          </Button>
        )}

        {job.status === 'processed' && (
          <Button
            mt="3"
            size="xs"
            variant="outline"
            colorPalette="purple"
            loading={isGenerating}
            loadingText="Generating..."
            onClick={async () => {
              setIsGenerating(true);
              try { await onGenerateResume(job.id); } finally { setIsGenerating(false); }
            }}
          >
            <Zap size={13} />
            Generate Resume
          </Button>
        )}

        {job.matchScore != null && (
          <HStack mt="3" gap="3" flexWrap="wrap">
            <Badge
              colorPalette={job.matchScore >= 75 ? 'green' : job.matchScore >= 50 ? 'orange' : 'red'}
              variant="subtle"
              borderRadius="full"
              px="2.5"
              py="1"
              fontSize="xs"
              fontWeight="semibold"
            >
              Match: {job.matchScore}%
            </Badge>
            {job.resumePdfPath && (
              <Button
                size="xs"
                variant="ghost"
                color="purple.600"
                _hover={{ textDecoration: 'underline' }}
                onClick={() => setShowPdf(true)}
              >
                <FileText size={12} />
                View Resume
              </Button>
            )}
            {job.coverLetterPath && (
              <Box asChild fontSize="xs" color="purple.600" _hover={{ textDecoration: 'underline' }}>
                <a href={job.coverLetterPath} target="_blank" rel="noopener noreferrer">Cover Letter ↗</a>
              </Box>
            )}
          </HStack>
        )}

        {showPdf && job.resumePdfPath && (
          <PdfModal
            url={job.resumePdfPath}
            title={`${job.title} at ${job.company}`}
            onClose={() => setShowPdf(false)}
          />
        )}
      </Box>

      <Box borderTopWidth="1px">
        <Button
          w="full"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          justifyContent="space-between"
          color="gray.500"
          _hover={{ bg: 'gray.50' }}
          borderRadius="0"
          px="4"
          py="2"
        >
          <Text fontSize="xs">Job Description</Text>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
        {expanded && (
          <Box px="4" pb="4">
            <Box as="pre" fontSize="sm" color="gray.700" whiteSpace="pre-wrap" fontFamily="inherit" lineHeight="relaxed">
              {job.description}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function JobsDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => setDebouncedSearch(val), 300);
    setSearchTimer(t);
  };

  const params = new URLSearchParams();
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (debouncedSearch) params.set('search', debouncedSearch);
  const queryString = params.toString();

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', statusFilter, debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/jobs${queryString ? `?${queryString}` : ''}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const processMutation = useMutation({
    mutationFn: async (id?: string) => {
      const url = id ? `/api/jobs/process?id=${id}` : '/api/jobs/process';
      const res = await fetch(url, { method: 'POST' });
      if (res.status === 404) throw new Error('No new jobs to process');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Processing failed');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const generateResumeMutation = useMutation({
    mutationFn: async (id?: string) => {
      const url = id ? `/api/jobs/generate-resume?id=${id}` : '/api/jobs/generate-resume';
      const res = await fetch(url, { method: 'POST' });
      if (res.status === 404) throw new Error('No processed jobs to generate resume for');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Resume generation failed');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  return (
    <Container maxW="3xl" py="6" px="6">
      <Flex align="center" justify="space-between" mb="6">
        <Heading size="xl">Job Search</Heading>
        <HStack gap="2">
          <Button
            size="sm"
            variant="outline"
            colorPalette="teal"
            loading={processMutation.isPending}
            loadingText="Processing..."
            title={processMutation.isError ? processMutation.error?.message : 'Process one new job with AI'}
            onClick={() => processMutation.mutate(undefined)}
          >
            <Zap size={16} />
            Process
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorPalette="purple"
            loading={generateResumeMutation.isPending}
            loadingText="Generating..."
            title={generateResumeMutation.isError ? generateResumeMutation.error?.message : 'Generate tailored resume for next processed job'}
            onClick={() => generateResumeMutation.mutate(undefined)}
          >
            <Zap size={16} />
            Generate Resume
          </Button>
          <Button asChild size="sm" colorPalette="gray" variant="solid">
            <Link to="/jobs/new">
              <Plus size={16} />
              Add Job
            </Link>
          </Button>
        </HStack>
      </Flex>

      {processMutation.isError && (
        <Text fontSize="sm" color="red.600" mb="4">{processMutation.error?.message}</Text>
      )}
      {processMutation.isSuccess && (
        <Text fontSize="sm" color="teal.600" mb="4">Job processed successfully.</Text>
      )}
      {generateResumeMutation.isError && (
        <Text fontSize="sm" color="red.600" mb="4">{generateResumeMutation.error?.message}</Text>
      )}
      {generateResumeMutation.isSuccess && (
        <Text fontSize="sm" color="purple.600" mb="4">Resume generated successfully.</Text>
      )}

      <HStack gap="3" mb="6" flexDir={{ base: 'column', sm: 'row' }} align={{ base: 'stretch', sm: 'center' }}>
        <Input
          placeholder="Search by title, company, or source..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="sm"
          flex="1"
        />
        <NativeSelect.Root size="sm" minW="40">
          <NativeSelect.Field
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            bg="white"
          >
            <option value="all">All statuses</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      {jobs.length > 0 && (
        <Text fontSize="sm" color="gray.500" mb="4">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
        </Text>
      )}

      {isLoading ? (
        <Flex justify="center" py="12">
          <Spinner color="gray.400" />
        </Flex>
      ) : jobs.length === 0 ? (
        <Text textAlign="center" color="gray.500" py="12">
          No jobs found.{' '}
          <Box asChild color="blue.600" _hover={{ textDecoration: 'underline' }}>
            <Link to="/jobs/new">Add your first job</Link>
          </Box>
        </Text>
      ) : (
        <VStack gap="3" align="stretch">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onProcess={(id) => processMutation.mutateAsync(id)}
              onGenerateResume={(id) => generateResumeMutation.mutateAsync(id)}
            />
          ))}
        </VStack>
      )}
    </Container>
  );
}
