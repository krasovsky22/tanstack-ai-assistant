import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

function jiraFetch(
  baseUrl: string,
  token: string,
  path: string,
  options?: RequestInit,
) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/api/2${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

export function getJiraTools() {
  return [
    toolDefinition({
      name: 'jira_search',
      description:
        'Search Jira issues using JQL (Jira Query Language). Returns a list of matching issues.',
      inputSchema: z.object({
        jql: z.string().describe('JQL query string, e.g. "project = PROJ AND status = Open"'),
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
      const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
      const token = process.env.JIRA_PAT;
      if (!baseUrl || !token) {
        return {
          success: false,
          error:
            'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.',
        };
      }

      try {
        const params = new URLSearchParams({
          jql,
          maxResults: String(maxResults),
          startAt: String(startAt),
          fields: 'summary,status,assignee,description,priority,issuetype,created,updated',
        });
        const res = await jiraFetch(baseUrl, token, `/search?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            success: false,
            error:
              (err.errorMessages ?? []).join('; ') ||
              `Jira returned status ${res.status}`,
          };
        }
        const data = await res.json();
        return {
          total: data.total,
          maxResults: data.maxResults,
          startAt: data.startAt,
          issues: (data.issues ?? []).map((i: any) => ({
            key: i.key,
            id: i.id,
            fields: i.fields,
          })),
        };
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
      const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
      const token = process.env.JIRA_PAT;
      if (!baseUrl || !token) {
        return {
          success: false,
          error:
            'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.',
        };
      }

      try {
        const params = new URLSearchParams({
          fields:
            'summary,status,assignee,description,priority,issuetype,created,updated,comment',
        });
        const res = await jiraFetch(
          baseUrl,
          token,
          `/issue/${issueKey}?${params.toString()}`,
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            success: false,
            error:
              (err.errorMessages ?? []).join('; ') ||
              `Jira returned status ${res.status}`,
          };
        }
        const data = await res.json();
        return { key: data.key, id: data.id, fields: data.fields };
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
      const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
      const token = process.env.JIRA_PAT;
      if (!baseUrl || !token) {
        return {
          success: false,
          error:
            'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.',
        };
      }

      try {
        const res = await jiraFetch(baseUrl, token, `/issue/${issueKey}`, {
          method: 'PUT',
          body: JSON.stringify({ fields: { description } }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            success: false,
            error:
              (err.errorMessages ?? []).join('; ') ||
              `Jira returned status ${res.status}`,
          };
        }
        // 204 No Content — do NOT call .json()
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
      const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
      const token = process.env.JIRA_PAT;
      if (!baseUrl || !token) {
        return {
          success: false,
          error:
            'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.',
        };
      }

      try {
        const res = await jiraFetch(
          baseUrl,
          token,
          `/issue/${issueKey}/comment`,
          {
            method: 'POST',
            body: JSON.stringify({ body: comment }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            success: false,
            error:
              (err.errorMessages ?? []).join('; ') ||
              `Jira returned status ${res.status}`,
          };
        }
        // 201 Created — response body contains the created comment
        return await res.json();
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
      const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
      const token = process.env.JIRA_PAT;
      if (!baseUrl || !token) {
        return {
          success: false,
          error:
            'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.',
        };
      }

      try {
        const res = await jiraFetch(
          baseUrl,
          token,
          `/issue/${issueKey}/comment`,
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            success: false,
            error:
              (err.errorMessages ?? []).join('; ') ||
              `Jira returned status ${res.status}`,
          };
        }
        const data = await res.json();
        return {
          issueKey,
          comments: (data.comments ?? []).map((c: any) => ({
            id: c.id,
            author: c.author?.displayName ?? c.author?.name,
            body: c.body,
            created: c.created,
          })),
        };
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
      const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
      const token = process.env.JIRA_PAT;
      if (!baseUrl || !token) {
        return {
          success: false,
          error:
            'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.',
        };
      }

      try {
        const res = await jiraFetch(
          baseUrl,
          token,
          `/issue/${issueKey}/assignee`,
          {
            method: 'PUT',
            body: JSON.stringify({ name: username === 'null' ? null : username }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            success: false,
            error:
              (err.errorMessages ?? []).join('; ') ||
              `Jira returned status ${res.status}`,
          };
        }
        // 204 No Content — do NOT call .json()
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Unknown error' };
      }
    }),
  ];
}
