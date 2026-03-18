import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/user-settings')({
  server: {
    handlers: {
      GET: async () => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { getUserSettings } = await import('@/services/user-settings');
        const settings = await getUserSettings(userId);

        // Mask the PAT in the response
        const masked = settings
          ? {
              jiraBaseUrl: settings.jiraBaseUrl,
              jiraEmail: settings.jiraEmail,
              jiraPat: settings.jiraPat ? '••••••••' : null,
              jiraDefaultProject: settings.jiraDefaultProject,
              hasJiraPat: !!settings.jiraPat,
            }
          : {
              jiraBaseUrl: null,
              jiraEmail: null,
              jiraPat: null,
              jiraDefaultProject: null,
              hasJiraPat: false,
            };

        return new Response(JSON.stringify(masked), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      PUT: async ({ request }) => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json();
        const { jiraBaseUrl, jiraEmail, jiraPat, jiraDefaultProject } = body;

        const { getUserSettings, upsertUserSettings } = await import('@/services/user-settings');

        // If PAT is masked placeholder, keep the existing one
        let resolvedPat = jiraPat;
        if (jiraPat === '••••••••') {
          const existing = await getUserSettings(userId);
          resolvedPat = existing?.jiraPat ?? null;
        }

        const updated = await upsertUserSettings(userId, {
          jiraBaseUrl: jiraBaseUrl || null,
          jiraEmail: jiraEmail || null,
          jiraPat: resolvedPat || null,
          jiraDefaultProject: jiraDefaultProject || null,
        });

        return new Response(
          JSON.stringify({
            jiraBaseUrl: updated.jiraBaseUrl,
            jiraEmail: updated.jiraEmail,
            jiraPat: updated.jiraPat ? '••••••••' : null,
            jiraDefaultProject: updated.jiraDefaultProject,
            hasJiraPat: !!updated.jiraPat,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  },
});
