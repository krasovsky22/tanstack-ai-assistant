import { useState, useCallback } from 'react';

// chatId resets on page refresh — accepted behavior (per spec)
const CHAT_ID = crypto.randomUUID();
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

export interface Message {
  role: 'user' | 'assistant' | 'error';
  text: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function submitAndPoll(
  endpoint: string,
  apiKey: string,
  message: string,
): Promise<string> {
  const res = await fetch(`${endpoint}/api/gateway/widget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-widget-api-key': apiKey },
    body: JSON.stringify({ chatId: CHAT_ID, message }),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  const { jobId } = await res.json() as { jobId: string };

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const poll = await fetch(`${endpoint}/api/gateway/widget/${jobId}`, {
      headers: { 'x-widget-api-key': apiKey },
    });
    if (!poll.ok) throw new Error(`Poll failed: ${poll.status}`);
    const data = await poll.json() as { status: string; text?: string; error?: string };
    if (data.status === 'done') return data.text ?? '';
    if (data.status === 'error') throw new Error(data.error ?? 'Unknown error');
    // status === 'pending' — continue polling
  }
  throw new Error('Response timeout after 60s');
}

export function useChat(endpoint: string, apiKey: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const reply = await submitAndPoll(endpoint, apiKey, text);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: String(err) }]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, apiKey]);

  return { messages, loading, sendMessage };
}
