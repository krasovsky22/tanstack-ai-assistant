import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
import {
  getJiraConfig,
  JIRA_CONFIG_ERROR,
  searchIssues,
  getIssue,
  updateIssueDescription,
  addComment,
  getComments,
  assignIssue,
  createIssue,
} from '@/services/jira';
import { indexJiraTicket } from '@/services/memory';

function cfg() {
  const config = getJiraConfig();
  if (!config) return { config: null, error: JIRA_CONFIG_ERROR } as const;
  return { config, error: null } as const;
}

function indexIssueFields(
  key: string,
  id: string,
  fields: Record<string, any>,
) {
  indexJiraTicket({
    ticketKey: key,
    ticketId: id,
    summary: fields.summary ?? '',
    description: extractDescriptionText(fields.description),
    status: fields.status?.name,
    assignee: fields.assignee?.displayName ?? fields.assignee?.name,
    issueType: fields.issuetype?.name,
    priority: fields.priority?.name,
    createdAt: fields.created,
    updatedAt: fields.updated,
  });
}

function extractDescriptionText(description: unknown): string {
  if (!description) return '';
  if (typeof description === 'string') return description;
  // ADF format: extract text nodes recursively
  if (typeof description === 'object') {
    const adf = description as Record<string, unknown>;
    const content = adf.content as unknown[] | undefined;
    if (!content) return '';
    return content
      .flatMap((block: any) => block?.content ?? [])
      .filter((node: any) => node?.type === 'text')
      .map((node: any) => node.text ?? '')
      .join(' ');
  }
  return '';
}

export function getJiraTools() {
  return [
    toolDefinition({
      name: 'jira_search',
      description:
        'Search Jira issues using JQL (Jira Query Language). Returns a list of matching issues with cursor-based pagination via nextPageToken.',
      inputSchema: z.object({
        jql: z
          .string()
          .describe(
            'JQL query string, e.g. "project = PROJ AND status = Open"',
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(5000)
          .optional()
          .default(10)
          .describe('Maximum number of results to return (1–5000, default 10)'),
        nextPageToken: z
          .string()
          .nullish()
          .describe(
            'Cursor token for the next page of results, obtained from a previous search response',
          ),
        fields: z
          .array(z.string())
          .optional()
          .describe(
            'List of field IDs to return for each issue. Defaults to summary, status, assignee, description, priority, issuetype, created, updated.',
          ),
        expand: z
          .string()
          .nullish()
          .describe(
            'Comma-separated list of additional information to expand, e.g. "renderedFields,names,changelog"',
          ),
        properties: z
          .array(z.string())
          .optional()
          .describe('List of issue property keys to include in the response'),
        fieldsByKeys: z
          .boolean()
          .optional()
          .describe(
            'When true, fields are referenced by their key instead of ID',
          ),
      }),
    }).server(
      async ({
        jql,
        maxResults,
        nextPageToken,
        fields,
        expand,
        properties,
        fieldsByKeys,
      }) => {
        const { config, error } = cfg();
        if (!config) return { success: false, error };
        try {
          const result = await searchIssues(config, {
            jql,
            maxResults,
            nextPageToken: nextPageToken ?? undefined,
            fields,
            expand: expand ?? undefined,
            properties,
            fieldsByKeys,
          });
          for (const issue of result.issues ?? []) {
            indexIssueFields(issue.key, issue.id, issue.fields ?? {});
          }
          return result;
        } catch (err: any) {
          return { success: false, error: err.message ?? 'Unknown error' };
        }
      },
    ),

    toolDefinition({
      name: 'jira_get_issue',
      description:
        'Retrieve a single Jira issue by its key, including its summary, status, assignee, description, and comments.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
      }),
    }).server(async ({ issueKey }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        const result = await getIssue(config, issueKey);
        indexIssueFields(result.key, result.id, result.fields ?? {});
        return result;
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_update_description',
      description: 'Update the description of a Jira issue with plain text.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
        description: z
          .string()
          .describe('New plain-text description for the issue'),
      }),
    }).server(async ({ issueKey, description }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        await updateIssueDescription(config, issueKey, description);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_add_comment',
      description: 'Add a plain-text comment to a Jira issue.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
        comment: z.string().describe('Comment text to add'),
      }),
    }).server(async ({ issueKey, comment }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        return await addComment(config, issueKey, comment);
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_get_comments',
      description: 'Retrieve all comments for a Jira issue.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
      }),
    }).server(async ({ issueKey }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        return await getComments(config, issueKey);
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_assign_issue',
      description:
        'Assign a Jira issue to a user by their Jira username. Use the string "null" to unassign.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
        username: z
          .string()
          .describe(
            'Jira username (name field) to assign. Use null string "null" to unassign.',
          ),
      }),
    }).server(async ({ issueKey, username }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        await assignIssue(
          config,
          issueKey,
          username === 'null' ? null : username,
        );
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_create_issue',
      description:
        'Create a new Jira issue. projectKey defaults to JIRA_DEFAULT_PROJECT if not provided. You must determine the appropriate issueType (e.g. "Bug", "Task", "Story") from the context before calling this tool.',
      inputSchema: z.object({
        summary: z
          .string()
          .default('Placeholder Summary')
          .describe('Short summary / title of the issue'),
        projectKey: z
          .string()
          .optional()
          .default(process.env.JIRA_DEFAULT_PROJECT ?? '')
          .describe(
            'Jira project key, e.g. PROJ. Omit to use the configured default project.',
          ),
        issueType: z
          .string()
          .optional()
          .default('Bug')
          .describe(
            'Issue type name, e.g. "Bug", "Task", "Story". Omit to let AI infer it from context.',
          ),
        description: z
          .string()
          .optional()
          .default('Placeholder')
          .describe('Optional plain-text description for the issue'),
        assignee: z
          .string()
          .optional()
          .default('')
          .describe('Optional Jira username to assign the issue to'),
        priority: z
          .string()
          .optional()
          .default('Medium')
          .describe('Optional priority name, e.g. "High", "Medium", "Low"'),
        labels: z
          .array(z.string())
          .optional()
          .default([])
          .describe('Optional list of label strings to attach'),
      }),
    }).server(
      async ({
        summary,
        projectKey,
        issueType,
        description,
        assignee,
        priority,
        labels,
      }) => {
        const { config, error } = cfg();
        if (!config) return { success: false, error };

        const resolvedProjectKey =
          projectKey ?? process.env.JIRA_DEFAULT_PROJECT;
        if (!resolvedProjectKey) {
          return {
            success: false,
            error:
              'No project key provided and JIRA_DEFAULT_PROJECT is not configured.',
          };
        }

        try {
          const result = await createIssue(config, {
            projectKey: resolvedProjectKey,
            issueType,
            summary: summary ?? 'Placeholder Summary',
            description,
            assignee,
            priority,
            labels,
          });
          indexJiraTicket({
            ticketKey: result.key,
            ticketId: result.id,
            summary: summary ?? 'Placeholder Summary',
            description,
            issueType,
            assignee,
            priority,
            projectKey: resolvedProjectKey,
          });
          return { success: true, ...result };
        } catch (err: any) {
          return {
            success: false,
            error: err?.error ?? err.message ?? 'Unknown error',
          };
        }
      },
    ),
  ];
}
