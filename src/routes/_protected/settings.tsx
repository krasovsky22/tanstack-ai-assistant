import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { FormField } from '@/components/FormField';
import { toaster } from '@/components/ui/toaster';
import {
  isNotificationSupported,
  requestNotificationPermission,
} from '@/lib/browser-notifications';

export const Route = createFileRoute('/_protected/settings')({
  component: SettingsPage,
});

type UserSettings = {
  jiraBaseUrl: string | null;
  jiraEmail: string | null;
  jiraPat: string | null;
  jiraDefaultProject: string | null;
  hasJiraPat: boolean;
};

const MASKED_PAT = '••••••••';

function JiraStatusBadge({ settings }: { settings: UserSettings | undefined }) {
  if (!settings) return null;

  const isConfigured =
    !!settings.jiraBaseUrl && !!settings.jiraEmail && settings.hasJiraPat;

  return (
    <Badge
      colorPalette={isConfigured ? 'green' : 'gray'}
      variant="subtle"
      borderRadius="full"
      px="3"
      py="1"
      fontSize="xs"
      fontWeight="medium"
    >
      {isConfigured ? 'Jira tools active' : 'Not configured'}
    </Badge>
  );
}

function JiraIntegrationCard({ settings }: { settings: UserSettings | undefined }) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      jiraBaseUrl: settings?.jiraBaseUrl ?? '',
      jiraEmail: settings?.jiraEmail ?? '',
      jiraPat: settings?.jiraPat ?? '',
      jiraDefaultProject: settings?.jiraDefaultProject ?? '',
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const res = await fetch('/api/user-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jiraBaseUrl: value.jiraBaseUrl,
            jiraEmail: value.jiraEmail,
            jiraPat: value.jiraPat,
            jiraDefaultProject: value.jiraDefaultProject,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setSubmitError(data.error ?? 'Failed to save settings');
          toaster.create({
            type: 'error',
            title: 'Failed to save settings',
            description: data.error ?? 'An unexpected error occurred',
            duration: 6000,
          });
          return;
        }

        toaster.create({
          type: 'success',
          title: 'Settings saved',
          description: 'Jira integration settings updated successfully',
          duration: 4000,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setSubmitError(message);
        toaster.create({
          type: 'error',
          title: 'Failed to save settings',
          description: message,
          duration: 6000,
        });
      }
    },
  });

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.default"
      shadow="sm"
      overflow="hidden"
    >
      <Box px="6" py="4" borderBottomWidth="1px" borderColor="border.default" bg="gray.50">
        <Stack direction="row" align="center" justify="space-between">
          <Box>
            <Text fontWeight="semibold" color="text.primary" fontSize="md">
              Jira Integration
            </Text>
            <Text color="text.secondary" fontSize="sm" mt="0.5">
              Connect your Jira account to enable AI-powered issue management
            </Text>
          </Box>
          <JiraStatusBadge settings={settings} />
        </Stack>
      </Box>

      <Box px="6" py="5">
        <Box
          as="form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <Stack gap="5">
            <form.Field name="jiraBaseUrl">
              {(field) => (
                <FormField
                  label="Jira Base URL"
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
                    placeholder="https://yourorg.atlassian.net"
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="jiraEmail">
              {(field) => (
                <FormField
                  label="Email"
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
                    placeholder="your@email.com"
                    type="email"
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="jiraPat">
              {(field) => (
                <FormField
                  label="API Token (PAT)"
                  helperText={
                    settings?.hasJiraPat
                      ? 'A token is currently set. Enter a new value to replace it, or leave as-is.'
                      : undefined
                  }
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
                    placeholder={MASKED_PAT}
                    type="password"
                  />
                </FormField>
              )}
            </form.Field>

            <form.Field name="jiraDefaultProject">
              {(field) => (
                <FormField
                  label="Default Project Key"
                  helperText="Optional — used as the default when creating issues"
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
                    placeholder="PROJ"
                  />
                </FormField>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Stack gap="3">
                  {submitError && (
                    <Text fontSize="sm" color="red.600">
                      {submitError}
                    </Text>
                  )}
                  <Box>
                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      colorPalette="brand"
                      loading={isSubmitting as boolean}
                      loadingText="Saving..."
                    >
                      Save
                    </Button>
                  </Box>
                </Stack>
              )}
            </form.Subscribe>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

function permissionLabel(permission: NotificationPermission): string {
  if (permission === 'granted') return 'Granted';
  if (permission === 'denied') return 'Denied';
  return 'Not requested';
}

function permissionBadgeColor(permission: NotificationPermission): string {
  if (permission === 'granted') return 'green';
  if (permission === 'denied') return 'red';
  return 'gray';
}

function BrowserNotificationsCard() {
  const supported = isNotificationSupported();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (supported) {
      setPermission(Notification.permission);
    }
    setEnabled(localStorage.getItem('browserNotificationsEnabled') === 'true');
  }, [supported]);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission();
      const newPermission = supported ? Notification.permission : 'default';
      setPermission(newPermission);
      setEnabled(granted);
      localStorage.setItem('browserNotificationsEnabled', granted ? 'true' : 'false');
    } else {
      setEnabled(false);
      localStorage.setItem('browserNotificationsEnabled', 'false');
    }
  };

  return (
    <Box
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.default"
      shadow="sm"
      overflow="hidden"
      mt="6"
    >
      <Box px="6" py="4" borderBottomWidth="1px" borderColor="border.default" bg="gray.50">
        <Stack direction="row" align="center" justify="space-between">
          <Box>
            <Text fontWeight="semibold" color="text.primary" fontSize="md">
              Browser Notifications
            </Text>
            <Text color="text.secondary" fontSize="sm" mt="0.5">
              Receive browser notifications when new notifications arrive
            </Text>
          </Box>
          <Badge
            colorPalette={permissionBadgeColor(permission)}
            variant="subtle"
            borderRadius="full"
            px="3"
            py="1"
            fontSize="xs"
            fontWeight="medium"
          >
            {permissionLabel(permission)}
          </Badge>
        </Stack>
      </Box>

      <Box px="6" py="5">
        {!supported ? (
          <Text fontSize="sm" color="text.secondary">
            Browser notifications are not supported in this browser.
          </Text>
        ) : (
          <Flex align="center" gap="4">
            <Switch.Root
              checked={enabled && permission === 'granted'}
              onCheckedChange={(details) => handleToggle(details.checked)}
              disabled={permission === 'denied'}
              colorPalette="green"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>
                <Text fontSize="sm" color="text.primary" fontWeight="medium">
                  Browser Notifications
                </Text>
              </Switch.Label>
            </Switch.Root>
            {permission === 'denied' && (
              <Text fontSize="xs" color="red.600">
                Notifications have been blocked. Enable them in your browser settings to continue.
              </Text>
            )}
          </Flex>
        )}
      </Box>
    </Box>
  );
}

function SettingsPage() {
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const res = await fetch('/api/user-settings');
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
  });

  return (
    <PageContainer maxW="2xl">
      <PageHeader
        title="Settings"
        subtitle="Configure your integrations and preferences"
      />

      {isLoading ? (
        <Box
          bg="white"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.default"
          shadow="sm"
          px="6"
          py="5"
        >
          <Stack gap="5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} h="10" bg="gray.100" borderRadius="md" />
            ))}
          </Stack>
        </Box>
      ) : (
        <JiraIntegrationCard settings={settings} />
      )}

      <BrowserNotificationsCard />
    </PageContainer>
  );
}
