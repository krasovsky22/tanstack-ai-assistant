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

        // Mask PATs in the response
        const masked = settings
          ? {
              jiraBaseUrl: settings.jiraBaseUrl,
              jiraEmail: settings.jiraEmail,
              jiraPat: settings.jiraPat ? '••••••••' : null,
              jiraDefaultProject: settings.jiraDefaultProject,
              hasJiraPat: !!settings.jiraPat,
              githubPat: settings.githubPat ? '••••••••' : null,
              hasGithubPat: !!settings.githubPat,
            }
          : {
              jiraBaseUrl: null,
              jiraEmail: null,
              jiraPat: null,
              jiraDefaultProject: null,
              hasJiraPat: false,
              githubPat: null,
              hasGithubPat: false,
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
        const { jiraBaseUrl, jiraEmail, jiraPat, jiraDefaultProject, githubPat } = body;

        const { getUserSettings, upsertUserSettings } = await import('@/services/user-settings');

        // If Jira PAT is masked placeholder, keep the existing one
        let resolvedPat = jiraPat;
        if (jiraPat === '••••••••') {
          const existing = await getUserSettings(userId);
          resolvedPat = existing?.jiraPat ?? null;
        }

        // If GitHub PAT is masked placeholder, keep the existing one
        let resolvedGithubPat = githubPat;
        if (githubPat === '••••••••') {
          const existing = await getUserSettings(userId);
          resolvedGithubPat = existing?.githubPat ?? null;
        }

        // Validate GitHub PAT by calling GitHub REST API
        // Per pitfall 4 in RESEARCH.md: do NOT return HTTP 4xx if GitHub API is unreachable
        // Save the PAT regardless — only connectedAs will be null on failure
        let connectedAs: string | null = null;
        if (resolvedGithubPat) {
          try {
            const validRes = await fetch('https://api.github.com/user', {
              headers: {
                Authorization: `Bearer ${resolvedGithubPat}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
            });
            if (validRes.ok) {
              const data = await validRes.json();
              connectedAs = data.login ?? null;
            }
          } catch {
            // Network unreachable — save PAT anyway, connectedAs stays null
          }
        }

        const updated = await upsertUserSettings(userId, {
          jiraBaseUrl: jiraBaseUrl || null,
          jiraEmail: jiraEmail || null,
          jiraPat: resolvedPat || null,
          jiraDefaultProject: jiraDefaultProject || null,
          githubPat: resolvedGithubPat || null,
        });

        return new Response(
          JSON.stringify({
            jiraBaseUrl: updated.jiraBaseUrl,
            jiraEmail: updated.jiraEmail,
            jiraPat: updated.jiraPat ? '••••••••' : null,
            jiraDefaultProject: updated.jiraDefaultProject,
            hasJiraPat: !!updated.jiraPat,
            githubPat: updated.githubPat ? '••••••••' : null,
            hasGithubPat: !!updated.githubPat,
            connectedAs,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  },
});
