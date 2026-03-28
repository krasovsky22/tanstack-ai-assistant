import { join } from 'path';
import type { IncomingMessage, Provider } from './types.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const GENERATED_DIR = 'files/generated';

// Extract generated file paths from LLM response text
// Matches URLs like /api/files/report.csv
function extractGeneratedFiles(
  text: string,
): { filename: string; filePath: string }[] {
  const pattern = /\/api\/files\/([a-zA-Z0-9._-]+)/g;
  const files: { filename: string; filePath: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const filename = decodeURIComponent(match[1]);
    files.push({ filename, filePath: join(GENERATED_DIR, filename) });
  }
  return files;
}

export async function handleMessage(
  msg: IncomingMessage,
  provider: Provider,
): Promise<void> {
  console.log(`[${provider.name}] Received message:`, msg, APP_URL);

  const chatIdStr = String(msg.chatId);

  // Strip leading @botname mention so "/link CODE" works in group chats
  // e.g. "@mybot /link F68F51" → "/link F68F51"
  const normalizedText = (msg.text ?? '').trim().replace(/^@\S+\s*/, '');

  // 1. Link intercept — must happen before any LLM call
  const LINK_PATTERN = /^\/link\s+([A-Z0-9]{6})\s*$/i;
  const linkMatch = normalizedText.match(LINK_PATTERN);

  console.log(`[${provider.name}] Link match:`, linkMatch, msg.text);
  if (linkMatch) {
    const res = await fetch(`${APP_URL}/api/gateway-link`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: linkMatch[1].toUpperCase(),
        provider: provider.name,
        chatId: chatIdStr,
      }),
    });
    const { message } = (await res.json()) as { message: string };

    console.log(`[${provider.name}] Link response:`, message);
    await provider.send(msg.chatId, message);
    return;
  }

  // 2. Identity resolve — block unlinked users
  const resolveRes = await fetch(
    `${APP_URL}/api/gateway-identities?provider=${encodeURIComponent(provider.name)}&chatId=${encodeURIComponent(chatIdStr)}`,
  );
  const { userId } = (await resolveRes.json()) as { userId: string | null };

  // Upsert remote chat (fire-and-forget, happens even if userId is null)
  fetch(`${APP_URL}/api/remote-chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: chatIdStr,
      provider: provider.name,
      name: msg.name ?? chatIdStr,
      metadata: msg.rawChat ?? {},
      userId,
    }),
  }).catch((err) => console.error('[gateway] Failed to upsert remote chat:', err));

  if (!userId) {
    await provider.send(
      msg.chatId,
      'Your Telegram account is not linked to an account.\n\nGo to Settings \u2192 Gateway Identities, generate a linking code, then send:\n/link YOURCODE',
    );
    return;
  }

  // 3. Build message content (existing logic — unchanged)
  type ContentPart =
    | { type: 'text'; content: string }
    | {
        type: 'image';
        source: { type: 'data'; value: string; mimeType: string };
      };

  const messageContent: string | ContentPart[] =
    msg.images && msg.images.length > 0
      ? [
          ...(msg.text ? [{ type: 'text' as const, content: msg.text }] : []),
          ...msg.images.map((img) => ({
            type: 'image' as const,
            source: {
              type: 'data' as const,
              value: img.base64,
              mimeType: img.mimeType,
            },
          })),
        ]
      : msg.text;

  // 4. Dispatch to chat-sync with resolved userId
  const res = await fetch(`${APP_URL}/api/chat-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: messageContent }],
      title: `${provider.name}: ${msg.text.slice(0, 60)}`,
      source: provider.name,
      chatId: chatIdStr,
      userId,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `/api/chat-sync responded ${res.status}: ${await res.text()}`,
    );
  }

  const { text } = (await res.json()) as { text: string };
  await provider.send(msg.chatId, text);

  // 5. Send generated files (existing logic — unchanged)
  if (provider.sendFile) {
    const files = extractGeneratedFiles(text);
    for (const file of files) {
      await provider
        .sendFile(msg.chatId, file.filePath, file.filename)
        .catch((err) =>
          console.error(
            `[${provider.name}] Failed to send file ${file.filename}:`,
            err,
          ),
        );
    }
  }
}
