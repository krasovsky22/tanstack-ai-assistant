import { useRouteContext } from '@tanstack/react-router';
import { Box, Button, Flex, IconButton, Image, Text } from '@chakra-ui/react';
import { Flag, Moon, Sun, User } from 'lucide-react';
import { ICON_RAIL_WIDTH } from '@/components/IconRail';
import { useColorMode } from '@/lib/color-mode';

export interface AppHeaderProps {
  onOpen: () => void;
}

export function AppHeader({ onOpen }: AppHeaderProps) {
  const { user } = useRouteContext({ from: '__root__' });
  const { colorMode, toggleColorMode } = useColorMode();

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : null;

  return (
    <Flex
      position="fixed"
      top="0"
      left={ICON_RAIL_WIDTH}
      right="0"
      h="56px"
      zIndex={99}
      bg="bg.panel"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      px="6"
      align="center"
      justify="space-between"
    >
      {/* Left: App name */}
      <Flex align="center" gap="2">
        <Image src="/sparky-logo.svg" h="28px" w="28px" />
        <Text fontWeight="semibold" fontSize="sm" color="text.primary">
          Sparky AI
        </Text>
      </Flex>

      {/* Right: Color mode toggle + Report Issue button + User avatar */}
      <Flex align="center" gap="3">
        <IconButton
          aria-label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          variant="ghost"
          size="sm"
          color="text.secondary"
          _hover={{ bg: 'bg.subtle', color: 'text.primary' }}
          onClick={toggleColorMode}
        >
          {colorMode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </IconButton>

        <Button variant="ghost" size="sm" onClick={onOpen}>
          <Flag size={14} />
          Report Issue
        </Button>

        <Box
          w="32px"
          h="32px"
          borderRadius="full"
          bg="brand.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="xs"
          fontWeight="semibold"
          color="white"
          flexShrink={0}
        >
          {initials ? (
            <Text fontSize="xs" fontWeight="semibold" color="white">
              {initials}
            </Text>
          ) : (
            <User size={14} color="white" />
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
