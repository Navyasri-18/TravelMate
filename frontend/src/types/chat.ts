export interface MessageSenderProfile {
  name: string;
  avatar_url: string | null;
}

export interface ChatMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
  deleted_at: string | null;
  edited_at: string | null;
  reply_to_message_id: string | null;
  profiles: MessageSenderProfile | null; // joined from profiles table
}

export interface TripMember {
  user_id: string;
  role: string;
  joined_at: string;
  profile: MessageSenderProfile & { id: string };
}

export interface TripDetail {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  admin_id: string;
  currency: string;
  invite_code: string;
}
