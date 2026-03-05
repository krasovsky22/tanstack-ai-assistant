import { createFileRoute } from '@tanstack/react-router';
import { Chat } from '@/components/Chat';

export const Route = createFileRoute('/conversations/new')({
  component: NewConversation,
});

function NewConversation() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Chat />
    </div>
  );
}
