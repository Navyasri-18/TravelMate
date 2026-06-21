import { supabase } from '@/lib/supabase/client';
import type { ChatMessage } from '@/types/chat';

export const fetchMessages = async (tripId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(name, avatar_url)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }

  return (data || []) as ChatMessage[];
};

interface SendMessageInput {
  tripId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
  replyToMessageId?: string | null;
}

export const sendMessage = async (input: SendMessageInput): Promise<void> => {
  const trimmed = input.content.trim();
  
  // A message must have either text content OR an attachment (or both)
  if (!trimmed && !input.attachmentUrl) {
    throw new Error('Message cannot be empty');
  }
  
  if (trimmed.length > 2000) {
    throw new Error('Message is too long (max 2000 characters)');
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      trip_id: input.tripId,
      sender_id: input.senderId,
      content: trimmed,
      attachment_url: input.attachmentUrl || null,
      reply_to_message_id: input.replyToMessageId || null,
    });

  if (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

export const fetchProfileById = async (userId: string): Promise<{ id: string; name: string; avatar_url: string | null } | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }

  return data;
};

interface UploadImageInput {
  file: File;
  tripId: string;
  userId: string;
}

interface UploadImageResult {
  publicUrl: string;
  path: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadChatImage = async (
  input: UploadImageInput
): Promise<UploadImageResult> => {
  const { file, tripId, userId } = input;

  // Client-side validation (matches backend constraints, fails fast)
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image must be under 5 MB');
  }

  // Generate the file path: {trip_id}/{user_id}/{uuid}.{extension}
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileId = crypto.randomUUID();
  const filePath = `${tripId}/${userId}/${fileId}.${extension}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('trip-images')
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Image upload failed:', uploadError);
    throw new Error(uploadError.message || 'Failed to upload image');
  }

  // Get the public URL
  const { data } = supabase.storage
    .from('trip-images')
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but URL could not be generated');
  }

  return {
    publicUrl: data.publicUrl,
    path: filePath,
  };
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) {
    console.error('Failed to delete message:', error);
    throw error;
  }
};

interface UpdateMessageContentInput {
  messageId: string;
  newContent: string;
}

export const updateMessageContent = async (input: UpdateMessageContentInput): Promise<void> => {
  const trimmed = input.newContent.trim();

  if (!trimmed) {
    throw new Error('Message cannot be empty');
  }

  if (trimmed.length > 2000) {
    throw new Error('Message is too long (max 2000 characters)');
  }

  const { error } = await supabase
    .from('messages')
    .update({
      content: trimmed,
      edited_at: new Date().toISOString(),
    })
    .eq('id', input.messageId);

  if (error) {
    console.error('Failed to update message:', error);
    throw error;
  }
};
