import { type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';

type Props = {
  children: ReactNode;
  maxW?: string;
};

export function PageContainer({ children, maxW = '4xl' }: Props) {
  return (
    <Box maxW={maxW} mx="auto" px="6" py="6">
      {children}
    </Box>
  );
}
