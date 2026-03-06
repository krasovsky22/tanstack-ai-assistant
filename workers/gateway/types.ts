export interface IncomingImage {
  base64: string;
  mimeType: string;
}

export interface IncomingMessage {
  text: string;
  chatId: number | string;
  provider: string;
  images?: IncomingImage[];
}

export interface Provider {
  name: string;
  start(onMessage: (msg: IncomingMessage) => Promise<void>): Promise<void>;
  stop(): void;
  send(chatId: number | string, text: string): Promise<void>;
}
