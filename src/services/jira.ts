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
  const { summary, description, assignee, priority, labels } = params;

  const issueType = params.issueType ?? 'Task';

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
