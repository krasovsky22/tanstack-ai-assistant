import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const KNOWLEDGE_BASE_DIR = 'files/knowledge-base';

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function ensureKnowledgeBaseDir(): Promise<void> {
  await fs.mkdir(KNOWLEDGE_BASE_DIR, { recursive: true });
}

export async function extractTextContent(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParseModule = await import('pdf-parse') as any;
      const pdfParseFn = pdfParseModule.default ?? pdfParseModule;
      const data = await pdfParseFn(buffer);
      return data.text as string;
    } catch (err) {
      console.error('[knowledge-base] PDF text extraction failed:', err);
      return '[PDF content could not be extracted]';
    }
  }
  return buffer.toString('utf-8');
}

export interface LLMAnalysis {
  categories: string[];
  summary: string;
}

export async function analyzeDocumentWithLLM(
  content: string,
  originalName: string,
): Promise<LLMAnalysis> {
  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Limit content to avoid token limits
    const snippet = content.slice(0, 6000);

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Analyze the following document and return a JSON object with exactly two fields:
- "categories": an array of 1 to 5 short category labels (1–3 words each) that best describe the document's topics
- "summary": a 2–3 sentence plain-text summary of the document's main content

Document name: ${originalName}

Document content:
${snippet}

Return only valid JSON, no markdown fences.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { categories?: unknown; summary?: unknown };

    const categories = Array.isArray(parsed.categories)
      ? (parsed.categories as string[]).filter((c) => typeof c === 'string').slice(0, 5)
      : ['General'];

    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';

    return { categories: categories.length > 0 ? categories : ['General'], summary };
  } catch (err) {
    console.error('[knowledge-base] LLM analysis failed:', err);
    return { categories: ['General'], summary: '' };
  }
}

export async function saveKnowledgeBaseFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<{ filename: string; filePath: string; content: string }> {
  await ensureKnowledgeBaseDir();

  const ext = path.extname(originalName) || '';
  const base = sanitizeFilename(path.basename(originalName, ext));
  const filename = `${base}_${randomUUID().slice(0, 8)}${ext}`;
  const filePath = path.join(KNOWLEDGE_BASE_DIR, filename);

  await fs.writeFile(filePath, buffer);

  const content = await extractTextContent(buffer, mimeType);

  return { filename, filePath, content };
}

export async function readKnowledgeBaseFileContent(filePath: string, mimeType: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return extractTextContent(Buffer.from(buffer), mimeType);
}

export async function deleteKnowledgeBaseFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== 'ENOENT') throw err;
  }
}

export function detectMimeType(filename: string, declaredMime: string): string {
  const ext = path.extname(filename).toLowerCase();
  const extMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
  };
  return extMap[ext] ?? declaredMime ?? 'application/octet-stream';
}
