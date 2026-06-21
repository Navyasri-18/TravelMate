import { supabase } from '@/lib/supabase/client';
import type { TripDetail, TripMember } from '@/types/chat';

export const fetchTripDetail = async (tripId: string): Promise<TripDetail | null> => {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, destination, start_date, end_date, admin_id, invite_code, currency')
    .eq('id', tripId)
    .single();

  if (error) {
    console.error('Failed to fetch trip:', error);
    throw error;
  }

  return data as TripDetail;
};

export const fetchTripMembers = async (tripId: string): Promise<TripMember[]> => {
  const { data, error } = await supabase
    .from('trip_members')
    .select(`
      user_id,
      role,
      joined_at,
      profile:profiles!user_id(id, name, avatar_url)
    `)
    .eq('trip_id', tripId);

  if (error) {
    console.error('Failed to fetch trip members:', error);
    throw error;
  }

  // Supabase returns profile as an object (not array) because of single-FK relationship
  return (data || []).map((m: any) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at || new Date().toISOString(),
    profile: m.profile,
  })) as TripMember[];
};
