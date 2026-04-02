import { useState, useRef, useEffect } from 'react';
import { useChat } from './useChat';

interface ChatPanelProps {
  endpoint: string;
  apiKey: string;
  onClose: () => void;
}

export function ChatPanel({ endpoint, apiKey, onClose }: ChatPanelProps) {
  const { messages, loading, sendMessage } = useChat(endpoint, apiKey);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    void sendMessage(text);
  }

  return (
    <div className="cw-panel">
      <div className="cw-header">
        <span>Chat</span>
        <button className="cw-close" onClick={onClose} aria-label="Close chat">×</button>
      </div>
      <div className="cw-messages">
        {messages.map((m, i) => (
          <div key={i} className={`cw-msg cw-msg-${m.role}`}>{m.text}</div>
        ))}
        {loading && <div className="cw-msg cw-msg-assistant">…</div>}
        <div ref={messagesEndRef} />
      </div>
      <form className="cw-input-row" onSubmit={handleSubmit}>
        <input
          className="cw-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={loading}
        />
        <button className="cw-send" type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
