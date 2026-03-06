import type { IncomingMessage, Provider } from './types.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export async function handleMessage(
  msg: IncomingMessage,
  provider: Provider,
): Promise<void> {
  console.log(`[${provider.name}] Received message:`, msg, APP_URL);

  type ContentPart =
    | { type: 'text'; content: string }
    | { type: 'image'; source: { type: 'data'; value: string }; metadata: { mimeType: string } };

  const messageContent: string | ContentPart[] =
    msg.images && msg.images.length > 0
      ? [
          ...(msg.text ? [{ type: 'text' as const, content: msg.text }] : []),
          ...msg.images.map((img) => ({
            type: 'image' as const,
            source: { type: 'data' as const, value: img.base64, mimeType: img.mimeType },
          })),
        ]
      : msg.text;

  const res = await fetch(`${APP_URL}/api/chat-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: messageContent }],
      title: `${provider.name}: ${msg.text.slice(0, 60)}`,
      source: provider.name,
      chatId: String(msg.chatId),
    }),
  });

  if (!res.ok) {
    throw new Error(
      `/api/chat-sync responded ${res.status}: ${await res.text()}`,
    );
  }

  const { text } = (await res.json()) as { text: string };
  await provider.send(msg.chatId, text);
}
