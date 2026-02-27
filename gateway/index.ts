import type { Provider } from './types.js';

const { TelegramProvider } = await import('./providers/telegram.js');
const { handleMessage } = await import('./handler.js');

const providers: Provider[] = [new TelegramProvider()];

for (const provider of providers) {
  provider.start((msg) => handleMessage(msg, provider)).catch((err) => {
    console.error(`[${provider.name}] Fatal error:`, err);
    process.exit(1);
  });
}

console.log('Communication Gateway started');

function shutdown() {
  console.log('\n[gateway] Shutting down...');
  for (const provider of providers) {
    provider.stop();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
