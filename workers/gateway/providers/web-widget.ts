import http from 'node:http';
import type { IncomingMessage as NodeIncomingMessage, ServerResponse } from 'node:http';
import type { Provider, IncomingMessage } from '../types.js';
import { CONVERSATION_SOURCES } from '@/lib/conversation-sources.js';

type JobState =
  | { status: 'pending' }
  | { status: 'done'; text: string }
  | { status: 'error'; error: string };

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export class WebWidgetProvider implements Provider {
  readonly name = CONVERSATION_SOURCES.WIDGET;

  private jobs = new Map<string, JobState>();
  private chatIdToJobId = new Map<string, string>();
  private server: http.Server | null = null;

  constructor(private port = parseInt(process.env.WIDGET_INTERNAL_PORT ?? '3001', 10)) {}

  async start(_onMessage: (msg: IncomingMessage) => Promise<void>): Promise<void> {
    this.server = http.createServer((req: NodeIncomingMessage, res: ServerResponse) => {
      this.handleRequest(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(this.port, () => resolve());
      this.server!.on('error', reject);
    });

    console.log(`[WebWidget] Internal HTTP server listening on port ${this.port}`);
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  async send(chatId: number | string, text: string): Promise<void> {
    const chatIdStr = String(chatId);
    const jobId = this.chatIdToJobId.get(chatIdStr);
    if (jobId) {
      this.jobs.set(jobId, { status: 'done', text });
      this.chatIdToJobId.delete(chatIdStr);
    }
  }

  getJobState(jobId: string): JobState {
    return this.jobs.get(jobId) ?? { status: 'pending' };
  }

  private handleRequest(req: NodeIncomingMessage, res: ServerResponse): void {
    const url = req.url ?? '/';

    if (req.method === 'POST' && url === '/jobs') {
      this.handlePostJob(req, res);
      return;
    }

    const getMatch = url.match(/^\/jobs\/(.+)$/);
    if (req.method === 'GET' && getMatch) {
      const jobId = getMatch[1];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getJobState(jobId)));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private handlePostJob(req: NodeIncomingMessage, res: ServerResponse): void {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { jobId, chatId, message, username } = JSON.parse(body) as {
          jobId: string;
          chatId: string;
          message: string;
          username?: string;
        };

        this.jobs.set(jobId, { status: 'pending' });
        this.chatIdToJobId.set(chatId, jobId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));

        // Call /api/chat-sync asynchronously — do NOT await, respond immediately above
        fetch(`${APP_URL}/api/chat-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            title: `widget: ${message.slice(0, 60)}`,
            source: 'widget',
            chatId,
            userId: username ?? null,
          }),
        })
          .then(async (fetchRes) => {
            const data = (await fetchRes.json()) as {
              text?: string;
              message?: string;
            };
            const text = data.text ?? data.message ?? JSON.stringify(data);
            this.jobs.set(jobId, { status: 'done', text });
            this.chatIdToJobId.delete(chatId);
          })
          .catch((err: unknown) => {
            this.jobs.set(jobId, { status: 'error', error: String(err) });
            this.chatIdToJobId.delete(chatId);
          });
      } catch (err: unknown) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body', detail: String(err) }));
      }
    });
  }
}
