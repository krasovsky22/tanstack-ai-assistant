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
  getTransitions,
  transitionIssue,
  getPriorities,
  getIssueTypes,
  type UserJiraSettings,
} from '@/services/jira';

export function getJiraTools(settings?: UserJiraSettings | null) {
  function cfg() {
    const config = getJiraConfig(settings);
    if (!config) return { config: null, error: JIRA_CONFIG_ERROR } as const;
    return { config, error: null } as const;
  }

  const { config } = cfg();
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
          return result;
        } catch (err: any) {
          return { success: false, error: err.message ?? 'Unknown error' };
        }
      },
    ),

    toolDefinition({
      name: 'jira_get_issue',
      description:
        'Retrieve a single Jira issue by its key. Returns full ticket context: summary, status, assignee, priority, issue type, plain-text description, and all comments (author, timestamp, plain-text body). Use this to get complete context before acting on a ticket.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
      }),
    }).server(async ({ issueKey }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        const result = await getIssue(config, issueKey);
        return result;
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_update_description',
      description: 'Update the description of a Jira issue. The description is rendered as markdown in Jira.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
        description: z
          .string()
          .describe('Markdown-formatted description for the issue. Use ## headings, - bullet lists, **bold**, etc.'),
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
        'Assign a Jira issue to a user by their email address. Defaults to the configured JIRA_EMAIL when no email is specified. Use the string "null" to unassign.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
        email: z
          .string()
          .nullish()
          .describe(
            'Email address of the user to assign. Omit or pass null to assign to the default user (configured JIRA email). Use "unassign" to remove assignee.',
          ),
      }),
    }).server(async ({ issueKey, email }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      const resolvedEmail = email ?? settings?.jiraEmail ?? null;
      try {
        await assignIssue(config, issueKey, resolvedEmail);
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
          .default(config?.defaultProject ?? '')
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
          .describe('Markdown-formatted description for the issue. Use ## headings, - bullet lists, **bold**, etc. Do NOT use Jira wiki markup (h2., {code}, etc.).'),
        assignee: z
          .string()
          .optional()
          .describe(
            'Email address of the user to assign the issue to. Defaults to configured JIRA email when omitted.',
          ),
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

        const resolvedProjectKey = projectKey ?? config?.defaultProject;
        console.log('[create_issue] resolved project key:', resolvedProjectKey);
        if (!resolvedProjectKey) {
          return {
            success: false,
            error:
              'No project key provided and no default project is configured in user settings.',
          };
        }

        try {
          const resolvedAssignee = assignee || undefined;
          const result = await createIssue(config, {
            projectKey: resolvedProjectKey,
            issueType,
            summary: summary ?? 'Placeholder Summary',
            description,
            assignee: resolvedAssignee,
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
    toolDefinition({
      name: 'jira_get_issue_types',
      description:
        'Fetch the list of available issue types from Jira (e.g. "Bug", "Task", "Story", "Epic"). Call this before creating an issue to obtain valid issue type names.',
      inputSchema: z.object({}),
    }).server(async () => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        const issueTypes = await getIssueTypes(config);
        return { issueTypes };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_get_priorities',
      description:
        'Fetch the list of available issue priorities from Jira (e.g. "Highest", "High", "Medium", "Low", "Lowest"). Call this before creating an issue to obtain valid priority names.',
      inputSchema: z.object({}),
    }).server(async () => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        const priorities = await getPriorities(config);
        return { priorities };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),

    toolDefinition({
      name: 'jira_transition_issue',
      description:
        'Change the status of a Jira issue (e.g. move to "In Progress", "Done", "To Do"). Fetches available transitions and applies the one whose name best matches the requested status.',
      inputSchema: z.object({
        issueKey: z.string().describe('Jira issue key, e.g. PROJ-123'),
        status: z
          .string()
          .describe(
            'Target status name, e.g. "Done", "In Progress", "To Do". Case-insensitive.',
          ),
      }),
    }).server(async ({ issueKey, status }) => {
      const { config, error } = cfg();
      if (!config) return { success: false, error };
      try {
        const transitions = await getTransitions(config, issueKey);
        const target = transitions.find(
          (t) => t.name.toLowerCase() === status.toLowerCase(),
        );
        if (!target) {
          return {
            success: false,
            error: `No transition named "${status}" found. Available: ${transitions.map((t) => t.name).join(', ')}`,
          };
        }
        await transitionIssue(config, issueKey, target.id);
        return { success: true, transitionedTo: target.to.name };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),
  ];
}
