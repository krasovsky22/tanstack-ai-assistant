import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
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

export const Route = createFileRoute('/cronjobs/new')({
  component: NewCronjobPage,
});

function NewCronjobPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      cronExpression: '',
      prompt: '',
      isActive: true,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const res = await fetch('/api/cronjobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Failed to create job');
        return;
      }
      navigate({ to: '/cronjobs' });
    },
  });

  return (
    <PageContainer maxW="2xl">
      <PageHeader title="New Cron Job" backTo="/cronjobs" backLabel="Automation" />

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
                  placeholder="e.g. Daily Summary"
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
                  placeholder="* * * * *"
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
                  placeholder="What should the AI do when this job runs?"
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
                <Switch.Label>Active (schedule immediately)</Switch.Label>
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
                    loadingText="Creating..."
                  >
                    Create Job
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
