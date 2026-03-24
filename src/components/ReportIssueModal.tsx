import { useState } from 'react';
import { useRouteContext } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import {
  Box,
  Button,
  Flex,
  Input,
  Link,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { AppModal } from '@/components/AppModal';
import { buildReportPrompt, parseTicketResponse, type TicketInfo } from '@/lib/report-issue';

type SubmitState = 'form' | 'submitting' | 'success' | 'error';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportIssueModal({ isOpen, onClose }: ReportIssueModalProps) {
  const { user } = useRouteContext({ from: '__root__' });
  const [submitState, setSubmitState] = useState<SubmitState>('form');
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm({
    defaultValues: { title: '', description: '' },
    onSubmit: async ({ value }) => {
      try {
        setSubmitState('submitting');
        const pageUrl = window.location.href;
        const prompt = buildReportPrompt(value.title, value.description, pageUrl);
        const res = await fetch('/api/chat-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.userId ?? null,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? 'Request failed');
        const parsed = parseTicketResponse(data.text);
        if (!parsed.success) throw new Error(parsed.error);
        setTicketInfo({ category: parsed.category, ticketKey: parsed.ticketKey, ticketUrl: parsed.ticketUrl });
        setSubmitState('success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setSubmitState('error');
      }
    },
  });

  function handleClose() {
    if (submitState === 'submitting') return;
    form.reset();
    setSubmitState('form');
    setTicketInfo(null);
    setErrorMessage('');
    onClose();
  }

  // Submitting state
  if (submitState === 'submitting') {
    return (
      <AppModal isOpen={isOpen} onClose={handleClose} title="Report Issue">
        <Flex direction="column" align="center" gap="4" py="8">
          <Spinner size="lg" />
          <Text color="text.secondary" fontSize="sm">
            Classifying and creating ticket...
          </Text>
        </Flex>
      </AppModal>
    );
  }

  // Success state
  if (submitState === 'success' && ticketInfo) {
    return (
      <AppModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Report Issue"
        footer={
          <Button variant="solid" onClick={handleClose}>
            Close
          </Button>
        }
      >
        <VStack gap="3" align="center" py="4">
          <CheckCircle2 size={40} color="var(--chakra-colors-green-500)" />
          <Text fontWeight="semibold" color="text.primary">
            {ticketInfo.category} report created
          </Text>
          {ticketInfo.ticketUrl ? (
            <Link href={ticketInfo.ticketUrl} target="_blank" color="brand.600" fontSize="sm">
              <Flex align="center" gap="1">
                View ticket {ticketInfo.ticketKey}
                <ExternalLink size={12} />
              </Flex>
            </Link>
          ) : (
            <Text fontSize="sm" color="text.secondary">
              Ticket {ticketInfo.ticketKey} created
            </Text>
          )}
        </VStack>
      </AppModal>
    );
  }

  // Error state
  if (submitState === 'error') {
    return (
      <AppModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Report Issue"
        footer={
          <Flex gap="2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={() => {
                setSubmitState('form');
                setErrorMessage('');
              }}
            >
              Try Again
            </Button>
          </Flex>
        }
      >
        <VStack gap="3" align="center" py="4">
          <AlertCircle size={40} color="var(--chakra-colors-red-500)" />
          <Text color="text.primary" textAlign="center" fontSize="sm">
            {errorMessage || 'Something went wrong. Please try again.'}
          </Text>
        </VStack>
      </AppModal>
    );
  }

  // Form state (default)
  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Report Issue"
      footer={
        <Flex gap="2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                variant="solid"
                type="submit"
                disabled={isSubmitting}
                onClick={() => form.handleSubmit()}
              >
                {isSubmitting ? <Spinner size="xs" /> : 'Submit'}
              </Button>
            )}
          </form.Subscribe>
        </Flex>
      }
    >
      <VStack gap="4" as="form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <Box w="full">
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.length < 3 ? 'Title must be at least 3 characters' : undefined,
            }}
          >
            {(field) => (
              <VStack gap="1" align="start">
                <Text fontSize="sm" fontWeight="medium" color="text.primary">
                  Title
                </Text>
                <Input
                  placeholder="Brief summary..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text fontSize="xs" color="red.500">
                    {field.state.meta.errors[0]}
                  </Text>
                )}
              </VStack>
            )}
          </form.Field>
        </Box>

        <Box w="full">
          <form.Field
            name="description"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? 'Description is required' : undefined,
            }}
          >
            {(field) => (
              <VStack gap="1" align="start">
                <Text fontSize="sm" fontWeight="medium" color="text.primary">
                  Description
                </Text>
                <Textarea
                  placeholder="What happened? What did you expect?"
                  rows={4}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text fontSize="xs" color="red.500">
                    {field.state.meta.errors[0]}
                  </Text>
                )}
              </VStack>
            )}
          </form.Field>
        </Box>
      </VStack>
    </AppModal>
  );
}
