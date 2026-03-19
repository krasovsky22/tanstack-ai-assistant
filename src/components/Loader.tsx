import { Spinner, Text, VStack } from '@chakra-ui/react';

interface LoaderProps {
  text?: string;
}

export default function Loader({ text = 'Loading...' }: LoaderProps) {
  return (
    <VStack gap="3" justify="center" align="center" py="8">
      <Spinner size="md" color="brand.500" />
      <Text color="text.muted" fontSize="sm">
        {text}
      </Text>
    </VStack>
  );
}
