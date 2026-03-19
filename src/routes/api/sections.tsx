import { createFileRoute } from '@tanstack/react-router';

const VALID_SECTIONS = ['ai', 'jobs', 'mail', 'knowledge-base', 'cronjobs', 'notifications'] as const;

export const Route = createFileRoute('/api/sections')({
  server: {
    handlers: {
      GET: async () => {
        const disabled = (process.env.DISABLE_SECTIONS ?? '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s) => VALID_SECTIONS.includes(s as (typeof VALID_SECTIONS)[number]));
        return Response.json({ disabled });
      },
    },
  },
});
