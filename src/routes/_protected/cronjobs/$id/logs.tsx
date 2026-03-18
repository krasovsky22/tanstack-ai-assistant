import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import {
  Box,
  Badge,
  Container,
  Flex,
  HStack,
  Heading,
  Table,
  Text,
} from '@chakra-ui/react';

const getCronjobLogs = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import('@/db');
    const { cronjobs, cronjobLogs } = await import('@/db/schema');
    const { eq, desc } = await import('drizzle-orm');

    const [job] = await db
      .select({ id: cronjobs.id, name: cronjobs.name })
      .from(cronjobs)
      .where(eq(cronjobs.id, id));

    if (!job) throw new Error('Cronjob not found');

    const logs = await db
      .select({
        id: cronjobLogs.id,
        status: cronjobLogs.status,
        result: cronjobLogs.result,
        error: cronjobLogs.error,
        durationMs: cronjobLogs.durationMs,
        ranAt: cronjobLogs.ranAt,
      })
      .from(cronjobLogs)
      .where(eq(cronjobLogs.cronjobId, id))
      .orderBy(desc(cronjobLogs.ranAt))
      .limit(50);

    return { job, logs };
  });

export const Route = createFileRoute('/_protected/cronjobs/$id/logs')({
  loader: ({ params }) => getCronjobLogs({ data: params.id }),
  component: CronjobLogsPage,
});

type Log = {
  id: string;
  status: string;
  result: string | null;
  error: string | null;
  durationMs: number | null;
  ranAt: string | Date;
};

function LogRow({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false);
  const content = log.status === 'success' ? log.result : log.error;
  const truncated = content && content.length > 120 ? content.slice(0, 120) + '…' : content;

  return (
    <Table.Row _hover={{ bg: 'gray.50' }}>
      <Table.Cell color="gray.500" fontSize="xs" whiteSpace="nowrap" suppressHydrationWarning>
        {new Date(log.ranAt).toLocaleString()}
      </Table.Cell>
      <Table.Cell>
        <Badge
          colorPalette={log.status === 'success' ? 'green' : 'red'}
          variant="subtle"
          borderRadius="full"
          size="sm"
        >
          {log.status}
        </Badge>
      </Table.Cell>
      <Table.Cell color="gray.500" fontSize="xs">
        {log.durationMs != null ? `${log.durationMs}ms` : '—'}
      </Table.Cell>
      <Table.Cell fontSize="xs" color="gray.700" maxW="sm">
        {content ? (
          <Box
            as="button"
            textAlign="left"
            onClick={() => setExpanded((v) => !v)}
            _hover={{ color: 'gray.900' }}
          >
            <Text as="span" whiteSpace="pre-wrap">{expanded ? content : truncated}</Text>
            {content.length > 120 && (
              <Text as="span" ml="1" color="blue.500">{expanded ? 'less' : 'more'}</Text>
            )}
          </Box>
        ) : (
          <Text color="gray.400">—</Text>
        )}
      </Table.Cell>
    </Table.Row>
  );
}

function CronjobLogsPage() {
  const { job, logs } = Route.useLoaderData();

  return (
    <Container maxW="5xl" py="6" px="6">
      <HStack gap="3" mb="6">
        <Box asChild color="gray.500" fontSize="sm" _hover={{ color: 'gray.700' }}>
          <Link to="/cronjobs">← Automation</Link>
        </Box>
        <Heading size="xl">Logs — {job.name}</Heading>
      </HStack>

      {logs.length === 0 ? (
        <Flex justify="center" py="12">
          <Text color="gray.500">No logs yet. This job hasn't run yet.</Text>
        </Flex>
      ) : (
        <Box borderRadius="lg" borderWidth="1px" bg="white" shadow="sm" overflow="hidden">
          <Table.Root size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader fontWeight="medium" color="gray.600" whiteSpace="nowrap">Ran At</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Status</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Duration</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Result / Error</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {logs.map((log) => (
                <LogRow key={log.id} log={log as Log} />
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Container>
  );
}
