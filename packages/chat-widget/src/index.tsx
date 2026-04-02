import { createRoot } from 'react-dom/client';
import { Widget } from './Widget';

// Widget bundle size: ~150KB gzip (React 19 + widget code)
// chatId is generated on init and stored in JS memory — resets on page refresh (by design)
// Requires modern browsers: Chrome 92+, Firefox 95+, Safari 15.4+ (crypto.randomUUID)

interface ChatWidgetConfig {
  endpoint: string;
  apiKey: string;
  username?: string;
}

declare global {
  interface Window {
    ChatWidget: { init: (config: ChatWidgetConfig) => void };
  }
}

window.ChatWidget = {
  init(config: ChatWidgetConfig) {
    const container = document.createElement('div');
    container.id = 'chat-widget-root';
    document.body.appendChild(container);
    createRoot(container).render(
      <Widget endpoint={config.endpoint} apiKey={config.apiKey} username={config.username} />
    );
  },
};
