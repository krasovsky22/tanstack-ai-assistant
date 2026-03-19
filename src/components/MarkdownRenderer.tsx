import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Code as ChakraCode,
  Heading,
  Link as ChakraLink,
  Text,
} from '@chakra-ui/react';

export const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <Text mb={2} lineHeight="1.6">{children}</Text>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h1" size="xl" mt={4} mb={2}>{children}</Heading>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h2" size="lg" mt={4} mb={2}>{children}</Heading>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h3" size="md" mt={3} mb={2}>{children}</Heading>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => {
    if (inline) {
      return <ChakraCode px={1} py={0.5} borderRadius="sm" fontSize="sm">{children}</ChakraCode>;
    }
    return <>{children}</>;
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <Box
      as="pre"
      bg="gray.100"
      p={3}
      borderRadius="md"
      overflowX="auto"
      fontSize="sm"
      mb={2}
      fontFamily="mono"
    >
      {children}
    </Box>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <Box as="ul" pl={4} mb={2}>{children}</Box>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <Box as="ol" pl={4} mb={2}>{children}</Box>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <Box as="li" mb={1}>{children}</Box>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <ChakraLink color="brand.600" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </ChakraLink>
  ),
};

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}
