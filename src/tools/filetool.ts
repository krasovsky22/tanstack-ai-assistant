import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
import { writeFile, mkdir, stat } from 'fs/promises';
import { join, extname } from 'path';

export const GENERATED_DIR = 'files/generated';

const MIME_TYPES: Record<string, string> = {
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

export function getFileTools() {
  return [
    toolDefinition({
      name: 'generate_file',
      description:
        'Generate and save a file (csv, txt, or markdown) to the server. ' +
        'Returns a download URL to share with the user. ' +
        'Use this when the user asks to create, export, or download a file.',
      inputSchema: z.object({
        filename: z
          .string()
          .describe(
            'Filename with extension, e.g. "report.csv", "notes.md", "data.txt"',
          ),
        content: z.string().describe('The full content of the file'),
      }),
    }).server(async ({ filename, content }) => {
      await mkdir(GENERATED_DIR, { recursive: true });

      // Sanitize filename — allow alphanumeric, dots, dashes, underscores
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = join(GENERATED_DIR, safeFilename);

      await writeFile(filePath, content, 'utf-8');

      const fileStats = await stat(filePath);
      const ext = extname(safeFilename).toLowerCase();
      const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream';

      const { db } = await import('@/db');
      const { generatedFiles } = await import('@/db/schema');
      await db.insert(generatedFiles).values({
        filename: safeFilename,
        filePath,
        mimeType,
        sizeBytes: fileStats.size,
      });

      const downloadUrl = `/api/files/${encodeURIComponent(safeFilename)}`;

      return {
        success: true,
        filename: safeFilename,
        downloadUrl,
        message: `File "${safeFilename}" generated. Download URL: ${downloadUrl}`,
      };
    }),
  ];
}
