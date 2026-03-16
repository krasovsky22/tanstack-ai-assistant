import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useDisabledSections, type Section } from '@/lib/sections';
import {
  Box,
  CloseButton,
  Drawer,
  Flex,
  HStack,
  IconButton,
  Portal,
  Text,
} from '@chakra-ui/react';
import {
  Briefcase,
  BookOpen,
  Clock,
  Home,
  Mail,
  Menu,
  MessageSquare,
  Search,
} from 'lucide-react';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { data: sectionsData } = useDisabledSections();
  const disabled = new Set(sectionsData?.disabled ?? []);
  const enabled = (key: Section) => !disabled.has(key);

  return (
    <>
      <Flex
        as="header"
        px="4"
        py="3"
        align="center"
        bg="gray.800"
        color="white"
        shadow="lg"
        gap="3"
      >
        <IconButton
          aria-label="Open menu"
          variant="ghost"
          color="white"
          _hover={{ bg: 'gray.700' }}
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </IconButton>
        <Box asChild>
          <Link to="/">
            <img
              src="/tanstack-word-logo-white.svg"
              alt="TanStack Logo"
              style={{ height: '2.5rem' }}
            />
          </Link>
        </Box>
      </Flex>

      <Drawer.Root
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        placement="start"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg="gray.900" color="white" maxW="xs">
              <Drawer.Header borderBottomWidth="1px" borderColor="gray.700">
                <Drawer.Title color="white">Navigation</Drawer.Title>
                <Drawer.CloseTrigger asChild pos="initial">
                  <CloseButton color="white" _hover={{ bg: 'gray.800' }} />
                </Drawer.CloseTrigger>
              </Drawer.Header>

              <Drawer.Body as="nav" px="3" py="4" display="flex" flexDirection="column" gap="1">
                <NavLink to="/" icon={<Home size={20} />} label="Home" onClick={() => setOpen(false)} exact />

                {enabled('ai') && (
                  <NavLink to="/conversations" icon={<MessageSquare size={20} />} label="AI" onClick={() => setOpen(false)} />
                )}

                {enabled('jobs') && (
                  <>
                    <HStack px="3" py="2" color="gray.400" gap="3" mt="1">
                      <Briefcase size={20} />
                      <Text fontWeight="medium" fontSize="sm">Job Search</Text>
                    </HStack>
                    <NavLink to="/jobs" icon={<Home size={18} />} label="Dashboard" onClick={() => setOpen(false)} pl="10" exact />
                    <NavLink to="/jobs/extract-from-url" icon={<Search size={18} />} label="Extract From Url" onClick={() => setOpen(false)} pl="10" />
                  </>
                )}

                {enabled('mail') && (
                  <NavLink to="/mail" icon={<Mail size={20} />} label="Mail" onClick={() => setOpen(false)} />
                )}

                {enabled('knowledge-base') && (
                  <NavLink to="/knowledge-base" icon={<BookOpen size={20} />} label="Knowledge Base" onClick={() => setOpen(false)} />
                )}

                {enabled('cronjobs') && (
                  <>
                    <HStack px="3" py="2" color="gray.400" gap="3" mt="1">
                      <Clock size={20} />
                      <Text fontWeight="medium" fontSize="sm">Automation</Text>
                    </HStack>
                    <NavLink to="/cronjobs" icon={<Home size={18} />} label="Dashboard" onClick={() => setOpen(false)} pl="10" exact />
                  </>
                )}
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  );
}

function NavLink({
  to,
  icon,
  label,
  onClick,
  pl,
  exact,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  pl?: string;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeOptions={exact ? { exact: true } : undefined}
      style={{ textDecoration: 'none' }}
      activeProps={{
        style: {},
        className: 'nav-link-active',
      }}
      inactiveProps={{
        className: 'nav-link-inactive',
      }}
    >
      <HStack
        px="3"
        py="2.5"
        pl={pl ?? '3'}
        borderRadius="lg"
        gap="3"
        cursor="pointer"
        transition="background 0.15s"
        className="nav-link-inner"
      >
        {icon}
        <Text fontWeight="medium" fontSize="sm">{label}</Text>
      </HStack>
    </Link>
  );
}
