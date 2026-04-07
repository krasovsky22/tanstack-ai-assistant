import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Bot, Copy, Plus } from 'lucide-react';
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
  Skeleton,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { AppModal } from '@/components/AppModal';
import { toaster } from '@/components/ui/toaster';

export const Route = createFileRoute('/_protected/agents')({
  component: AgentsDashboard,
});

type Agent = {
  id: string;
  name: string;
  model: string;
  maxIterations: number;
  systemPrompt: string;
  isDefault: boolean;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
};

type AgentFormValues = {
  name: string;
  model: string;
  maxIterations: number;
  systemPrompt: string;
};

const DEFAULT_FORM: AgentFormValues = {
  name: '',
  model: '',
  maxIterations: 10,
  systemPrompt: '',
};

function AgentsDashboard() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<AgentFormValues>(DEFAULT_FORM);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: AgentFormValues) => {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsModalOpen(false);
      setForm(DEFAULT_FORM);
      toaster.create({ type: 'success', title: 'Agent created', duration: 3000 });
    },
    onError: (error: Error) => {
      toaster.create({ type: 'error', title: 'Failed to create agent', description: error.message, duration: 5000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<AgentFormValues & { isDefault: boolean }> }) => {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsModalOpen(false);
      setEditingAgent(null);
      setForm(DEFAULT_FORM);
      toaster.create({ type: 'success', title: 'Agent updated', duration: 3000 });
    },
    onError: (error: Error) => {
      toaster.create({ type: 'error', title: 'Failed to update agent', description: error.message, duration: 5000 });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to set default agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toaster.create({ type: 'success', title: 'Default agent updated', duration: 3000 });
    },
    onError: (error: Error) => {
      toaster.create({ type: 'error', title: 'Failed to set default', description: error.message, duration: 5000 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        throw new Error('Failed to delete agent');
      }
    },
    onSuccess: () => {
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toaster.create({ type: 'success', title: 'Agent deleted', duration: 3000 });
    },
    onError: (error: Error) => {
      toaster.create({ type: 'error', title: 'Failed to delete agent', description: error.message, duration: 5000 });
    },
  });

  function openCreate() {
    setEditingAgent(null);
    setForm(DEFAULT_FORM);
    setIsModalOpen(true);
  }

  function openEdit(agent: Agent) {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      model: agent.model,
      maxIterations: agent.maxIterations,
      systemPrompt: agent.systemPrompt,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingAgent(null);
    setForm(DEFAULT_FORM);
  }

  function handleSubmit() {
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, values: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function maskApiKey(apiKey: string): string {
    if (!apiKey) return '—';
    return apiKey.slice(0, 8) + '••••••••';
  }

  function copyApiKey(apiKey: string) {
    navigator.clipboard.writeText(apiKey).then(() => {
      toaster.create({ type: 'success', title: 'Copied!', duration: 2000 });
    });
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <Container maxW="5xl" py="6" px="6">
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="xl">Agents</Heading>
        <Button colorPalette="gray" variant="solid" size="sm" onClick={openCreate}>
          <Plus size={16} />
          New Agent
        </Button>
      </Flex>

      {isLoading ? (
        <VStack gap="2" align="stretch">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="48px" borderRadius="md" />
          ))}
        </VStack>
      ) : agents.length === 0 ? (
        <VStack gap={4} py={16} alignItems="center" textAlign="center">
          <Bot size={40} color="var(--chakra-colors-text-muted)" />
          <Heading size="md" color="text.primary">No agents yet</Heading>
          <Text color="text.secondary" fontSize="sm">
            Create an agent to configure custom models, system prompts, and iteration limits.
          </Text>
          <Button colorPalette="gray" variant="solid" size="sm" onClick={openCreate}>
            Create your first agent
          </Button>
        </VStack>
      ) : (
        <Box borderRadius="lg" borderWidth="1px" bg="bg.surface" shadow="sm" overflow="hidden">
          <Table.Root size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Name</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Model</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Max Iterations</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Default</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">API Key</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600" textAlign="right">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {agents.map((agent) => (
                <Table.Row key={agent.id} _hover={{ bg: 'whiteAlpha.50' }} transition="all 0.15s ease">
                  <Table.Cell fontWeight="medium" color="text.primary">{agent.name}</Table.Cell>
                  <Table.Cell fontFamily="mono" color="gray.600" fontSize="xs">{agent.model}</Table.Cell>
                  <Table.Cell color="gray.600">{agent.maxIterations}</Table.Cell>
                  <Table.Cell>
                    {agent.isDefault && (
                      <Badge colorPalette="green" size="sm">Default</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap="2">
                      <Text fontFamily="mono" fontSize="xs" color="gray.500">
                        {maskApiKey(agent.apiKey)}
                      </Text>
                      <IconButton
                        aria-label="Copy API key"
                        variant="ghost"
                        size="xs"
                        color="gray.400"
                        _hover={{ color: 'blue.600', bg: 'blue.50' }}
                        onClick={() => copyApiKey(agent.apiKey)}
                      >
                        <Copy size={13} />
                      </IconButton>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>
                    <HStack justify="flex-end" gap="1">
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="gray"
                        onClick={() => openEdit(agent)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="gray"
                        disabled={agent.isDefault || setDefaultMutation.isPending}
                        onClick={() => setDefaultMutation.mutate(agent.id)}
                      >
                        Set Default
                      </Button>
                      {deleteConfirmId === agent.id ? (
                        <HStack gap="1">
                          <Button
                            size="xs"
                            colorPalette="red"
                            loading={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(agent.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="xs"
                            variant="subtle"
                            colorPalette="gray"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Cancel
                          </Button>
                        </HStack>
                      ) : (
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => setDeleteConfirmId(agent.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      <AppModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingAgent ? 'Edit Agent' : 'New Agent'}
        size="lg"
        footer={
          <HStack justify="flex-end" w="full" gap="2">
            <Button variant="subtle" colorPalette="gray" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              colorPalette="gray"
              variant="solid"
              size="sm"
              loading={isMutating}
              onClick={handleSubmit}
            >
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </Button>
          </HStack>
        }
      >
        <VStack gap="4" align="stretch">
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1" color="text.primary">Name</Text>
            <Input
              size="sm"
              placeholder="e.g. My Custom Agent"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1" color="text.primary">Model</Text>
            <Input
              size="sm"
              placeholder="e.g. gpt-5.2 or amazon.nova-pro-v1:0"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1" color="text.primary">Max Iterations</Text>
            <Input
              size="sm"
              type="number"
              placeholder="10"
              value={form.maxIterations}
              onChange={(e) => setForm((f) => ({ ...f, maxIterations: parseInt(e.target.value, 10) || 10 }))}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1" color="text.primary">System Prompt</Text>
            <Textarea
              size="sm"
              rows={6}
              placeholder="You are a helpful assistant..."
              value={form.systemPrompt}
              onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
            />
          </Box>
        </VStack>
      </AppModal>
    </Container>
  );
}
