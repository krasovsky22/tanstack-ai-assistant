import { Link, useRouterState } from '@tanstack/react-router';
import { Box, Flex, Separator } from '@chakra-ui/react';
import {
  Briefcase,
  BookOpen,
  Clock,
  MessageSquare,
  Search,
  Settings,
  Sun,
  HelpCircle,
  Database,
} from 'lucide-react';
import { useDisabledSections, type Section } from '@/lib/sections';

interface RailIconProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function RailIcon({ icon, label, to, isActive, onClick }: RailIconProps) {
  const sharedStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    cursor: 'pointer',
    background: isActive ? '#5A9E3A' : 'transparent',
    color: isActive ? 'white' : '#9CA3AF',
    textDecoration: 'none',
    border: 'none',
    outline: 'none',
    transition: 'all 0.15s',
    flexShrink: 0 as const,
  };

  if (to) {
    return (
      <Link to={to} title={label} style={sharedStyles}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" title={label} onClick={onClick} style={sharedStyles}>
      {icon}
    </button>
  );
}

function AppIcon() {
  return (
    <Link
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: '#5A9E3A',
        color: 'white',
        flexShrink: 0,
        textDecoration: 'none',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"
          fill="currentColor"
        />
      </svg>
    </Link>
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

  return (
    <Flex
      direction="column"
      align="center"
      w="60px"
      minH="100vh"
      bg="white"
      borderRight="1px solid"
      borderColor="#E5E7EB"
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

      <Box mt="2" mb="1">
        <RailIcon icon={<Search size={18} />} label="Search" />
      </Box>

      <Separator borderColor="#E5E7EB" w="32px" />

      <Flex direction="column" gap="1" mt="1" flex="1">
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
            icon={<Database size={18} />}
            label="Mail"
            to="/mail"
            isActive={isMailActive}
          />
        )}
      </Flex>

      <Flex direction="column" gap="1" mb="1">
        <RailIcon icon={<Sun size={18} />} label="Toggle theme" />
        <RailIcon icon={<Settings size={18} />} label="Settings" />
        <RailIcon icon={<HelpCircle size={18} />} label="Help" />
      </Flex>
    </Flex>
  );
}
