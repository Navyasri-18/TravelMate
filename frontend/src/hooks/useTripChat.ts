import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { fetchMessages, fetchProfileById } from '@/api/chat';
import { fetchTripDetail, fetchTripMembers } from '@/api/tripDetail';
import { useAuthStore } from '@/stores/authStore';
import type { ChatMessage, MessageSenderProfile } from '@/types/chat';

export const useTripChat = (tripId: string | undefined) => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  // Member profile cache for realtime message author lookup
  const profileCacheRef = useRef<Map<string, MessageSenderProfile>>(new Map());
  const handleNewMessageRef = useRef<((payload: any) => void) | null>(null);
  const handleMessageUpdateRef = useRef<((payload: any) => void) | null>(null);
  
  // Fetch trip details
  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTripDetail(tripId!),
    enabled: !!tripId,
  });
  
  // Fetch trip members (used to seed the profile cache)
  const membersQuery = useQuery({
    queryKey: ['trip-members', tripId],
    queryFn: () => fetchTripMembers(tripId!),
    enabled: !!tripId,
  });
  
  // Fetch initial messages
  const messagesQuery = useQuery<ChatMessage[]>({
    queryKey: ['messages', tripId],
    queryFn: () => fetchMessages(tripId!),
    enabled: !!tripId,
  });
  
  // Seed profile cache when members load
  useEffect(() => {
    if (membersQuery.data) {
      membersQuery.data.forEach((m) => {
        if (m.profile) {
          profileCacheRef.current.set(m.user_id, {
            name: m.profile.name,
            avatar_url: m.profile.avatar_url,
          });
        }
      });
    }
  }, [membersQuery.data]);
  
  // Also seed cache from initial messages (in case a sender isn't a current member, e.g., left the trip)
  useEffect(() => {
    if (messagesQuery.data) {
      messagesQuery.data.forEach((msg) => {
        if (msg.profiles && !profileCacheRef.current.has(msg.sender_id)) {
          profileCacheRef.current.set(msg.sender_id, msg.profiles);
        }
      });
    }
  }, [messagesQuery.data]);
  
  // Handle incoming realtime messages
  const handleNewMessage = useCallback(async (payload: any) => {
    const newMessageRaw = payload.new;
    if (!newMessageRaw || newMessageRaw.trip_id !== tripId) return;
    
    // Try to resolve sender profile from cache
    let senderProfile = profileCacheRef.current.get(newMessageRaw.sender_id) || null;
    
    // Fallback: fetch profile if not cached
    if (!senderProfile) {
      const fetched = await fetchProfileById(newMessageRaw.sender_id);
      if (fetched) {
        senderProfile = { name: fetched.name, avatar_url: fetched.avatar_url };
        profileCacheRef.current.set(newMessageRaw.sender_id, senderProfile);
      }
    }
    
    const fullMessage: ChatMessage = {
      id: newMessageRaw.id,
      trip_id: newMessageRaw.trip_id,
      sender_id: newMessageRaw.sender_id,
      content: newMessageRaw.content,
      attachment_url: newMessageRaw.attachment_url || null,
      created_at: newMessageRaw.created_at,
      deleted_at: newMessageRaw.deleted_at ?? null,
      edited_at: newMessageRaw.edited_at ?? null,
      reply_to_message_id: newMessageRaw.reply_to_message_id ?? null,
      profiles: senderProfile,
    };
    
    // Update cache with reconciliation logic:
    // 1. If the real message is already in cache (by id), skip
    // 2. If there's an optimistic temp message matching this one, REPLACE it
    // 3. Otherwise, append the new message
    queryClient.setQueryData<ChatMessage[]>(['messages', tripId], (prev = []) => {
      // Already have the real message? Skip.
      if (prev.some((m) => m.id === fullMessage.id)) return prev;
      
      // Look for a matching optimistic message to replace
      // Match criteria: same sender, same content, has a 'temp-' id, created within last 30 seconds
      const now = Date.now();
      const tempIndex = prev.findIndex((m) => 
        m.id.startsWith('temp-') &&
        m.sender_id === fullMessage.sender_id &&
        m.content === fullMessage.content &&
        (now - new Date(m.created_at).getTime()) < 30000
      );
      
      if (tempIndex !== -1) {
        // Replace the temp with the real one
        const updated = [...prev];
        updated[tempIndex] = fullMessage;
        return updated;
      }
      
      // No matching temp — just append
      return [...prev, fullMessage];
    });
  }, [tripId, queryClient]);

  // Keep the ref updated with the latest INSERT handler
  useEffect(() => {
    handleNewMessageRef.current = handleNewMessage;
  }, [handleNewMessage]);

  // Handle realtime UPDATE events (soft-delete, future edit)
  const handleMessageUpdate = useCallback((payload: any) => {
    const updatedRaw = payload.new;
    if (!updatedRaw || updatedRaw.trip_id !== tripId) return;

    queryClient.setQueryData<ChatMessage[]>(['messages', tripId], (prev = []) =>
      prev.map((m) => {
        if (m.id !== updatedRaw.id) return m;
        // Merge only mutable fields; preserve joined `profiles` which isn't in the payload
        return {
          ...m,
          content: updatedRaw.content,
          attachment_url: updatedRaw.attachment_url ?? null,
          deleted_at: updatedRaw.deleted_at ?? null,
          edited_at: updatedRaw.edited_at ?? null,
          reply_to_message_id: updatedRaw.reply_to_message_id ?? null,
        };
      }),
    );
  }, [tripId, queryClient]);

  // Keep the ref updated with the latest UPDATE handler
  useEffect(() => {
    handleMessageUpdateRef.current = handleMessageUpdate;
  }, [handleMessageUpdate]);
  
  // Subscribe to realtime INSERT + UPDATE events
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip_chat_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          // Delegate to the latest handler via ref
          if (handleNewMessageRef.current) {
            handleNewMessageRef.current(payload);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (handleMessageUpdateRef.current) {
            handleMessageUpdateRef.current(payload);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);
  
  return {
    trip: tripQuery.data,
    members: membersQuery.data || [],
    messages: messagesQuery.data || [],
    currentUserId: user?.id,
    isLoading: tripQuery.isLoading || messagesQuery.isLoading || membersQuery.isLoading,
    isError: tripQuery.isError || messagesQuery.isError || membersQuery.isError,
  };
};
