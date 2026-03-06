import { createFileRoute } from '@tanstack/react-router';
import { readFile } from 'fs/promises';
import { join, extname, basename } from 'path';

const GENERATED_DIR = 'files/generated';

const MIME_TYPES: Record<string, string> = {
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

export const Route = createFileRoute('/api/files/$filename')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const filename = params.filename;

        // Prevent path traversal
        if (filename.includes('..') || filename.includes('/')) {
          return new Response('Not found', { status: 404 });
        }

        const safeFilename = basename(filename);
        const filePath = join(GENERATED_DIR, safeFilename);

        try {
          const content = await readFile(filePath);
          const ext = extname(safeFilename).toLowerCase();
          const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream';

          return new Response(content, {
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `attachment; filename="${safeFilename}"`,
            },
          });
        } catch {
          return new Response('Not found', { status: 404 });
        }
      },
    },
  },
});
