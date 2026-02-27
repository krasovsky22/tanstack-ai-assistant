import type { IncomingMessage, Provider } from '../types.js';

interface TelegramUpdate {
  update_id: number;
  channel_post?: {
    message_id: number;
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

export class TelegramProvider implements Provider {
  readonly name = 'Telegram';

  private token: string;
  private botUsername: string;
  private running = false;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME ?? '';

    if (!this.token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
    if (!this.botUsername) throw new Error('TELEGRAM_BOT_USERNAME is not set');
  }

  async send(chatId: number | string, text: string): Promise<void> {
    const res = await fetch(
      `https://api.telegram.org/bot${this.token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    if (!res.ok) {
      console.error(`[Telegram] sendMessage failed: ${res.status}`);
    }
  }

  stop(): void {
    this.running = false;
  }

  async start(
    onMessage: (msg: IncomingMessage) => Promise<void>,
  ): Promise<void> {
    this.running = true;
    let offset = 0;

    console.log('[Telegram] Polling started');

    while (this.running) {
      try {
        const url =
          `https://api.telegram.org/bot${this.token}/getUpdates` +
          `?offset=${offset}&timeout=30`;

        const res = await fetch(url);
        if (!res.ok) {
          console.error(`[Telegram] getUpdates error: ${res.status}`);
          await sleep(5_000);
          continue;
        }

        const body = (await res.json()) as {
          ok: boolean;
          result: TelegramUpdate[];
        };

        console.info(
          `[Telegram] Received`,
          JSON.stringify(body.result, null, 2),
        );

        for (const update of body.result ?? []) {
          offset = update.update_id + 1;

          const post = update.channel_post;
          if (!post?.text) continue;
          if (!post.text.includes(`@${this.botUsername}`)) continue;

          const msg: IncomingMessage = {
            text: post.text,
            chatId: post.chat.id,
            provider: this.name,
          };

          onMessage(msg).catch((err) => {
            console.error('[Telegram] Error handling message:', err);
          });
        }
      } catch (err) {
        if (this.running) {
          console.error('[Telegram] Poll error:', err);
          await sleep(5_000);
        }
      }
    }

    console.log('[Telegram] Polling stopped');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
