import { createFileRoute } from '@tanstack/react-router';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-widget-api-key',
};

function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Export handleWidgetPoll as a named export for testability (used by Wave 0 tests)
export async function handleWidgetPoll(
  request: Request,
  jobId: string,
  configuredKey?: string,
): Promise<Response> {
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Only enforce API key if configuredKey is provided and non-empty
  if (configuredKey) {
    const apiKey = request.headers.get('x-widget-api-key');
    if (apiKey !== configuredKey) {
      return corsJson({ error: 'Unauthorized' }, 401);
    }
  }

  const WIDGET_GATEWAY_URL = process.env.WIDGET_GATEWAY_URL ?? 'http://localhost:3001';

  try {
    const gwRes = await fetch(`${WIDGET_GATEWAY_URL}/jobs/${jobId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await gwRes.json() as unknown;
    return corsJson(data, gwRes.ok ? 200 : gwRes.status);
  } catch {
    return corsJson({ error: 'Gateway unavailable' }, 503);
  }
}

export const Route = createFileRoute('/api/gateway/widget/$jobId')({
  component: () => null,
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },
      GET: async ({ request, params }) => {
        return handleWidgetPoll(
          request,
          params.jobId,
          process.env.WIDGET_API_KEY ?? '',
        );
      },
    },
  },
});
