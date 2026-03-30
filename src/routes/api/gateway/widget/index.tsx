import { createFileRoute } from '@tanstack/react-router';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-widget-api-key',
};

function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Export handleWidgetPost as a named export for testability (used by Wave 0 tests)
export async function handleWidgetPost(request: Request, configuredKey: string): Promise<Response> {
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const apiKey = request.headers.get('x-widget-api-key');
  if (!configuredKey || apiKey !== configuredKey) {
    return corsJson({ error: 'Unauthorized' }, 401);
  }

  let body: { chatId?: string; message?: string };
  try {
    body = await request.json() as { chatId?: string; message?: string };
  } catch {
    return corsJson({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.chatId || !body.message) {
    return corsJson({ error: 'Missing chatId or message' }, 400);
  }

  const jobId = crypto.randomUUID();
  const WIDGET_GATEWAY_URL = process.env.WIDGET_GATEWAY_URL ?? 'http://localhost:3001';

  try {
    const res = await fetch(`${WIDGET_GATEWAY_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, chatId: body.chatId, message: body.message }),
    });
    if (!res.ok) {
      return corsJson({ error: 'Gateway error' }, 502);
    }
  } catch {
    return corsJson({ error: 'Gateway unavailable' }, 503);
  }

  return corsJson({ jobId });
}

export const Route = createFileRoute('/api/gateway/widget/')({
  component: () => null,
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        return handleWidgetPost(request, process.env.WIDGET_API_KEY ?? '');
      },
      POST: async ({ request }) => {
        return handleWidgetPost(request, process.env.WIDGET_API_KEY ?? '');
      },
    },
  },
});
