import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { queryClient } from '@/lib/queryClient';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export const conversationsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['conversations'],
    queryFn: (): Promise<Conversation[]> =>
      fetch('/api/conversations').then((r) => r.json()),
    getKey: (c: Conversation) => c.id,
    queryClient,
  }),
);
