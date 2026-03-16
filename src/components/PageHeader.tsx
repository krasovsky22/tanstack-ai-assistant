import { type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Box, Flex, Heading, Text } from '@chakra-ui/react';

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
};

export function PageHeader({ title, subtitle, actions, backTo, backLabel }: Props) {
  return (
    <Flex justifyContent="space-between" alignItems="flex-start" mb="6">
      <Box>
        {backTo && (
          <Box asChild display="inline-flex" alignItems="center" gap="1" fontSize="sm" color="text.secondary" mb="2" _hover={{ color: 'text.primary' }}>
            <Link to={backTo}>← {backLabel ?? 'Back'}</Link>
          </Box>
        )}
        <Heading size="lg" color="text.primary">{title}</Heading>
        {subtitle && (
          <Text color="text.secondary" fontSize="sm" mt="1">{subtitle}</Text>
        )}
      </Box>
      {actions && <Box>{actions}</Box>}
    </Flex>
  );
}
