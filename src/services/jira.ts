// ── Config ─────────────────────────────────────────────────────────────────

import { json } from 'zod';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  defaultProject?: string | null;
}

export interface UserJiraSettings {
  jiraBaseUrl?: string | null;
  jiraEmail?: string | null;
  jiraPat?: string | null;
  jiraDefaultProject?: string | null;
}

export function getJiraConfig(
  settings?: UserJiraSettings | null,
): JiraConfig | null {
  const baseUrl = settings?.jiraBaseUrl?.replace(/\/$/, '');
  const email = settings?.jiraEmail;
  const token = settings?.jiraPat;
  if (!baseUrl || !email || !token) return null;
  return {
    baseUrl,
    email,
    token,
    defaultProject: settings?.jiraDefaultProject,
  };
}

export const JIRA_CONFIG_ERROR =
  'Jira is not configured. Ask the user to set up their Jira credentials in the Settings page.';

// ── HTTP helper ────────────────────────────────────────────────────────────

function adfToText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak' || node.type === 'rule') return '\n';
  const children = (node.content ?? []).map(adfToText).join('');
  if (
    [
      'paragraph',
      'heading',
      'listItem',
      'blockquote',
      'bulletList',
      'orderedList',
    ].includes(node.type)
  ) {
    return children + '\n';
  }
  return children;
}

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

export async function jiraFetch(
  { baseUrl, email, token }: JiraConfig,
  path: string,
  options?: RequestInit,
) {
  const url = `${baseUrl}/rest/api/3${path}`;
  const method = options?.method ?? 'GET';
  console.log(
    `[jira] ${method} ${url}`,
    options?.body ? JSON.parse(options.body as string) : '',
  );
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  console.log(
    `[jira] ${method} ${url} → ${res.status}`,
    JSON.stringify(res, null, 2),
  );
  return res;
}

// ── API methods ────────────────────────────────────────────────────────────

export interface SearchIssuesOptions {
  jql: string;
  maxResults?: number;
  nextPageToken?: string;
  fields?: string[];
  expand?: string;
  properties?: string[];
  fieldsByKeys?: boolean;
}

export async function searchIssues(
  config: JiraConfig,
  opts: SearchIssuesOptions,
) {
  const {
    jql,
    maxResults = 10,
    nextPageToken,
    fields = [
      'summary',
      'status',
      'assignee',
      'description',
      'priority',
      'issuetype',
      'created',
      'updated',
    ],
    expand,
    properties,
    fieldsByKeys,
  } = opts;

  const params = new URLSearchParams({ jql, maxResults: String(maxResults) });
  if (nextPageToken) params.set('nextPageToken', nextPageToken);
  if (fields.length) params.set('fields', fields.join(','));
  if (expand) params.set('expand', expand);
  if (properties?.length) params.set('properties', properties.join(','));
  if (fieldsByKeys !== undefined)
    params.set('fieldsByKeys', String(fieldsByKeys));

  const res = await jiraFetch(config, `/search/jql?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
  const data = await res.json();
  return {
    nextPageToken: data.nextPageToken ?? undefined,
    maxResults: data.maxResults,
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
  const f = data.fields;
  const comments = (f.comment?.comments ?? []).map((c: any) => ({
    id: c.id,
    author: c.author?.displayName ?? c.author?.name ?? null,
    created: c.created,
    body: adfToText(c.body).trim(),
  }));
  return {
    key: data.key,
    id: data.id,
    summary: f.summary,
    status: f.status?.name ?? null,
    assignee: f.assignee?.displayName ?? f.assignee?.name ?? null,
    priority: f.priority?.name ?? null,
    issueType: f.issuetype?.name ?? null,
    created: f.created,
    updated: f.updated,
    description: adfToText(f.description).trim(),
    comments,
  };
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
      author: c.author?.displayName ?? c.author?.name ?? null,
      body: adfToText(c.body).trim(),
      created: c.created,
    })),
  };
}

export async function findUserByEmail(
  config: JiraConfig,
  email: string,
): Promise<string | null> {
  const params = new URLSearchParams({ query: email });
  const res = await jiraFetch(config, `/user/search?${params.toString()}`);
  if (!res.ok) return null;
  const users: any[] = await res.json().catch(() => []);
  const match = users.find(
    (u) => u.emailAddress?.toLowerCase() === email.toLowerCase(),
  );
  return match?.accountId ?? users[0]?.accountId ?? null;
}

export async function assignIssue(
  config: JiraConfig,
  issueKey: string,
  email: string | null,
) {
  let body: Record<string, unknown>;
  if (email === null) {
    body = { accountId: null };
  } else {
    const accountId = await findUserByEmail(config, email);
    if (!accountId) {
      throw new Error(`No Jira user found with email: ${email}`);
    }
    body = { accountId };
  }
  const res = await jiraFetch(config, `/issue/${issueKey}/assignee`, {
    method: 'PUT',
    body: JSON.stringify(body),
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

export async function getTransitions(config: JiraConfig, issueKey: string) {
  const res = await jiraFetch(config, `/issue/${issueKey}/transitions`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
  const data = await res.json();
  return (data.transitions ?? []) as Array<{
    id: string;
    name: string;
    to: { name: string };
  }>;
}

export async function transitionIssue(
  config: JiraConfig,
  issueKey: string,
  transitionId: string,
) {
  const res = await jiraFetch(config, `/issue/${issueKey}/transitions`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
}

export async function getIssueTypes(config: JiraConfig) {
  const res = await jiraFetch(config, '/issuetype');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
  const data: any[] = await res.json();
  return data.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    subtask: t.subtask ?? false,
  }));
}

export async function getPriorities(config: JiraConfig) {
  const res = await jiraFetch(config, '/priority');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        `Jira returned status ${res.status}`,
    );
  }
  const data: any[] = await res.json();
  return data.map((p) => ({ id: p.id, name: p.name, description: p.description ?? null }));
}

export async function createIssue(
  config: JiraConfig,
  params: CreateIssueParams,
) {
  const { summary, description, assignee, priority, labels } = params;

  const issueType = params.issueType ?? 'Task';
  const projectKey = params.projectKey || config.defaultProject;
  if (!projectKey) {
    throw new Error(
      'No project key provided and no default project configured in Jira settings.',
    );
  }

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    issuetype: { name: issueType },
    summary,
    assignee: { accountId: null },
  };

  if (description !== undefined) fields.description = toAdf(description);
  if (assignee && assignee.toLowerCase() !== 'unassigned') {
    const accountId = await findUserByEmail(config, assignee);
    if (accountId) fields.assignee = { accountId };
  }
  if (priority !== undefined) fields.priority = { name: priority };
  if (labels !== undefined) fields.labels = labels;

  const res = await jiraFetch(config, '/issue', {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.log(`[jira] failed tocreateIssue response:`, err);
    throw new Error(
      (err.errorMessages ?? []).join('; ') ||
        JSON.stringify(err.errors ?? {}) ||
        `Jira returned status ${res.status}`,
    );
  }
  const data = await res.json();
  return { key: data.key, id: data.id, self: data.self };
}
