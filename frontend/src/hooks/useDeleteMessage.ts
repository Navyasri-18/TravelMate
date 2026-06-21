import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMessage } from '@/api/chat';
import { toast } from 'sonner';
import type { ChatMessage } from '@/types/chat';

interface UseDeleteMessageInput {
  tripId: string;
}

export const useDeleteMessage = ({ tripId }: UseDeleteMessageInput) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId),

    onMutate: async (messageId) => {
      // Cancel any in-flight refetches that could overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', tripId] });

      // Snapshot the previous cache so we can roll back on error
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', tripId]);

      // Optimistically mark the message as deleted in cache
      queryClient.setQueryData<ChatMessage[]>(['messages', tripId], (prev = []) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, deleted_at: new Date().toISOString() }
            : m,
        ),
      );

      return { previousMessages };
    },

    onError: (_error, messageId, context) => {
      // Roll back to the snapshot if we have it
      if (context?.previousMessages) {
        queryClient.setQueryData<ChatMessage[]>(['messages', tripId], context.previousMessages);
      } else {
        // Fallback: clear the deleted_at flag manually
        queryClient.setQueryData<ChatMessage[]>(['messages', tripId], (prev = []) =>
          prev.map((m) => (m.id === messageId ? { ...m, deleted_at: null } : m)),
        );
      }

      toast.error('Failed to delete message. Please try again.');
    },

    // No onSuccess — the realtime UPDATE event will confirm and sync the final state
  });
};
