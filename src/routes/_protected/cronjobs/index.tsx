import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Play, Square, List, Zap, Clock } from 'lucide-react';
import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  IconButton,
  Skeleton,
  Spinner,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';

export const Route = createFileRoute('/_protected/cronjobs/')({
  component: CronjobsDashboard,
});

type Cronjob = {
  id: string;
  name: string;
  cronExpression: string;
  prompt: string;
  isActive: boolean;
  lastRunAt: string | null;
  lastResult: string | null;
  createdAt: string;
  updatedAt: string;
};

function CronjobsDashboard() {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<Record<string, string | null>>({});
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useQuery<Cronjob[]>({
    queryKey: ['cronjobs'],
    queryFn: async () => {
      const res = await fetch('/api/cronjobs');
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await fetch(`/api/cronjobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cronjobs'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/cronjobs/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
    },
  });

  async function handleTest(job: Cronjob) {
    setTestLoading((prev) => ({ ...prev, [job.id]: true }));
    setTestResults((prev) => ({ ...prev, [job.id]: null }));
    try {
      const res = await fetch(`/api/cronjobs/${job.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [job.id]: res.ok ? (data.result ?? '(no result)') : `Error: ${data.error}`,
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [job.id]: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }));
    } finally {
      setTestLoading((prev) => ({ ...prev, [job.id]: false }));
    }
  }

  return (
    <Container maxW="4xl" py="6" px="6">
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="xl">Automation</Heading>
        <Button asChild colorPalette="gray" variant="solid" size="sm">
          <Link to="/cronjobs/new">
            <Plus size={16} />
            New Job
          </Link>
        </Button>
      </Flex>

      {isLoading ? (
        <VStack gap="2" align="stretch">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="48px" borderRadius="md" />
          ))}
        </VStack>
      ) : jobs.length === 0 ? (
        <VStack gap={4} py={16} alignItems="center" textAlign="center">
          <Clock size={40} color="var(--chakra-colors-text-muted)" />
          <Heading size="md" color="text.primary">No automation jobs yet</Heading>
          <Text color="text.secondary" fontSize="sm">Schedule recurring AI tasks with cron expressions.</Text>
          <Button asChild colorPalette="gray" variant="solid" size="sm">
            <Link to="/cronjobs/new">Create your first job</Link>
          </Button>
        </VStack>
      ) : (
        <Box borderRadius="lg" borderWidth="1px" bg="bg.surface" shadow="sm" overflow="hidden">
          <Table.Root size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Name</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Schedule</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Status</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Last Run</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600" textAlign="right">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {jobs.map((job) => (
                <React.Fragment key={job.id}>
                  <Table.Row _hover={{ bg: 'gray.50' }} transition="all 0.15s ease">
                    <Table.Cell fontWeight="medium" color="text.primary">{job.name}</Table.Cell>
                    <Table.Cell fontFamily="mono" color="gray.600" fontSize="xs">{job.cronExpression}</Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        variant="subtle"
                        colorPalette={job.isActive ? 'green' : 'gray'}
                        borderRadius="full"
                        onClick={() => toggleMutation.mutate({ id: job.id, isActive: !job.isActive })}
                      >
                        {job.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </Table.Cell>
                    <Table.Cell color="gray.500" fontSize="xs">
                      {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : '—'}
                    </Table.Cell>
                    <Table.Cell>
                      <HStack justify="flex-end" gap="1">
                        <IconButton
                          aria-label={job.isActive ? 'Stop' : 'Start'}
                          variant="ghost"
                          size="xs"
                          color="gray.400"
                          _hover={{ color: 'green.600', bg: 'green.50' }}
                          onClick={() => toggleMutation.mutate({ id: job.id, isActive: !job.isActive })}
                        >
                          {job.isActive ? <Square size={15} /> : <Play size={15} />}
                        </IconButton>
                        <IconButton
                          aria-label="Test run"
                          variant="ghost"
                          size="xs"
                          color="gray.400"
                          _hover={{ color: 'orange.600', bg: 'orange.50' }}
                          disabled={testLoading[job.id]}
                          onClick={() => handleTest(job)}
                        >
                          {testLoading[job.id] ? <Spinner size="xs" /> : <Zap size={15} />}
                        </IconButton>
                        <IconButton
                          aria-label="View logs"
                          variant="ghost"
                          size="xs"
                          color="gray.400"
                          _hover={{ color: 'blue.600', bg: 'blue.50' }}
                          asChild
                        >
                          <Link to="/cronjobs/$id/logs" params={{ id: job.id }}>
                            <List size={15} />
                          </Link>
                        </IconButton>
                        <IconButton
                          aria-label="Edit"
                          variant="ghost"
                          size="xs"
                          color="gray.400"
                          _hover={{ color: 'indigo.600', bg: 'indigo.50' }}
                          asChild
                        >
                          <Link to="/cronjobs/$id" params={{ id: job.id }}>
                            <Pencil size={15} />
                          </Link>
                        </IconButton>
                        {confirmDelete === job.id ? (
                          <HStack gap="1">
                            <Button
                              size="xs"
                              colorPalette="red"
                              onClick={() => deleteMutation.mutate(job.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="xs"
                              variant="subtle"
                              colorPalette="gray"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </HStack>
                        ) : (
                          <IconButton
                            aria-label="Delete"
                            variant="ghost"
                            size="xs"
                            color="gray.400"
                            _hover={{ color: 'red.600', bg: 'red.50' }}
                            onClick={() => setConfirmDelete(job.id)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {(testLoading[job.id] || testResults[job.id] !== undefined) && (
                    <Table.Row key={`${job.id}-result`}>
                      <Table.Cell colSpan={5} bg="gray.50" borderTopWidth="1px">
                        {testLoading[job.id] ? (
                          <Text fontSize="xs" color="gray.400">Running test...</Text>
                        ) : testResults[job.id] ? (
                          <Text fontSize="xs" color="gray.700">
                            <Text as="span" fontWeight="medium" color="gray.500" mr="2">Test result:</Text>
                            <Text as="span" whiteSpace="pre-wrap">{testResults[job.id]}</Text>
                          </Text>
                        ) : null}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Container>
  );
}
