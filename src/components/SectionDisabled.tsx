import { Code, Flex, Heading, Text } from '@chakra-ui/react';

export default function SectionDisabled({ name }: { name: string }) {
  return (
    <Flex
      flexDir="column"
      align="center"
      justify="center"
      minH="60vh"
      textAlign="center"
      p="8"
    >
      <Text fontSize="4xl" mb="4">🚫</Text>
      <Heading size="lg" color="gray.800" mb="2">{name} is disabled</Heading>
      <Text color="gray.500" fontSize="sm">
        This section has been disabled via the{' '}
        <Code px="1" borderRadius="sm">DISABLE_SECTIONS</Code>{' '}
        environment variable.
      </Text>
    </Flex>
  );
}
