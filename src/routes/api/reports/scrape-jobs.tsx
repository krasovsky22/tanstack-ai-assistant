import { createFileRoute } from '@tanstack/react-router';
import { chat, maxIterations, toHttpResponse } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';

export const Route = createFileRoute('/api/reports/scrape-jobs')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }

        const { messages } = await request.json();
        const url = messages?.[messages.length - 1]?.content ?? '';

        const { getMcpToolDefinitions } = await import('@/tools');
        const tools = await getMcpToolDefinitions();

        const stream = chat({
          adapter: openaiText('gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: `Navigate to this URL and extract all job listings: ${url}`,
            },
          ],
          agentLoopStrategy: maxIterations(15),
          systemPrompts: [
            `You are a job extraction assistant. Use playwright tools to navigate to the provided URL and extract ALL job listings visible on the page.

For each job listing, extract:
- title: the job title/position name
- company: the company/employer name
- link: the direct absolute URL to the full job posting (null if not available)
- description: the complete HTML content of the job description including all relevant details

Use playwright to:
1. Navigate to the URL
2. Wait for the page to load
3. Extract all job listings from the page

After extracting all jobs, respond with ONLY a valid JSON array in this exact format. Do NOT wrap in markdown code blocks. Do NOT add any explanation text before or after. Just output the raw JSON array:
[
  {
    "title": "Software Engineer",
    "company": "Acme Corp",
    "link": "https://example.com/jobs/123",
    "description": "<p>Full job description HTML here...</p>"
  }
]

If no jobs are found on the page, respond with just: []`,
          ],
          tools,
        });

        return toHttpResponse(stream);
      },
    },
  },
});
