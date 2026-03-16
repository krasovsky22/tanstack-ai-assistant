import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { aiDevtoolsPlugin } from '@tanstack/react-ai-devtools';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Provider } from '@/components/ui/provider';
import { Box, Flex } from '@chakra-ui/react';

import IconRail from '@/components/IconRail';
import ChatSidebar from '@/components/ChatSidebar';

import appCss from '../styles.css?url';

function NotFound() {
  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      direction="column"
      gap="2"
      bg="#F0F0F0"
    >
      <Box fontSize="2xl" fontWeight="bold" color="#1A1A1A">
        404 - Page Not Found
      </Box>
      <Box color="#6B7280">The page you're looking for doesn't exist.</Box>
    </Flex>
  );
}

export const Route = createRootRoute({
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
        title: 'Orin AI',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex minH="100vh" bg="#F0F0F0">
      <IconRail />
      <ChatSidebar />
      <Box
        flex="1"
        ml="340px"
        minH="100vh"
        overflowY="auto"
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
            <TanStackDevtools
              config={{
                position: 'bottom-right',
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
          </QueryClientProvider>
        </Provider>
        <Scripts />
      </body>
    </html>
  );
}
