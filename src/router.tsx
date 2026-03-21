// Polyfill crypto.randomUUID for non-secure contexts (HTTP on non-localhost)
import 'crypto-randomuuid';

import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFoundPage } from './components/NotFoundPage';

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    defaultNotFoundComponent: NotFoundPage,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
