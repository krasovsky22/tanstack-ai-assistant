import { Link, useRouterState } from '@tanstack/react-router';
import { Box, Flex, Separator } from '@chakra-ui/react';
import {
  Briefcase,
  BookOpen,
  Clock,
  MessageSquare,
  Mail,
  Settings,
} from 'lucide-react';
import { useDisabledSections, type Section } from '@/lib/sections';

// Must stay in sync with ChatSidebar left offset and __root.tsx ml offset
export const ICON_RAIL_WIDTH = '60px';

interface RailIconProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function RailIcon({ icon, label, to, isActive, onClick }: RailIconProps) {
  const baseProps = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    w: '40px',
    h: '40px',
    borderRadius: '10px',
    cursor: 'pointer',
    bg: isActive ? 'brand.600' : 'transparent',
    color: isActive ? 'white' : 'text.muted',
    border: 'none',
    outline: 'none',
    transition: 'all 0.15s',
    flexShrink: 0,
    _hover: {
      bg: isActive ? 'brand.700' : 'whiteAlpha.200',
      color: isActive ? 'white' : 'text.secondary',
    },
    _active: {
      bg: isActive ? 'brand.800' : 'whiteAlpha.300',
    },
  } as const;

  if (to) {
    return (
      <Box as={Link} to={to} title={label} textDecoration="none" {...baseProps}>
        {icon}
      </Box>
    );
  }

  return (
    <Box as="button" type="button" title={label} onClick={onClick} {...baseProps}>
      {icon}
    </Box>
  );
}

function AppIcon() {
  return (
    <Box
      as={Link}
      to="/"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="40px"
      h="40px"
      borderRadius="10px"
      bg="brand.600"
      color="white"
      flexShrink={0}
      textDecoration="none"
      _hover={{ bg: 'brand.700' }}
      _active={{ bg: 'brand.800' }}
      transition="all 0.15s"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"
          fill="currentColor"
        />
      </svg>
    </Box>
  );
}

export default function IconRail() {
  const { data: sectionsData } = useDisabledSections();
  const disabled = new Set(sectionsData?.disabled ?? []);
  const enabled = (key: Section) => !disabled.has(key);

  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const isConversationsActive = pathname.startsWith('/conversations');
  const isJobsActive = pathname.startsWith('/jobs');
  const isMailActive = pathname.startsWith('/mail');
  const isCronjobsActive = pathname.startsWith('/cronjobs');
  const isKbActive = pathname.startsWith('/knowledge-base');
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <Flex
      direction="column"
      align="center"
      w={ICON_RAIL_WIDTH}
      minH="100vh"
      bg="bg.surface"
      borderRight="1px solid"
      borderColor="border.default"
      py="4"
      gap="2"
      flexShrink={0}
      position="fixed"
      top={0}
      left={0}
      bottom={0}
      zIndex={100}
    >
      <AppIcon />

      <Separator borderColor="border.default" w="32px" my="1" />

      <Flex direction="column" gap="1" flex="1">
        {enabled('ai') && (
          <RailIcon
            icon={<MessageSquare size={18} />}
            label="AI Chat"
            to="/conversations"
            isActive={isConversationsActive}
          />
        )}

        {enabled('jobs') && (
          <RailIcon
            icon={<Briefcase size={18} />}
            label="Job Search"
            to="/jobs"
            isActive={isJobsActive}
          />
        )}

        {enabled('cronjobs') && (
          <RailIcon
            icon={<Clock size={18} />}
            label="Automation"
            to="/cronjobs"
            isActive={isCronjobsActive}
          />
        )}

        {enabled('knowledge-base') && (
          <RailIcon
            icon={<BookOpen size={18} />}
            label="Knowledge Base"
            to="/knowledge-base"
            isActive={isKbActive}
          />
        )}

        {enabled('mail') && (
          <RailIcon
            icon={<Mail size={18} />}
            label="Mail"
            to="/mail"
            isActive={isMailActive}
          />
        )}

        <Box mt="auto">
          <RailIcon
            icon={<Settings size={18} />}
            label="Settings"
            to="/settings"
            isActive={isSettingsActive}
          />
        </Box>
      </Flex>
    </Flex>
  );
}
