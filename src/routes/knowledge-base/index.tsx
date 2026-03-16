import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Upload, FolderEdit, FileText, Search, Eye, X, Tag, Pencil, File, FileCode, Image, Database } from 'lucide-react';
import { AppModal } from '@/components/AppModal';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  IconButton,
  Input,
  NativeSelect,
  Skeleton,
  Spinner,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';

export const Route = createFileRoute('/knowledge-base/')({
  component: KnowledgeBaseDashboard,
});

type KnowledgeBaseFile = {
  id: string;
  filename: string;
  originalName: string;
  categories: string[];
  summary: string | null;
  mimeType: string;
  sizeBytes: number | null;
  filePath: string;
  createdAt: string;
  updatedAt: string;
};

type PreviewData = KnowledgeBaseFile & { content: string };

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MimeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') return <FileText size={16} />;
  if (mimeType === 'text/csv') return <Database size={16} />;
  if (mimeType.startsWith('text/')) return <FileCode size={16} />;
  if (mimeType.startsWith('image/')) return <Image size={16} />;
  return <File size={16} />;
}

const BADGE_COLORS: Array<[string, string]> = [
  ['blue', 'blue'],
  ['purple', 'purple'],
  ['green', 'green'],
  ['orange', 'orange'],
  ['pink', 'pink'],
];

function categoryColorPalette(cat: string): string {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) & 0xffff;
  return BADGE_COLORS[hash % BADGE_COLORS.length][0];
}

function TagEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  function addTag() {
    const tag = input.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  }

  return (
    <HStack
      flexWrap="wrap"
      gap="1.5"
      borderWidth="1px"
      borderRadius="lg"
      px="2"
      py="1.5"
      minH="9"
      _focusWithin={{ ring: '2px', ringColor: 'purple.400' }}
      bg="white"
    >
      {value.map((tag) => (
        <Badge key={tag} colorPalette={categoryColorPalette(tag)} variant="subtle" borderRadius="full" fontSize="xs">
          {tag}
          <Button
            type="button"
            variant="ghost"
            size="2xs"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            ml="0.5"
            p="0"
            minW="unset"
          >
            <X size={10} />
          </Button>
        </Badge>
      ))}
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
          if (e.key === 'Backspace' && !input && value.length > 0) onChange(value.slice(0, -1));
        }}
        onBlur={addTag}
        placeholder={value.length === 0 ? 'Type category, press Enter…' : ''}
        border="none"
        outline="none"
        flex="1"
        minW="24"
        fontSize="xs"
        bg="transparent"
        _focus={{ outline: 'none', boxShadow: 'none' }}
        p="0"
        h="auto"
      />
    </HStack>
  );
}

function PreviewModal({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { data, isLoading, error } = useQuery<PreviewData>({
    queryKey: ['knowledge-base-preview', fileId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base/${fileId}`);
      if (!res.ok) throw new Error('Failed to load preview');
      return res.json();
    },
  });

  const modalTitle = isLoading
    ? 'Loading…'
    : data
    ? data.originalName
    : 'Preview';

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={modalTitle}
      size="xl"
      footer={
        <Button variant="subtle" colorPalette="gray" size="sm" onClick={onClose}>Close</Button>
      }
    >
      {isLoading ? (
        <Box h="5" w="48" bg="gray.200" borderRadius="md" />
      ) : (
        <HStack flexWrap="wrap" gap="1.5" mb="4">
          {data?.categories.map((cat) => (
            <Badge key={cat} colorPalette={categoryColorPalette(cat)} variant="subtle" borderRadius="full" fontSize="xs">
              <Tag size={10} style={{ marginRight: '3px' }} />{cat}
            </Badge>
          ))}
        </HStack>
      )}

      {(isLoading || data?.summary) && (
        <Box px="4" py="3" bg="orange.50" borderWidth="1px" borderColor="orange.100" borderRadius="lg" mb="4">
          {isLoading ? (
            <VStack gap="1.5" align="stretch">
              <Box h="3" bg="orange.200" borderRadius="sm" />
              <Box h="3" w="75%" bg="orange.200" borderRadius="sm" />
            </VStack>
          ) : (
            <>
              <Text fontSize="xs" fontWeight="semibold" color="orange.700" textTransform="uppercase" letterSpacing="wide" mb="1">Summary</Text>
              <Text fontSize="sm" color="gray.700">{data?.summary}</Text>
            </>
          )}
        </Box>
      )}

      <Box overflowY="auto" maxH="50vh">
        {isLoading ? (
          <VStack gap="2" align="stretch">
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} h="3" bg="gray.100" borderRadius="sm" w={i % 3 === 2 ? '66%' : 'full'} />
            ))}
          </VStack>
        ) : error ? (
          <Text color="red.600" fontSize="sm">Failed to load content.</Text>
        ) : (
          <>
            <Text fontSize="xs" fontWeight="semibold" color="gray.400" textTransform="uppercase" letterSpacing="wide" mb="3">
              Content Preview
              <Text as="span" fontWeight="normal" textTransform="none" ml="2">
                {data && `${formatBytes(data.sizeBytes)} · ${new Date(data.createdAt).toLocaleDateString()}`}
              </Text>
            </Text>
            <Box as="pre" fontSize="xs" color="gray.700" whiteSpace="pre-wrap" fontFamily="mono" lineHeight="relaxed">
              {data?.content?.slice(0, 12000)}
              {(data?.content?.length ?? 0) > 12000 && (
                <Text as="span" color="gray.400">{'\n\n'}[Content truncated — showing first 12,000 characters]</Text>
              )}
            </Box>
          </>
        )}
      </Box>
    </AppModal>
  );
}

function EditModal({
  fileId,
  onClose,
  onSaved,
}: {
  fileId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/knowledge-base/${fileId}`)
      .then((r) => r.json())
      .then((d: PreviewData) => { setContent(d.content); setIsLoading(false); })
      .catch(() => { setError('Failed to load content'); setIsLoading(false); });
  }, [fileId]);

  async function handleSave() {
    if (content === null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-base/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Edit File Content"
      size="xl"
      footer={
        <HStack gap="2">
          <Button variant="subtle" colorPalette="gray" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            colorPalette="purple"
            size="sm"
            loading={saving}
            loadingText="Saving…"
            disabled={isLoading || content === null}
            onClick={handleSave}
          >
            Save
          </Button>
        </HStack>
      }
    >
      {isLoading ? (
        <VStack gap="2" align="stretch">
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} h="3" bg="gray.100" borderRadius="sm" w={i % 3 === 2 ? '66%' : 'full'} />
          ))}
        </VStack>
      ) : error ? (
        <Text color="red.600" fontSize="sm">{error}</Text>
      ) : (
        <Textarea
          value={content ?? ''}
          onChange={(e) => setContent(e.target.value)}
          w="full"
          fontSize="xs"
          fontFamily="mono"
          lineHeight="relaxed"
          borderWidth="1px"
          borderColor="gray.300"
          borderRadius="lg"
          p="3"
          resize="none"
          spellCheck={false}
          _focus={{ outline: 'none', ring: '2px', ringColor: 'purple.400' }}
          minH="400px"
        />
      )}
    </AppModal>
  );
}

function KnowledgeBaseDashboard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [recategorizeId, setRecategorizeId] = useState<string | null>(null);
  const [recategorizeValue, setRecategorizeValue] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set('search', searchQuery);

  const { data: files = [], isLoading } = useQuery<KnowledgeBaseFile[]>({
    queryKey: ['knowledge-base', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-base?${queryParams.toString()}`);
      return res.json();
    },
  });

  const filteredFiles = categoryFilter
    ? files.filter((f) => f.categories.includes(categoryFilter))
    : files;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge-base/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
    },
    onSuccess: () => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });

  const recategorizeMutation = useMutation({
    mutationFn: async ({ id, categories }: { id: string; categories: string[] }) => {
      const res = await fetch(`/api/knowledge-base/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      });
      if (!res.ok) throw new Error('Recategorize failed');
      return res.json();
    },
    onSuccess: () => {
      setRecategorizeId(null);
      setRecategorizeValue([]);
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/knowledge-base', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Upload failed');
      }
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function startRecategorize(file: KnowledgeBaseFile) {
    setRecategorizeId(file.id);
    setRecategorizeValue([...file.categories]);
  }

  const allCategories = [...new Set(files.flatMap((f) => f.categories))].sort();

  return (
    <Container maxW="5xl" py="6" px="6">
      {previewId && (
        <PreviewModal fileId={previewId} onClose={() => setPreviewId(null)} />
      )}
      {editId && (
        <EditModal
          fileId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['knowledge-base'] })}
        />
      )}

      <Flex align="flex-start" justify="space-between" mb="6">
        <Box>
          <Heading size="xl">Knowledge Base</Heading>
          <Text fontSize="sm" color="gray.500" mt="1">
            Upload documents — the AI auto-categorizes them and uses their content when answering questions.
          </Text>
        </Box>
        <Button
          colorPalette="gray"
          variant="solid"
          size="sm"
          loading={uploading}
          loadingText="Analysing…"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
          Upload File
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.csv,.md,text/plain,text/csv,text/markdown,application/pdf"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={handleUpload}
          />
        </Button>
      </Flex>

      {uploading && (
        <HStack mb="4" px="4" py="3" bg="blue.50" borderWidth="1px" borderColor="blue.200" color="blue.700" borderRadius="lg" fontSize="sm" gap="2">
          <Spinner size="sm" />
          <Text>Uploading and analysing document with AI — this may take a moment…</Text>
        </HStack>
      )}

      {uploadError && (
        <Box mb="4" px="4" py="3" bg="red.50" borderWidth="1px" borderColor="red.200" color="red.700" borderRadius="lg" fontSize="sm">
          {uploadError}
        </Box>
      )}

      {/* Filters */}
      <HStack gap="3" mb="4">
        <Box position="relative" flex="1" maxW="xs">
          <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
            <Search size={16} />
          </Box>
          <Input
            type="text"
            placeholder="Search by filename…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            pl="9"
            size="sm"
          />
        </Box>
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            bg="white"
          >
            <option value="">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        {(searchQuery || categoryFilter) && (
          <Button
            variant="ghost"
            size="sm"
            color="gray.500"
            _hover={{ color: 'gray.800' }}
            onClick={() => { setSearchQuery(''); setCategoryFilter(''); }}
          >
            Clear
          </Button>
        )}
      </HStack>

      {isLoading ? (
        <VStack gap="2" align="stretch">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="52px" borderRadius="md" />
          ))}
        </VStack>
      ) : filteredFiles.length === 0 ? (
        <VStack gap={4} py={16} alignItems="center" textAlign="center">
          <FileText size={40} color="var(--chakra-colors-text-muted)" />
          <Heading size="md" color="text.primary">
            {files.length === 0 ? 'No documents yet' : 'No documents match your filter'}
          </Heading>
          <Text color="text.secondary" fontSize="sm">
            {files.length === 0
              ? 'Upload a PDF, TXT, CSV, or Markdown file to get started.'
              : 'Try adjusting your search or category filter.'}
          </Text>
          {files.length === 0 && (
            <Button
              colorPalette="gray"
              variant="solid"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              Upload File
            </Button>
          )}
        </VStack>
      ) : (
        <Box borderRadius="lg" borderWidth="1px" bg="white" shadow="sm" overflow="hidden">
          <Table.Root size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">File</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Summary</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Categories</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Size</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">Uploaded</Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600" textAlign="right">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredFiles.map((file) => (
                <React.Fragment key={file.id}>
                  <Table.Row _hover={{ bg: 'gray.50' }} verticalAlign="top" transition="all 0.15s ease">
                    <Table.Cell>
                      <HStack gap="2">
                        <Box color="text.muted" flexShrink="0">
                          <MimeIcon mimeType={file.mimeType} />
                        </Box>
                        <Text fontWeight="medium" color="gray.900" truncate maxW="200px" title={file.originalName}>
                          {file.originalName}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.400" fontFamily="mono" mt="0.5" pl="6">
                        {file.mimeType.split('/').pop()?.toUpperCase()}
                      </Text>
                    </Table.Cell>
                    <Table.Cell maxW="xs">
                      <Text fontSize="xs" color="gray.500" lineClamp={3} lineHeight="relaxed">
                        {file.summary ?? <Text as="span" fontStyle="italic" color="gray.300">No summary</Text>}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack flexWrap="wrap" gap="1">
                        {file.categories.map((cat) => (
                          <Badge
                            key={cat}
                            colorPalette={categoryColorPalette(cat)}
                            variant="subtle"
                            borderRadius="full"
                            fontSize="xs"
                            cursor="pointer"
                            _hover={{ opacity: 0.8 }}
                            onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                            title="Filter by this category"
                          >
                            <Tag size={9} style={{ marginRight: '2px' }} />{cat}
                          </Badge>
                        ))}
                      </HStack>
                    </Table.Cell>
                    <Table.Cell color="gray.500" fontSize="xs" whiteSpace="nowrap">
                      {formatBytes(file.sizeBytes)}
                    </Table.Cell>
                    <Table.Cell color="gray.500" fontSize="xs" whiteSpace="nowrap">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>
                      <HStack justify="flex-end" gap="1">
                        <IconButton
                          aria-label="Preview"
                          variant="ghost"
                          size="xs"
                          color="gray.400"
                          _hover={{ color: 'sky.600', bg: 'sky.50' }}
                          onClick={() => setPreviewId(file.id)}
                        >
                          <Eye size={15} />
                        </IconButton>
                        {!file.mimeType.includes('pdf') && (
                          <IconButton
                            aria-label="Edit content"
                            variant="ghost"
                            size="xs"
                            color="gray.400"
                            _hover={{ color: 'emerald.600', bg: 'emerald.50' }}
                            onClick={() => setEditId(file.id)}
                          >
                            <Pencil size={15} />
                          </IconButton>
                        )}
                        <IconButton
                          aria-label="Edit categories"
                          variant="ghost"
                          size="xs"
                          color="gray.400"
                          _hover={{ color: 'purple.600', bg: 'purple.50' }}
                          onClick={() => startRecategorize(file)}
                        >
                          <FolderEdit size={15} />
                        </IconButton>
                        {confirmDelete === file.id ? (
                          <HStack gap="1">
                            <Button size="xs" colorPalette="red" onClick={() => deleteMutation.mutate(file.id)}>Confirm</Button>
                            <Button size="xs" variant="subtle" colorPalette="gray" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                          </HStack>
                        ) : (
                          <IconButton
                            aria-label="Delete"
                            variant="ghost"
                            size="xs"
                            color="gray.400"
                            _hover={{ color: 'red.600', bg: 'red.50' }}
                            onClick={() => setConfirmDelete(file.id)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        )}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                  {recategorizeId === file.id && (
                    <Table.Row key={`${file.id}-recategorize`}>
                      <Table.Cell colSpan={6} bg="purple.50" borderTopWidth="1px">
                        <HStack align="flex-start" gap="3">
                          <Text fontSize="xs" color="gray.600" fontWeight="medium" mt="2" whiteSpace="nowrap">
                            Edit categories:
                          </Text>
                          <Box flex="1">
                            <TagEditor value={recategorizeValue} onChange={setRecategorizeValue} />
                            <Text fontSize="xs" color="gray.400" mt="1">Type a category and press Enter or comma to add</Text>
                          </Box>
                          <HStack gap="2" mt="1">
                            <Button
                              size="xs"
                              colorPalette="purple"
                              disabled={recategorizeValue.length === 0 || recategorizeMutation.isPending}
                              onClick={() => recategorizeMutation.mutate({ id: file.id, categories: recategorizeValue })}
                            >
                              Save
                            </Button>
                            <Button
                              size="xs"
                              variant="subtle"
                              colorPalette="gray"
                              onClick={() => { setRecategorizeId(null); setRecategorizeValue([]); }}
                            >
                              Cancel
                            </Button>
                          </HStack>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      <Text fontSize="xs" color="gray.400" mt="4">
        Supported formats: PDF, TXT, CSV, Markdown · Categories and summaries are generated by AI on upload · Click a category badge to filter
      </Text>
    </Container>
  );
}
