import type { Provider } from './types.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const { TelegramProvider } = await import('./providers/telegram.js');
const { handleMessage } = await import('./handler.js');

const providers: Provider[] = [new TelegramProvider()];

for (const provider of providers) {
  provider.start((msg) => handleMessage(msg, provider)).catch((err) => {
    console.error(`[${provider.name}] Fatal error:`, err);
    process.exit(1);
  });
}

// WebWidgetProvider calls /api/chat-sync directly — does not use handleMessage()
if (process.env.WIDGET_API_KEY) {
  const { WebWidgetProvider } = await import('./providers/web-widget.js');
  const widgetProvider = new WebWidgetProvider();
  providers.push(widgetProvider);
  widgetProvider.start(() => Promise.resolve()).catch((err) => {
    console.error('[WebWidget] Fatal error:', err);
    process.exit(1);
  });
}

async function processOutboundMessages() {
  try {
    const res = await fetch(`${APP_URL}/api/remote-chats/outbound`);
    if (!res.ok) return;

    const pending = (await res.json()) as Array<{
      id: string;
      chatId: string;
      provider: string;
      text: string;
    }>;

    for (const msg of pending) {
      const provider = providers.find((p) => p.name === msg.provider);
      if (!provider) {
        await fetch(`${APP_URL}/api/remote-chats/outbound/${msg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'failed',
            error: `No provider found for ${msg.provider}`,
          }),
        }).catch(() => {});
        continue;
      }

      try {
        await provider.send(msg.chatId, msg.text);
        await fetch(`${APP_URL}/api/remote-chats/outbound/${msg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sent' }),
        }).catch(() => {});
      } catch (err) {
        await fetch(`${APP_URL}/api/remote-chats/outbound/${msg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed', error: String(err) }),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[gateway] Outbound message polling error:', err);
  }
}

const outboundInterval = setInterval(processOutboundMessages, 5_000);

console.log('Communication Gateway started');

function shutdown() {
  console.log('\n[gateway] Shutting down...');
  clearInterval(outboundInterval);
  for (const provider of providers) {
    provider.stop();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
