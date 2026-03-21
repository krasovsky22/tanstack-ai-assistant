import { createFileRoute, useNavigate, useRouter, notFound } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useForm } from '@tanstack/react-form';
import { useState, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  Input,
  NativeSelect,
  Stack,
  Tag,
  Text,
  Textarea,
  Wrap,
} from '@chakra-ui/react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { FormField } from '@/components/FormField';
import { JOB_STATUSES } from '@/lib/job-constants';
import { STATUS_LABELS } from '@/components/StatusBadge';
import { isValidUUID } from '@/lib/uuid';

const getJob = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    if (!isValidUUID(id)) throw notFound();
    const { db } = await import('@/db');
    const { jobs } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) throw notFound();
    return job;
  });

const resetJob = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import('@/db');
    const { jobs } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [job] = await db
      .update(jobs)
      .set({
        title: '',
        company: '',
        source: '',
        link: null,
        notes: null,
        salary: null,
        skills: [],
        jobLocation: null,
        status: 'new',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();

    if (!job) throw new Error('Job not found');
    return job;
  });

export const Route = createFileRoute('/_protected/jobs/$id')({
  loader: ({ params }) => getJob({ data: params.id }),
  component: EditJobPage,
});

type JobEmail = {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  emailLlmSummarized: string;
  emailContent: string;
};

type EmailThreadGroup = {
  normalizedSubject: string;
  emails: JobEmail[];
};

function normalizeEmailSubject(subject: string): string {
  let s = subject;
  let prev: string;
  do {
    prev = s;
    s = s.replace(/^(re|fwd|fw)\s*:\s*/i, '').trim();
  } while (s !== prev);
  return s.toLowerCase();
}

function groupEmailsBySubject(emails: JobEmail[]): EmailThreadGroup[] {
  const map = new Map<string, JobEmail[]>();
  for (const email of emails) {
    const key = normalizeEmailSubject(email.subject);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(email);
  }
  return Array.from(map.entries()).map(([normalizedSubject, emails]) => ({
    normalizedSubject,
    emails,
  }));
}

function EmailItem({ email }: { email: JobEmail }) {
  const [showFull, setShowFull] = useState(false);
  return (
    <Box py="3" borderBottomWidth="1px" _last={{ borderBottomWidth: 0 }}>
      <Flex justifyContent="space-between" alignItems="flex-start" gap="2" mb="1">
        <Text fontSize="xs" color="text.secondary">{email.sender}</Text>
        <Text fontSize="xs" color="text.muted" flexShrink={0}>
          {new Date(email.receivedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </Flex>
      <Text fontSize="sm" color="text.primary">{email.emailLlmSummarized}</Text>
      {showFull && (
        <Box
          as="pre"
          mt="2"
          fontSize="xs"
          color="text.secondary"
          whiteSpace="pre-wrap"
          fontFamily="mono"
          bg="bg.surface"
          p="3"
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.default"
        >
          {email.emailContent}
        </Box>
      )}
      <Button
        type="button"
        variant="plain"
        size="xs"
        mt="1"
        color="blue.600"
        px="0"
        height="auto"
        onClick={() => setShowFull((v) => !v)}
      >
        {showFull ? 'Hide full email' : 'Show full email'}
      </Button>
    </Box>
  );
}

function EmailThreadSection({ jobId }: { jobId: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data: emails = [] } = useQuery<JobEmail[]>({
    queryKey: ['emails-by-job', jobId],
    queryFn: async () => {
      const res = await fetch(`/api/mail/emails-by-job?jobId=${jobId}`);
      return res.json();
    },
    enabled: expanded,
    staleTime: 60_000,
  });

  const threads = groupEmailsBySubject(emails);

  return (
    <Box mt="6" borderWidth="1px" borderRadius="lg" bg="bg.surface" overflow="hidden">
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
          <HStack gap="1.5">
            <Icon as={Mail} boxSize="3" />
            <Text>Emails</Text>
          </HStack>
          <Icon as={expanded ? ChevronUp : ChevronDown} boxSize="3.5" />
        </Button>
        {expanded && (
          <Box px="4" pb="4">
            {threads.length === 0 ? (
              <Text fontSize="sm" color="text.muted" py="2">
                No emails linked to this job.
              </Text>
            ) : (
              threads.map((thread) => (
                <Box key={thread.normalizedSubject} mb="4" _last={{ mb: 0 }}>
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color="text.secondary"
                    mb="1"
                    textTransform="capitalize"
                  >
                    {thread.normalizedSubject || '(no subject)'}
                  </Text>
                  {thread.emails.map((email) => (
                    <EmailItem key={email.id} email={email} />
                  ))}
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function SkillsInput({
  value,
  onChange,
  onBlur,
}: {
  value: string[];
  onChange: (skills: string[]) => void;
  onBlur: () => void;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const skill = raw.trim();
    if (skill && !value.includes(skill)) {
      onChange([...value, skill]);
    }
    setInput('');
  };

  const remove = (skill: string) => {
    onChange(value.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  const handleBlur = () => {
    if (input.trim()) add(input);
    onBlur();
  };

  return (
    <Box
      minH="42px"
      w="full"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      px="3"
      py="2"
      cursor="text"
      _focusWithin={{ outline: '2px solid', outlineColor: 'colorPalette.500', outlineOffset: '-1px' }}
      onClick={() => inputRef.current?.focus()}
    >
      <Wrap gap="1.5" align="center">
        {value.map((skill) => (
          <Tag.Root key={skill} size="sm" colorPalette="blue" variant="subtle" borderRadius="full">
            <Tag.Label>{skill}</Tag.Label>
            <Tag.EndElement>
              <Button
                type="button"
                variant="plain"
                size="xs"
                p="0"
                minW="unset"
                h="auto"
                color="blue.700"
                _hover={{ color: 'blue.900' }}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(skill);
                }}
              >
                <X size={11} />
              </Button>
            </Tag.EndElement>
          </Tag.Root>
        ))}
        <Box
          as="input"
          ref={inputRef}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? 'Type a skill, press Enter or ,' : ''}
          flex="1"
          minW="140px"
          fontSize="sm"
          outline="none"
          bg="transparent"
          border="none"
        />
      </Wrap>
    </Box>
  );
}

function EditJobPage() {
  const job = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    await resetJob({ data: job.id });
    setConfirmReset(false);
    setResetting(false);
    router.invalidate();
  };

  const form = useForm({
    defaultValues: {
      title: job.title,
      company: job.company,
      source: job.source,
      link: job.link ?? '',
      status: job.status,
      description: job.description,
      notes: job.notes ?? '',
      salary: job.salary ?? '',
      skills: (job.skills as string[] | null) ?? [],
      jobLocation: job.jobLocation ?? '',
    },
    onSubmit: async ({ value }) => {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...value,
          link: value.link || null,
          notes: value.notes || null,
          salary: value.salary || null,
          jobLocation: value.jobLocation || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save job');
      navigate({ to: '/jobs' });
    },
  });

  return (
    <PageContainer maxW="2xl">
      <PageHeader title="Edit Job" backTo="/jobs" backLabel="Jobs" />

      <Box
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack gap="5">
          <Grid gridTemplateColumns="1fr 1fr" gap="4">
            <form.Field name="title">
              {(field) => (
                <FormField label="Job Title">
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="company">
              {(field) => (
                <FormField label="Company">
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />
                </FormField>
              )}
            </form.Field>
          </Grid>

          <Grid gridTemplateColumns="1fr 1fr" gap="4">
            <form.Field name="source">
              {(field) => (
                <FormField label="Source">
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. LinkedIn, Indeed, Referral"
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="link">
              {(field) => (
                <FormField label="Job Link">
                  <Input
                    type="url"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://..."
                  />
                </FormField>
              )}
            </form.Field>
          </Grid>

          <Grid gridTemplateColumns="1fr 1fr" gap="4">
            <form.Field name="status">
              {(field) => (
                <FormField label="Status">
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    >
                      {JOB_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s] ?? s}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </FormField>
              )}
            </form.Field>

            <form.Field name="jobLocation">
              {(field) => (
                <FormField label="Location">
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Remote, New York, NY"
                  />
                </FormField>
              )}
            </form.Field>
          </Grid>

          <Box maxW="xs">
            <form.Field name="salary">
              {(field) => (
                <FormField label="Salary">
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. $120k–$160k"
                  />
                </FormField>
              )}
            </form.Field>
          </Box>

          <form.Field name="skills">
            {(field) => (
              <FormField label="Skills">
                <SkillsInput
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field
            name="description"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? 'Description is required' : undefined,
            }}
          >
            {(field) => (
              <FormField
                label="Job Description"
                isRequired
                error={
                  field.state.meta.isTouched && !field.state.meta.isValid
                    ? field.state.meta.errors.join(', ')
                    : undefined
                }
              >
                <Textarea
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={12}
                  fontFamily="mono"
                  resize="vertical"
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <FormField label="Notes">
                <Textarea
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Any personal notes about this job..."
                  rows={3}
                  resize="vertical"
                />
              </FormField>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Flex alignItems="center" justifyContent="space-between" pt="1">
                <HStack gap="3">
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    colorPalette="brand"
                    loading={isSubmitting as boolean}
                    loadingText="Saving..."
                  >
                    Save Changes
                  </Button>
                  <Box asChild>
                    <Link to="/jobs">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                  </Box>
                </HStack>

                <HStack gap="2">
                  {confirmReset ? (
                    <>
                      <Text fontSize="xs" color="text.secondary">
                        Reset all fields?
                      </Text>
                      <Button
                        type="button"
                        size="xs"
                        colorPalette="red"
                        onClick={handleReset}
                        disabled={resetting}
                        loading={resetting}
                        loadingText="Resetting..."
                      >
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => setConfirmReset(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      colorPalette="red"
                      onClick={() => setConfirmReset(true)}
                    >
                      Reset to new
                    </Button>
                  )}
                </HStack>
              </Flex>
            )}
          </form.Subscribe>
        </Stack>
      </Box>

      <EmailThreadSection jobId={job.id} />
    </PageContainer>
  );
}
