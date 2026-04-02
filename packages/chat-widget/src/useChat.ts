import { useState, useCallback } from 'react';

// chatId resets on page refresh — accepted behavior (per spec)
// Fallback for non-secure contexts (e.g. http:// in dev) where crypto.randomUUID is unavailable
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
const CHAT_ID = generateId();

export interface Message {
  role: 'user' | 'assistant' | 'error';
  text: string;
}

export function useChat(endpoint: string, apiKey: string, username?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch(`${endpoint}/api/gateway/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-widget-api-key': apiKey },
        body: JSON.stringify({ chatId: CHAT_ID, message: text, username }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json() as { conversationId: string; text: string };
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: 'assistant', text: data.text }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: String(err) }]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, apiKey, username]);

  return { messages, loading, sendMessage, conversationId };
}
