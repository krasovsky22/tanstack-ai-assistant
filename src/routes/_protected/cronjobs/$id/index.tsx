import { createFileRoute, useNavigate, notFound } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import {
  Box,
  Button,
  Input,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { FormField } from '@/components/FormField';
import { isValidUUID } from '@/lib/uuid';

const getCronjob = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    if (!isValidUUID(id)) throw notFound();
    const { db } = await import('@/db');
    const { cronjobs } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const [job] = await db.select().from(cronjobs).where(eq(cronjobs.id, id));
    if (!job) throw notFound();
    return job;
  });

export const Route = createFileRoute('/_protected/cronjobs/$id/')({
  loader: ({ params }) => getCronjob({ data: params.id }),
  component: EditCronjobPage,
});

function EditCronjobPage() {
  const job = Route.useLoaderData();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: job.name,
      cronExpression: job.cronExpression,
      prompt: job.prompt,
      isActive: job.isActive,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const res = await fetch(`/api/cronjobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Failed to update job');
        return;
      }
      navigate({ to: '/cronjobs' });
    },
  });

  return (
    <PageContainer maxW="2xl">
      <PageHeader title="Edit Cron Job" backTo="/cronjobs" backLabel="Automation" />

      <Box
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack gap="5">
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? 'Name is required' : undefined,
            }}
          >
            {(field) => (
              <FormField
                label="Name"
                error={
                  field.state.meta.isTouched && !field.state.meta.isValid
                    ? field.state.meta.errors.join(', ')
                    : undefined
                }
              >
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field
            name="cronExpression"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? 'Cron expression is required' : undefined,
            }}
          >
            {(field) => (
              <FormField
                label="Cron Expression"
                helperText="minute hour day month weekday"
                error={
                  field.state.meta.isTouched && !field.state.meta.isValid
                    ? field.state.meta.errors.join(', ')
                    : undefined
                }
              >
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  fontFamily="mono"
                />
              </FormField>
            )}
          </form.Field>

          <form.Field
            name="prompt"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? 'Prompt is required' : undefined,
            }}
          >
            {(field) => (
              <FormField
                label="Prompt"
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
                  rows={6}
                  resize="vertical"
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="isActive">
            {(field) => (
              <Switch.Root
                checked={field.state.value}
                onCheckedChange={(e) => field.handleChange(e.checked)}
                colorPalette="brand"
              >
                <Switch.HiddenInput onBlur={field.handleBlur} />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Label>Active</Switch.Label>
              </Switch.Root>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Stack gap="3">
                {submitError && (
                  <Text fontSize="sm" color="red.600">
                    {submitError}
                  </Text>
                )}
                <Stack direction="row" gap="3" pt="1">
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
                    <Link to="/cronjobs">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                  </Box>
                </Stack>
              </Stack>
            )}
          </form.Subscribe>
        </Stack>
      </Box>
    </PageContainer>
  );
}
