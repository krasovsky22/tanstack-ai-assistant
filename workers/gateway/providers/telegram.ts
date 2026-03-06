import { readFile } from 'fs/promises';
import type { IncomingMessage, IncomingImage, Provider } from '../types.js';
import { CONVERSATION_SOURCES } from '@/lib/conversation-sources';

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  channel_post?: TelegramMessage;
  message?: TelegramMessage;
}

export class TelegramProvider implements Provider {
  readonly name = CONVERSATION_SOURCES.TELEGRAM;

  private token: string;
  private botUsername: string;
  private adminChatId: string | undefined;
  private running = false;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME ?? '';
    this.adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!this.token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
    if (!this.botUsername) throw new Error('TELEGRAM_BOT_USERNAME is not set');
  }

  private async verifyConnection(): Promise<boolean> {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/getMe`,
      );
      console.log('[Telegram] getMe response status:', res);
      if (!res.ok) {
        console.error(`[Telegram] getMe failed: ${res.status}`);
        return false;
      }
      const data = (await res.json()) as {
        ok: boolean;
        result?: { username: string };
      };
      if (data.ok && data.result) {
        console.log(`[Telegram] Connected as @${data.result.username}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error(
        '[Telegram] Connection verification failed:',
        JSON.stringify(err, null, 2),
      );
      return false;
    }
  }

  private async sendStartupNotification(): Promise<void> {
    if (!this.adminChatId) return;

    const timestamp = new Date().toISOString();
    const message = `🤖 Bot connected and ready!\n\nTimestamp: ${timestamp}`;

    try {
      await this.send(this.adminChatId, message);
      console.log('[Telegram] Startup notification sent');
    } catch (err) {
      console.error('[Telegram] Failed to send startup notification:', err);
    }
  }

  private async sendTyping(chatId: number | string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
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

  async sendFile(
    chatId: number | string,
    filePath: string,
    filename: string,
  ): Promise<void> {
    try {
      const fileContent = await readFile(filePath);
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      formData.append(
        'document',
        new Blob([fileContent]),
        filename,
      );

      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/sendDocument`,
        { method: 'POST', body: formData },
      );
      if (!res.ok) {
        console.error(`[Telegram] sendDocument failed: ${res.status}`);
      }
    } catch (err) {
      console.error('[Telegram] sendFile error:', err);
    }
  }

  stop(): void {
    this.running = false;
  }

  async start(
    onMessage: (msg: IncomingMessage) => Promise<void>,
  ): Promise<void> {
    const connected = await this.verifyConnection();
    if (!connected) {
      throw new Error('Failed to connect to Telegram');
    }

    await this.sendStartupNotification();

    this.running = true;
    let offset = 0;

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

          const post = update.channel_post ?? update.message;

          console.log('received post', post, this.botUsername);
          const postText = post?.text ?? post?.caption ?? '';
          const hasPhoto = !!post?.photo?.length;
          if (!post) continue;
          if (!postText.includes(`@${this.botUsername}`) && !hasPhoto) continue;
          if (hasPhoto && !postText.includes(`@${this.botUsername}`)) continue;

          const images: IncomingImage[] = [];
          if (hasPhoto && post.photo) {
            // Use the largest photo (last in array)
            const largestPhoto = post.photo[post.photo.length - 1];
            const img = await downloadPhotoAsBase64(this.token, largestPhoto.file_id);
            if (img) images.push(img);
          }

          const msg: IncomingMessage = {
            text: postText,
            chatId: post.chat.id,
            provider: this.name,
            ...(images.length > 0 ? { images } : {}),
          };
          console.log('message to handle', msg);

          this.sendTyping(msg.chatId).catch(() => {});
          const typingInterval = setInterval(() => {
            this.sendTyping(msg.chatId).catch(() => {});
          }, 4_000);

          onMessage(msg)
            .catch((err) => {
              console.error('[Telegram] Error handling message:', err);
              this.send(
                msg.chatId,
                'Sorry, something went wrong. Please try again.',
              ).catch(() => {});
            })
            .finally(() => {
              clearInterval(typingInterval);
            });
        }
      } catch (err) {
        if (this.running) {
          console.error('[Telegram] Poll error:', JSON.stringify(err, null, 2));
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

async function downloadPhotoAsBase64(
  token: string,
  fileId: string,
): Promise<IncomingImage | null> {
  try {
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
    );
    if (!fileRes.ok) return null;

    const fileData = (await fileRes.json()) as {
      ok: boolean;
      result?: { file_path: string };
    };
    if (!fileData.ok || !fileData.result?.file_path) return null;

    const dlRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`,
    );
    if (!dlRes.ok) return null;

    const buffer = await dlRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const ext = fileData.result.file_path.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

    return { base64, mimeType };
  } catch (err) {
    console.error('[Telegram] Failed to download photo:', err);
    return null;
  }
}
