import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import AsyncButton from '@/components/AsyncButton';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';

export const Route = createFileRoute('/mail/')({
  component: MailDashboard,
});

type Email = {
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  subject: string;
  sender: string;
  receivedAt: string;
  emailLlmSummarized: string;
  emailContent: string;
  source: string;
  createdAt: string;
};

type IngestResult = {
  fetched: number;
  jobRelated: number;
  matched: number;
  created: number;
};

function EmailRow({ email, onDelete }: { email: Email; onDelete: (id: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const receivedDate = new Date(email.receivedAt);
  const dateStr = receivedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = receivedDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" overflow="hidden">
      <HStack align="flex-start" gap="3" p="4" _hover={{ bg: 'gray.50' }} transition="background 0.15s">
        <Button
          variant="ghost"
          flex="1"
          minW="0"
          h="auto"
          p="0"
          justifyContent="flex-start"
          textAlign="left"
          onClick={() => setExpanded((e) => !e)}
        >
          <HStack align="flex-start" gap="3" flex="1" minW="0">
            <Box color="gray.400" mt="0.5" flexShrink="0">
              <Mail size={16} />
            </Box>
            <Box flex="1" minW="0">
              <HStack justify="space-between" gap="2" flexWrap="wrap">
                <Text fontWeight="medium" color="gray.900" truncate>{email.subject || '(no subject)'}</Text>
                <Text fontSize="xs" color="gray.400" flexShrink="0">{dateStr} {timeStr}</Text>
              </HStack>
              <HStack gap="2" mt="0.5" flexWrap="wrap">
                <Text fontSize="sm" color="gray.500" truncate>{email.sender}</Text>
                {email.jobTitle && (
                  <>
                    <Text color="gray.300">·</Text>
                    <Badge colorPalette="orange" variant="subtle" borderRadius="full" fontSize="xs" truncate>
                      {email.jobTitle}{email.jobCompany ? ` @ ${email.jobCompany}` : ''}
                    </Badge>
                  </>
                )}
                {!email.jobId && (
                  <>
                    <Text color="gray.300">·</Text>
                    <Badge colorPalette="gray" variant="subtle" borderRadius="full" fontSize="xs">unmatched</Badge>
                  </>
                )}
              </HStack>
            </Box>
            <Box color="gray.400" mt="0.5" flexShrink="0">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Box>
          </HStack>
        </Button>

        <AsyncButton
          onClick={() => onDelete(email.id)}
          spinnerSize={13}
          className="flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors shrink-0"
          title="Delete email"
        >
          <Trash2 size={14} />
        </AsyncButton>
      </HStack>

      {expanded && (
        <Box borderTopWidth="1px" borderColor="gray.100" p="4" bg="gray.50" spaceY="3">
          {email.jobId && (
            <Box asChild display="inline-flex" alignItems="center" gap="1.5" fontSize="xs" color="cyan.600" _hover={{ color: 'cyan.800' }} fontWeight="medium">
              <a href={`/jobs/${email.jobId}`}>
                <ExternalLink size={12} />
                View job
              </a>
            </Box>
          )}
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb="1">AI Summary</Text>
            <Text fontSize="sm" color="gray.700" lineHeight="relaxed" whiteSpace="pre-wrap">
              {email.emailLlmSummarized || 'No summary available.'}
            </Text>
          </Box>
          <Button
            variant="ghost"
            size="xs"
            color="gray.400"
            _hover={{ color: 'gray.600' }}
            textDecoration="underline"
            onClick={() => setShowRaw((r) => !r)}
          >
            {showRaw ? 'Hide full email' : 'Show full email'}
          </Button>
          {showRaw && (
            <Box
              as="pre"
              fontSize="xs"
              color="gray.600"
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              p="3"
              overflowX="auto"
              whiteSpace="pre-wrap"
              wordBreak="break-words"
              maxH="64"
              overflowY="auto"
            >
              {email.emailContent}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function MailDashboard() {
  const queryClient = useQueryClient();
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [ingestError, setIngestError] = useState(false);

  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ['mail-all'],
    queryFn: () => fetch('/api/mail/all').then((r) => r.json()),
  });

  async function handleIngest() {
    setIngestResult(null);
    setIngestError(false);
    const res = await fetch('/api/mail/ingest', { method: 'POST' });
    if (!res.ok) {
      setIngestError(true);
      throw new Error('Ingest failed');
    }
    const data: IngestResult = await res.json();
    setIngestResult(data);
    queryClient.invalidateQueries({ queryKey: ['mail-all'] });
    queryClient.invalidateQueries({ queryKey: ['email-count'] });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/mail/${id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['mail-all'] });
    queryClient.invalidateQueries({ queryKey: ['email-count'] });
  }

  return (
    <Container maxW="4xl" py="6" px="6">
      <Flex justify="space-between" align="flex-start" mb="6">
        <Box>
          <Heading size="xl" color="gray.900">Mail Inbox</Heading>
          <Text fontSize="sm" color="gray.500" mt="0.5">
            {isLoading ? 'Loading...' : `${emails.length} email${emails.length === 1 ? '' : 's'} ingested`}
          </Text>
        </Box>
        <AsyncButton
          onClick={handleIngest}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-60 transition-colors font-medium text-sm"
        >
          <RefreshCw size={14} />
          Fetch from Yahoo
        </AsyncButton>
      </Flex>

      {ingestResult && (
        <HStack mb="4" p="3" bg="green.50" borderWidth="1px" borderColor="green.200" borderRadius="lg" fontSize="sm" color="green.800" gap="6">
          <Text>✓ Fetch complete</Text>
          <Text>Fetched: <Text as="strong">{ingestResult.fetched}</Text></Text>
          <Text>Job-related: <Text as="strong">{ingestResult.jobRelated}</Text></Text>
          <Text>Matched: <Text as="strong">{ingestResult.matched}</Text></Text>
          <Text>New: <Text as="strong">{ingestResult.created}</Text></Text>
        </HStack>
      )}

      {ingestError && (
        <Box mb="4" p="3" bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="lg" fontSize="sm" color="red.700">
          Failed to fetch emails. Check your Yahoo credentials in .env.
        </Box>
      )}

      {isLoading ? (
        <Flex align="center" justify="center" py="16" gap="2" color="gray.400">
          <Spinner size="sm" />
          <Text fontSize="sm">Loading emails...</Text>
        </Flex>
      ) : emails.length === 0 ? (
        <VStack py="16" gap="3" color="gray.400" textAlign="center">
          <Mail size={40} style={{ opacity: 0.3 }} />
          <Text fontWeight="medium">No emails yet</Text>
          <Text fontSize="sm">Click "Fetch from Yahoo" to pull your inbox.</Text>
        </VStack>
      ) : (
        <VStack gap="2" align="stretch">
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} onDelete={handleDelete} />
          ))}
        </VStack>
      )}
    </Container>
  );
}
