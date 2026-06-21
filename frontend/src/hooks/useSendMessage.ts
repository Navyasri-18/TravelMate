import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '@/api/chat';
import { toast } from 'sonner';
import type { ChatMessage, MessageSenderProfile } from '@/types/chat';

interface UseSendMessageInput {
  tripId: string;
  senderId: string;
}

interface SendMessageVariables {
  content: string;
  attachmentUrl?: string | null;
  // Profile of the sender so we can build the optimistic message
  senderProfile?: MessageSenderProfile | null;
  replyToMessageId?: string | null;
}

interface MutationContext {
  tempId: string;
  previousMessages: ChatMessage[] | undefined;
}

export const useSendMessage = ({ tripId, senderId }: UseSendMessageInput) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, SendMessageVariables, MutationContext>({
    mutationFn: (variables) =>
      sendMessage({
        tripId,
        senderId,
        content: variables.content,
        attachmentUrl: variables.attachmentUrl,
        replyToMessageId: variables.replyToMessageId,
      }),
    
    onMutate: async (variables): Promise<MutationContext> => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', tripId] });
      
      // Snapshot the previous state for rollback
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', tripId]);
      
      // Create the optimistic temp message
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        trip_id: tripId,
        sender_id: senderId,
        content: variables.content.trim(),
        attachment_url: variables.attachmentUrl || null,
        reply_to_message_id: variables.replyToMessageId || null,
        deleted_at: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        profiles: variables.senderProfile || null,
      };
      
      // Add to cache immediately
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', tripId],
        (prev = []) => [...prev, optimisticMessage]
      );
      
      return { tempId, previousMessages };
    },
    
    onError: (error, _variables, context) => {
      // Roll back the optimistic update on failure
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(['messages', tripId], context.previousMessages);
      } else if (context?.tempId) {
        // Fallback: just remove the temp message
        queryClient.setQueryData<ChatMessage[]>(
          ['messages', tripId],
          (prev = []) => prev.filter((m) => m.id !== context.tempId)
        );
      }
      
      const msg = error?.message || 'Failed to send message';
      toast.error(msg);
    },
  });
};


