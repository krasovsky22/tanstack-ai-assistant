import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';

// ── Config ─────────────────────────────────────────────────────────────────

export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
}

export function getJiraConfig(): JiraConfig | null {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_PAT;
  if (!baseUrl || !email || !token) return null;
  return { baseUrl, email, token };
}

export const JIRA_CONFIG_ERROR =
  'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.';

// ── HTTP helper ────────────────────────────────────────────────────────────

function toAdf(text: string) {
  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

export function jiraFetch(
  { baseUrl, email, token }: JiraConfig,
  path: string,
  options?: RequestInit,
) {
  const url = `${baseUrl}/rest/api/3${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

// ── Issue type inference ───────────────────────────────────────────────────

async function getProjectIssueTypes(
  config: JiraConfig,
  projectKey: string,
): Promise<string[]> {
  const res = await jiraFetch(config, `/project/${projectKey}`);
  if (!res.ok) return ['Bug', 'Task', 'Story', 'Improvement', 'Epic'];
  const data = await res.json();
  return (data.issueTypes ?? []).map((t: { name: string }) => t.name);
}

export async function inferIssueType(
  config: JiraConfig,
  projectKey: string,
  summary: string,
  description?: string,
): Promise<string> {
  const types = await getProjectIssueTypes(config, projectKey);

  const result = await chat({
    adapter: openaiText('gpt-4o-mini'),
    messages: [
      {
        role: 'user',
        content: `You are a Jira project manager. Given the following issue details, select the most appropriate issue type from the available list. Reply with ONLY the issue type name, nothing else.

Available issue types: ${types.join(', ')}

Summary: ${summary}
${description ? `Description: ${description}` : ''}`,
      },
    ],
  });

  const inferred = result.text?.trim() ?? '';
  return types.includes(inferred) ? inferred : (types[0] ?? 'Task');
}

// ── API methods ────────────────────────────────────────────────────────────

export async function searchIssues(
  config: JiraConfig,
  jql: string,
  maxResults: number,
  startAt: number,
) {
  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    startAt: String(startAt),
    fields:
      'summary,status,assignee,description,priority,issuetype,created,updated',
  });
  const res = await jiraFetch(config, `/search?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
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
}

export async function getIssue(config: JiraConfig, issueKey: string) {
  const params = new URLSearchParams({
    fields:
      'summary,status,assignee,description,priority,issuetype,created,updated,comment',
  });
  const res = await jiraFetch(
    config,
    `/issue/${issueKey}?${params.toString()}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
  const data = await res.json();
  return { key: data.key, id: data.id, fields: data.fields };
}

export async function updateIssueDescription(
  config: JiraConfig,
  issueKey: string,
  description: string,
) {
  const res = await jiraFetch(config, `/issue/${issueKey}`, {
    method: 'PUT',
    body: JSON.stringify({ fields: { description: toAdf(description) } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
}

export async function addComment(
  config: JiraConfig,
  issueKey: string,
  comment: string,
) {
  const res = await jiraFetch(config, `/issue/${issueKey}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body: toAdf(comment) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
  return res.json();
}

export async function getComments(config: JiraConfig, issueKey: string) {
  const res = await jiraFetch(config, `/issue/${issueKey}/comment`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
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
}

export async function assignIssue(
  config: JiraConfig,
  issueKey: string,
  username: string | null,
) {
  const res = await jiraFetch(config, `/issue/${issueKey}/assignee`, {
    method: 'PUT',
    body: JSON.stringify({ name: username }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
}

export interface CreateIssueParams {
  projectKey: string;
  issueType?: string;
  summary: string;
  description?: string;
  assignee?: string;
  priority?: string;
  labels?: string[];
}

export async function createIssue(
  config: JiraConfig,
  params: CreateIssueParams,
) {
  const { projectKey, summary, description, assignee, priority, labels } =
    params;

  const issueType =
    params.issueType ??
    (await inferIssueType(config, projectKey, summary, description));

  const fields: Record<string, unknown> = {
    project: { id: 10001 },
    issuetype: { name: issueType },
    summary,
  };

  if (description !== undefined) fields.description = toAdf(description);
  if (assignee !== undefined) fields.assignee = { name: assignee };
  if (priority !== undefined) fields.priority = { name: priority };
  if (labels !== undefined) fields.labels = labels;

  console.log(
    'Creating Jira issue with fields:',
    JSON.stringify({ fields }, null, 2),
  );

  const res = await jiraFetch(config, '/issue', {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Failed to create Jira issue:', err);
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        JSON.stringify(err.errors ?? {}) ||
        `Jira returned status ${res.status}`,
    );
  }
  const data = await res.json();
  return { key: data.key, id: data.id, self: data.self };
}
