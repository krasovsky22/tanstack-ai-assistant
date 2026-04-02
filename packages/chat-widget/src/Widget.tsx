import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { injectStyles } from './styles';

interface WidgetProps {
  endpoint: string;
  apiKey: string;
  username?: string;
}

export function Widget({ endpoint, apiKey, username }: WidgetProps) {
  injectStyles();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <ChatPanel endpoint={endpoint} apiKey={apiKey} username={username} onClose={() => setOpen(false)} />
      )}
      <button
        className="cw-button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
