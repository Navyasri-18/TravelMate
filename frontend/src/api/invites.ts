import { supabase } from '@/lib/supabase/client';

interface SendInvitesInput {
  emails: string[];
  tripName: string;
  inviterName: string;
  inviteCode: string;
}

interface SendInvitesResult {
  success: boolean;
  message?: string;
}

export const sendEmailInvites = async (
  input: SendInvitesInput
): Promise<SendInvitesResult> => {
  if (input.emails.length === 0) {
    throw new Error('At least one email is required');
  }

  // CRITICAL: must be path format (/join/CODE), not query (?code=CODE)
  // This must match the frontend route `/join/:code` in App.tsx
  const inviteLink = `${window.location.origin}/join/${input.inviteCode}`;

  const { data, error } = await supabase.functions.invoke('send-trip-invites', {
    body: {
      emails: input.emails,
      tripName: input.tripName,
      inviterName: input.inviterName,
      inviteLink,
    },
  });

  if (error) {
    console.error('Failed to send invite emails:', error);
    throw error;
  }

  return {
    success: true,
    message: data?.message,
  };
};
