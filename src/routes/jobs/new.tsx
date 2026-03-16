import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import {
  Box,
  Button,
  Grid,
  Input,
  NativeSelect,
  Stack,
  Textarea,
  Text,
} from '@chakra-ui/react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { FormField } from '@/components/FormField';
import { JOB_STATUSES } from '@/lib/job-constants';
import { STATUS_LABELS } from '@/components/StatusBadge';

export const Route = createFileRoute('/jobs/new')({
  component: NewJobPage,
});

function NewJobPage() {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      title: '',
      company: '',
      source: '',
      link: '',
      status: 'new' as string,
      description: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!res.ok) throw new Error('Failed to save job');
      navigate({ to: '/jobs' });
    },
  });

  return (
    <PageContainer maxW="2xl">
      <PageHeader title="Add Job" backTo="/jobs" backLabel="Jobs" />

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

          <Box maxW="xs">
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
          </Box>

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
                  placeholder="Paste the full job description here..."
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
              <Stack direction="row" gap="3" pt="1">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  colorPalette="brand"
                  loading={isSubmitting as boolean}
                  loadingText="Saving..."
                >
                  Save Job
                </Button>
                <Box asChild>
                  <Link to="/jobs">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </Box>
              </Stack>
            )}
          </form.Subscribe>
        </Stack>
      </Box>
    </PageContainer>
  );
}
