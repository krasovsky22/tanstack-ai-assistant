import type { IncomingMessage, Provider } from './types.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export async function handleMessage(
  msg: IncomingMessage,
  provider: Provider,
): Promise<void> {
  console.log(`[${provider.name}] Received message:`, msg, APP_URL);
  const res = await fetch(`${APP_URL}/api/chat-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: msg.text }],
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
