import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { aiDevtoolsPlugin } from '@tanstack/react-ai-devtools';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Provider } from '@/components/ui/provider';
import { Toaster } from '@/components/ui/toaster';
import { Box, Flex } from '@chakra-ui/react';
import { useState } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { useAppSession } from '@/services/session';

import IconRail from '@/components/IconRail';
import ChatSidebar from '@/components/ChatSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ReportIssueModal } from '@/components/ReportIssueModal';

import appCss from '../styles.css?url';

// IconRail (60px) + ChatSidebar open (280px) = 340px
// IconRail (60px) + ChatSidebar collapsed (48px) = 108px
const SIDEBAR_OPEN_WIDTH = '340px';
const SIDEBAR_COLLAPSED_WIDTH = '108px';

const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession();
  if (!session.data.userId) return null;
  return { userId: session.data.userId, username: session.data.username };
});

function NotFound() {
  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      direction="column"
      gap="2"
      bg="bg.page"
    >
      <Box fontSize="2xl" fontWeight="bold" color="text.primary">
        404 - Page Not Found
      </Box>
      <Box color="text.secondary">
        The page you're looking for doesn't exist.
      </Box>
    </Flex>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await fetchUser();
    return { user };
  },
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Sparky AI',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/sparky-logo.svg',
      },
    ],
  }),
  shellComponent: RootDocument,
});

function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = pathname === '/login';
  const showSidebar = pathname.startsWith('/conversations');

  const mainMargin = isLoginPage
    ? '0px'
    : showSidebar
      ? isSidebarOpen
        ? SIDEBAR_OPEN_WIDTH
        : SIDEBAR_COLLAPSED_WIDTH
      : '60px';

  return (
    <Flex minH="100vh" bg="bg.page">
      {!isLoginPage && <IconRail />}
      {!isLoginPage && showSidebar && (
        <ChatSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((v) => !v)}
        />
      )}
      {!isLoginPage && <AppHeader onOpen={() => setIsReportOpen(true)} />}
      {!isLoginPage && (
        <ReportIssueModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
      <Box
        flex="1"
        ml={mainMargin}
        pt={isLoginPage ? '0' : '56px'}
        minH="100vh"
        overflowY="auto"
        transition="margin-left 0.2s"
      >
        {children}
      </Box>
    </Flex>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
                crypto.randomUUID = function() {
                  if (typeof crypto.getRandomValues === 'function') {
                    var bytes = new Uint8Array(16);
                    crypto.getRandomValues(bytes);
                    bytes[6] = (bytes[6] & 0x0f) | 0x40;
                    bytes[8] = (bytes[8] & 0x3f) | 0x80;
                    var hex = Array.from(bytes, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
                    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
                  }
                  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                  });
                };
              }
            `,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <Provider>
          <QueryClientProvider client={queryClient}>
            <AppLayout>{children}</AppLayout>
            <Toaster />
            {import.meta.env.DEV && (
              <TanStackDevtools
                config={{
                  position: 'bottom-left',
                }}
                eventBusConfig={{
                  connectToServerBus: true,
                }}
                plugins={[
                  {
                    name: 'Tanstack Router',
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                  aiDevtoolsPlugin(),
                ]}
              />
            )}
          </QueryClientProvider>
        </Provider>
        <Scripts />
      </body>
    </html>
  );
}
