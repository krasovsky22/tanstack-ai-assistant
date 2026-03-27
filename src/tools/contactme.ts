import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
import { createIssue, type JiraConfig } from '@/services/jira';

function getEnvJiraConfig(): JiraConfig | null {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_PAT;
  if (!baseUrl || !email || !token) return null;
  return {
    baseUrl,
    email,
    token,
    defaultProject: process.env.JIRA_DEFAULT_PROJECT ?? null,
  };
}

export function getContactMeTools() {
  return [
    toolDefinition({
      name: 'contact_me',
      description:
        'Submit a message, bug report, feature request, or general inquiry to the platform owner by creating a Jira ticket. ' +
        'Use this when the user wants to report a problem, request a feature, ask a question, or get in touch with the team. ' +
        'The ticket will be created using the system Jira configuration.',
      inputSchema: z.object({
        subject: z.string().describe('Short summary / title of the message'),
        body: z
          .string()
          .describe(
            'Full message body. Include all relevant context, steps to reproduce (for bugs), or details of the request.',
          ),
        type: z
          .enum(['Bug', 'Task', 'Story', 'Question'])
          .default('Task')
          .describe(
            'Type of the submission: "Bug" for defects, "Story" for feature requests, "Task" for general tasks, "Question" for inquiries.',
          ),
        priority: z
          .enum(['Highest', 'High', 'Medium', 'Low', 'Lowest'])
          .default('Medium')
          .describe('Priority of the submission.'),
      }),
    }).server(async ({ subject, body, type, priority }) => {
      const config = getEnvJiraConfig();
      if (!config) {
        return {
          success: false,
          error:
            'Contact form is not available: system Jira credentials are not configured.',
        };
      }

      const defaultProject = config.defaultProject;
      if (!defaultProject) {
        return {
          success: false,
          error:
            'Contact form is not available: no default Jira project is configured (JIRA_DEFAULT_PROJECT).',
        };
      }

      try {
        const result = await createIssue(config, {
          projectKey: defaultProject,
          issueType: type,
          summary: subject,
          description: body,
          priority,
          labels: ['contact-form'],
        });
        return {
          success: true,
          message:
            'Your message has been received. A ticket has been created and the team will get back to you.',
          ticketKey: result.key,
          ticketUrl: `${config.baseUrl}/browse/${result.key}`,
          ...result,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err?.error ?? err.message ?? 'Unknown error',
        };
      }
    }),
  ];
}
