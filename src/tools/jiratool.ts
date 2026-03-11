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

function cfg() {
  const config = getJiraConfig();
  if (!config) return { config: null, error: JIRA_CONFIG_ERROR } as const;
  return { config, error: null } as const;
}

export function getJiraTools() {
  return [
    toolDefinition({
      name: 'jira_search',
      description:
        'Search Jira issues using JQL (Jira Query Language). Returns a list of matching issues.',
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
          .max(50)
          .optional()
          .default(10)
          .describe('Maximum number of results to return (1–50, default 10)'),
        startAt: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe('Index of the first result to return (for pagination)'),
      }),
    }).server(async ({ jql, maxResults, startAt }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        return await searchIssues(config, jql, maxResults ?? 10, startAt ?? 0);
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

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
        return await getIssue(config, issueKey);
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
        'Create a new Jira issue. projectKey defaults to JIRA_DEFAULT_PROJECT if not provided. issueType is inferred by AI from the summary/description if not provided.',
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
