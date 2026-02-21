import { chat, maxIterations, toHttpResponse } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { createFileRoute } from '@tanstack/react-router';
import { getWeatherTool } from '@/tools';

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({
              error: 'OPENAI_API_KEY not configured',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        const { messages, conversationId } = await request.json();

        try {
          const stream = chat({
            adapter: openaiText('gpt-5.2'),
            messages,
            conversationId,
            agentLoopStrategy: maxIterations(10),
            systemPrompts: ['You are a helpful assistant.'],
            tools: [getWeatherTool],
          });

          return toHttpResponse(stream);
        } catch (error) {
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : 'An error occurred',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
      },
    },
  },
});
