import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMessageContent } from '@/api/chat';
import { toast } from 'sonner';
import type { ChatMessage } from '@/types/chat';

interface UseEditMessageInput {
  tripId: string;
}

interface EditMessageVariables {
  messageId: string;
  newContent: string;
}

interface MutationContext {
  previousMessage: ChatMessage | undefined;
}

export const useEditMessage = ({ tripId }: UseEditMessageInput) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, EditMessageVariables, MutationContext>({
    mutationFn: (variables) =>
      updateMessageContent({
        messageId: variables.messageId,
        newContent: variables.newContent,
      }),

    onMutate: async (variables): Promise<MutationContext> => {
      // Cancel in-flight refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', tripId] });

      // Snapshot the previous message so we can roll back on error
      const previousMessages =
        queryClient.getQueryData<ChatMessage[]>(['messages', tripId]) || [];
      const previousMessage = previousMessages.find((m) => m.id === variables.messageId);

      // Optimistically update content + edited_at in cache
      queryClient.setQueryData<ChatMessage[]>(['messages', tripId], (prev = []) =>
        prev.map((m) =>
          m.id === variables.messageId
            ? {
                ...m,
                content: variables.newContent.trim(),
                edited_at: new Date().toISOString(),
              }
            : m,
        ),
      );

      return { previousMessage };
    },

    onError: (_error, variables, context) => {
      // Roll back to the previous message content/edited_at
      if (context?.previousMessage) {
        queryClient.setQueryData<ChatMessage[]>(['messages', tripId], (prev = []) =>
          prev.map((m) =>
            m.id === variables.messageId ? context.previousMessage! : m,
          ),
        );
      }

      const msg = _error?.message || 'Failed to edit message';
      toast.error(msg);
    },

    // No onSuccess needed: the realtime UPDATE handler in useTripChat
    // will echo back the confirmed state from the DB automatically.
  });
};
